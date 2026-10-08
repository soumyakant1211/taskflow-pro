import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { eq, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';
import {
  ALL_SEED_USERS, GUEST_EMAIL, GUEST_NAME, SEED_COMMENTS, SEED_PASSWORD, SEED_PROJECTS, SeedProject,
} from './seed-data.js';

/**
 * Idempotent seed: creates the demo company (28 people, 8 projects, ~70 tasks, comments)
 * and the read-only guest account.
 *
 * Safe to run any number of times. Each person is matched by email and each project by key;
 * anything that already exists is left untouched, and anything missing is added. A database
 * seeded with an older, smaller version of this script is topped up without duplicates.
 */
type Db = ReturnType<typeof drizzle<typeof schema>>;

/** Fails fast if the demo data breaks one of the app's own business rules. */
function validate(p: SeedProject, known: Set<string>) {
  const problems: string[] = [];
  const members = new Set(p.members);
  for (const m of p.members) if (!known.has(m)) problems.push(`unknown member "${m}"`);
  if (!members.has(p.owner)) problems.push(`owner "${p.owner}" is not a member`);
  p.tasks.forEach(([title, status, , , assignee, , reporter]) => {
    if (assignee && !members.has(assignee)) problems.push(`"${title}": assignee "${assignee}" is not a member`);
    if (!members.has(reporter)) problems.push(`"${title}": reporter "${reporter}" is not a member`);
    if ((status === 'IN_REVIEW' || status === 'DONE') && !assignee) problems.push(`"${title}": ${status} needs an assignee`);
  });
  if (problems.length) throw new Error(`Invalid seed data for project ${p.key}:\n  - ${problems.join('\n  - ')}`);
}

/** Creates the guest user if missing. Its password is random and never shared: guests log in via POST /auth/guest. */
async function ensureGuest(db: Db) {
  const [guest] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, GUEST_EMAIL));
  if (guest) return false;
  const unusable = await bcrypt.hash(randomBytes(32).toString('hex'), 10);
  await db.insert(schema.users).values({ email: GUEST_EMAIL, name: GUEST_NAME, role: 'GUEST', passwordHash: unusable });
  return true;
}

async function ensureUsers(db: Db) {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);
  const inserted = await db.insert(schema.users)
    .values(ALL_SEED_USERS.map(({ email, name, role, isActive = true }) => ({ email, name, role, isActive, passwordHash })))
    .onConflictDoNothing({ target: schema.users.email })
    .returning({ id: schema.users.id });
  const rows = await db.select({ id: schema.users.id, email: schema.users.email }).from(schema.users)
    .where(inArray(schema.users.email, ALL_SEED_USERS.map((u) => u.email)));
  const idByEmail = new Map(rows.map((r) => [r.email, r.id]));
  const idByKey = new Map(ALL_SEED_USERS.map((u) => [u.key, idByEmail.get(u.email)!]));
  return { idByKey, created: inserted.length };
}

async function ensureProject(db: Db, p: SeedProject, id: (key: string) => string) {
  const [existing] = await db.select({ id: schema.projects.id }).from(schema.projects).where(eq(schema.projects.key, p.key));
  if (existing) return null;

  const inDays = (d: number | null) => (d === null ? null : new Date(Date.now() + d * 86_400_000));
  const comments = SEED_COMMENTS.filter(([k]) => k === p.key);

  await db.transaction(async (tx) => {
    const [project] = await tx.insert(schema.projects).values({
      key: p.key, name: p.name, description: p.description, ownerId: id(p.owner),
      status: p.status ?? 'ACTIVE', taskCounter: p.tasks.length,
    }).returning();

    await tx.insert(schema.projectMembers).values(p.members.map((m) => ({ projectId: project.id, userId: id(m) })));

    const tasks = await tx.insert(schema.tasks).values(p.tasks.map(([title, status, priority, labels, assignee, due, reporter], i) => ({
      projectId: project.id, number: i + 1, title, status, priority, labels,
      assigneeId: assignee ? id(assignee) : null, dueDate: inDays(due), reporterId: id(reporter),
    }))).returning({ id: schema.tasks.id, number: schema.tasks.number });
    const taskId = new Map(tasks.map((t) => [t.number, t.id]));

    if (comments.length) {
      // Space comments a few minutes apart so their order is stable and realistic.
      const start = Date.now() - comments.length * 7 * 60_000;
      await tx.insert(schema.comments).values(comments.map(([, number, author, body], i) => ({
        taskId: taskId.get(number)!, authorId: id(author), body, createdAt: new Date(start + i * 7 * 60_000),
      })));
    }

    await tx.insert(schema.activityLogs).values({
      action: 'PROJECT_CREATED', entityType: 'PROJECT', entityId: project.id, userId: id(p.owner),
      message: `${ALL_SEED_USERS.find((u) => u.key === p.owner)!.name} created project ${p.key} – ${p.name}`,
    });
  });
  return { tasks: p.tasks.length, comments: comments.length };
}

async function main() {
  const known = new Set(ALL_SEED_USERS.map((u) => u.key));
  SEED_PROJECTS.forEach((p) => validate(p, known));

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  });
  const db = drizzle(pool, { schema });

  if (await ensureGuest(db)) console.log(`✅ Guest user created (${GUEST_EMAIL}, read-only)`);

  const { idByKey, created } = await ensureUsers(db);
  console.log(created
    ? `✅ ${created} demo users added (${ALL_SEED_USERS.length} in total, password: ${SEED_PASSWORD})`
    : `ℹ️  All ${ALL_SEED_USERS.length} demo users already present`);

  const id = (key: string) => {
    const v = idByKey.get(key);
    if (!v) throw new Error(`Seed user "${key}" not found`);
    return v;
  };
  let projects = 0, tasks = 0, comments = 0;
  for (const p of SEED_PROJECTS) {
    const r = await ensureProject(db, p, id);
    if (r) { projects++; tasks += r.tasks; comments += r.comments; }
  }
  console.log(projects
    ? `✅ ${projects} projects added with ${tasks} tasks and ${comments} comments`
    : `ℹ️  All ${SEED_PROJECTS.length} demo projects already present`);

  await pool.end();
}

main().catch((err) => {
  console.error('❌ Seed failed', err);
  process.exit(1);
});

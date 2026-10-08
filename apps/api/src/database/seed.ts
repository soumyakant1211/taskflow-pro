import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import * as schema from './schema.js';
import { GUEST_EMAIL, GUEST_NAME, SEED_PASSWORD, SEED_USERS } from './seed-data.js';

/**
 * Idempotent seed. Creates three demo users (one per role), two projects and sample tasks,
 * plus the read-only guest account. Safe to run many times: existing data is left untouched,
 * and the guest account is added to databases that were seeded before it existed.
 */
/** Creates the guest user if missing. Its password is random and never shared: guests log in via POST /auth/guest. */
async function ensureGuest(db: ReturnType<typeof drizzle<typeof schema>>) {
  const [guest] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, GUEST_EMAIL));
  if (guest) return;
  const unusable = await bcrypt.hash(randomBytes(32).toString('hex'), 10);
  await db.insert(schema.users).values({ email: GUEST_EMAIL, name: GUEST_NAME, role: 'GUEST', passwordHash: unusable });
  console.log(`✅ Guest user created (${GUEST_EMAIL}, read-only)`);
}

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  });
  const db = drizzle(pool, { schema });

  await ensureGuest(db);

  const existing = await db.query.users.findFirst({ where: (u, { eq }) => eq(u.email, SEED_USERS[0].email) });
  if (existing) {
    console.log('ℹ️  Demo data already present, skipping');
    await pool.end();
    return;
  }

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);
  const [admin, manager, member] = await db
    .insert(schema.users)
    .values(SEED_USERS.map((u) => ({ ...u, passwordHash })))
    .returning();

  const [web, mob] = await db.insert(schema.projects).values([
    { key: 'WEB', name: 'Website Revamp', description: 'Redesign of the public marketing website', ownerId: manager.id, taskCounter: 4 },
    { key: 'MOB', name: 'Mobile App', description: 'Customer mobile app v2', ownerId: admin.id, taskCounter: 2 },
  ]).returning();

  await db.insert(schema.projectMembers).values([
    { projectId: web.id, userId: manager.id },
    { projectId: web.id, userId: member.id },
    { projectId: web.id, userId: admin.id },
    { projectId: mob.id, userId: admin.id },
    { projectId: mob.id, userId: member.id },
  ]);

  const inDays = (d: number) => new Date(Date.now() + d * 86_400_000);
  await db.insert(schema.tasks).values([
    { projectId: web.id, number: 1, title: 'Design new homepage hero', status: 'DONE', priority: 'HIGH', labels: ['design'], reporterId: manager.id, assigneeId: member.id, dueDate: inDays(-3) },
    { projectId: web.id, number: 2, title: 'Implement responsive navbar', status: 'IN_PROGRESS', priority: 'MEDIUM', labels: ['frontend'], reporterId: manager.id, assigneeId: member.id, dueDate: inDays(4) },
    { projectId: web.id, number: 3, title: 'Set up analytics tracking', status: 'TODO', priority: 'LOW', labels: ['analytics'], reporterId: manager.id, dueDate: inDays(10) },
    { projectId: web.id, number: 4, title: 'Fix broken contact form', status: 'IN_REVIEW', priority: 'CRITICAL', labels: ['bug'], reporterId: member.id, assigneeId: manager.id, dueDate: inDays(-1) },
    { projectId: mob.id, number: 1, title: 'Push notification service', status: 'TODO', priority: 'HIGH', labels: ['backend'], reporterId: admin.id, assigneeId: member.id, dueDate: inDays(7) },
    { projectId: mob.id, number: 2, title: 'Dark mode support', status: 'TODO', priority: 'MEDIUM', labels: ['ui'], reporterId: admin.id },
  ]);

  console.log(`✅ Seeded ${SEED_USERS.length} users (password: ${SEED_PASSWORD}), 2 projects, 6 tasks`);
  await pool.end();
}

main().catch((err) => {
  console.error('❌ Seed failed', err);
  process.exit(1);
});

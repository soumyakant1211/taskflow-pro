import 'dotenv/config';
import { execSync } from 'node:child_process';
import { Pool } from 'pg';

/**
 * Wipes the database and recreates it with demo data:
 * drop all tables → run migrations → seed.
 * Handy before a test run when you want a known starting state.
 *
 *   pnpm db:reset            (local database only)
 *   pnpm db:reset --yes      (required for a non-local database)
 */
async function main() {
  const url = process.env.DATABASE_URL ?? '';
  const isLocal = /@(localhost|127\.0\.0\.1|db)(:|\/)/.test(url);
  if (!isLocal && !process.argv.includes('--yes')) {
    console.error('❌ Refusing to reset a non-local database. Re-run with --yes if you are sure.');
    process.exit(1);
  }
  const pool = new Pool({
    connectionString: url,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  });
  await pool.query('DROP SCHEMA IF EXISTS drizzle CASCADE; DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await pool.end();
  console.log('🧹 Database wiped');
  execSync('tsx src/database/migrate.ts', { stdio: 'inherit' });
  execSync('tsx src/database/seed.ts', { stdio: 'inherit' });
}

main().catch((err) => {
  console.error('❌ Reset failed', err);
  process.exit(1);
});

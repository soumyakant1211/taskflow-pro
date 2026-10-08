import 'dotenv/config';
import path from 'node:path';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  });
  // Works from both src/ (tsx) and dist/ (compiled): drizzle/ sits next to package.json
  const migrationsFolder = path.resolve(import.meta.dirname, '..', '..', 'drizzle');
  await migrate(drizzle(pool), { migrationsFolder });
  console.log('✅ Migrations applied');
  await pool.end();
}

main().catch((err) => {
  console.error('❌ Migration failed', err);
  process.exit(1);
});

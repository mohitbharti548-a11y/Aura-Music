// scripts/migrate.ts
// Runs database migrations (schema.sql and schema-v2.sql) using pg directly.
// No psql or external database CLI required.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import pool from '../lib/db';

// Helper to load .env.local if DATABASE_URL is not set yet
function loadEnvLocal() {
  if (process.env.DATABASE_URL) return;
  const envPath = join(process.cwd(), '.env.local');
  if (existsSync(envPath)) {
    const lines = readFileSync(envPath, 'utf-8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        const value = trimmed.slice(idx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = value.replace(/^["']|["']$/g, '');
        }
      }
    }
  }
}

async function runMigration() {
  loadEnvLocal();

  if (!process.env.DATABASE_URL) {
    console.error(
      '\x1b[31m❌ DATABASE_URL is not set.\x1b[0m\n' +
      '   1. Create a .env.local file in the project root.\n' +
      '   2. Add: DATABASE_URL=postgresql://postgres:password@localhost:5432/music_app\n' +
      '   3. Re-run this command.\n'
    );
    process.exit(1);
  }

  const client = await pool.connect();

  try {
    console.log('🔄 Applying PostgreSQL migrations...');

    // 1. Base schema
    const schemaV1Path = join(process.cwd(), 'scripts', 'schema.sql');
    if (existsSync(schemaV1Path)) {
      const sqlV1 = readFileSync(schemaV1Path, 'utf-8');
      await client.query(sqlV1);
      console.log('  ✅ Base schema applied (schema.sql)');
    }

    // 2. Migration v2 (Lossless & audio codec metadata)
    const schemaV2Path = join(process.cwd(), 'scripts', 'schema-v2.sql');
    if (existsSync(schemaV2Path)) {
      const sqlV2 = readFileSync(schemaV2Path, 'utf-8');
      await client.query(sqlV2);
      console.log('  ✅ v2 audio columns applied (schema-v2.sql)');
    }

    console.log('\n\x1b[32m🎉 Database migration successfully finished!\x1b[0m');
  } catch (err: any) {
    console.error('\n\x1b[31m❌ Migration failed:\x1b[0m', err.message || err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();

// lib/db.ts
// Singleton PostgreSQL connection pool with lazy initialization
// Safe to import during build-time page evaluation and across hot-reloads.
import { Pool, PoolConfig } from 'pg';

declare global {
  // eslint-disable-next-line no-var
  var _pgPool: Pool | undefined;
}

function getPool(): Pool {
  if (globalThis._pgPool) {
    return globalThis._pgPool;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is not set. Add it to .env.local (see .env.local.example).'
    );
  }

  const isLocal =
    connectionString.includes('localhost') ||
    connectionString.includes('127.0.0.1');

  const config: PoolConfig = {
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    ssl: isLocal ? undefined : { rejectUnauthorized: false },
  };

  const pool = new Pool(config);

  if (process.env.NODE_ENV !== 'production') {
    globalThis._pgPool = pool;
  }

  return pool;
}

// Export a Proxy that lazily forwards all property and method access to getPool()
const pool = new Proxy({} as Pool, {
  get(_target, prop) {
    const realPool = getPool() as any;
    const value = realPool[prop];
    if (typeof value === 'function') {
      return value.bind(realPool);
    }
    return value;
  },
});

export default pool;

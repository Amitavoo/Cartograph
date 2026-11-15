import { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";

let poolInstance: Pool | null = null;

export function getDbPool(): Pool {
  if (poolInstance) {
    return poolInstance;
  }

  const rawUrl =
    process.env.DATABASE_URL ||
    "postgresql://postgres:YGZa3WmcH01qbhgF@db.ovnfprnlocfxctpsvetn.supabase.co:5432/postgres";

  let config: any;
  try {
    const u = new URL(rawUrl);
    config = {
      host: u.hostname,
      port: Number(u.port) || 5432,
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      database: u.pathname.replace(/^\//, "") || "postgres",
      ssl: { rejectUnauthorized: false },
    };
  } catch {
    config = {
      connectionString: rawUrl,
      ssl: { rejectUnauthorized: false },
    };
  }

  poolInstance = new Pool({
    ...config,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  poolInstance.on("error", (err) => {
    console.error("Unexpected Postgres client error in Cartograph pool:", err);
  });

  return poolInstance;
}

export async function query<R extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<R>> {
  const pool = getDbPool();
  return pool.query<R>(text, params);
}

export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const pool = getDbPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

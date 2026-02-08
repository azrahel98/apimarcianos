import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schemas.ts';

const poolConnection = mysql.createPool({
  host: Deno.env.get('DB_HOST') || 'localhost',
  user: Deno.env.get('DB_USER') || 'root',
  password: Deno.env.get('DB_PASS') || 'password',
  database: 'marcianos',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  compress: true,
  connectTimeout: 10000,
});

// deno-lint-ignore no-explicit-any
poolConnection.on('connection', (conn: any) => {
  conn.on('error', (err: any) => {
    console.error('⚠️ Error inesperado en el pool de conexiones:', err);
  });
});

export const db = drizzle(poolConnection, { schema, mode: 'default' });

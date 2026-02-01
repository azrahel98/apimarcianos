import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schemas.ts';

const connection = await mysql.createConnection({
  host: Deno.env.get('DB_HOST') || 'localhost',
  user: Deno.env.get('DB_USER') || 'root',
  password: Deno.env.get('DB_PASS') || 'password',
  database: 'test',
  ssl: {
    ca: Deno.env.get('CAT_KEY') || '',
  },
});

export const db = drizzle(connection, { schema, mode: 'default' });

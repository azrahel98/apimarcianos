import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schemas.ts';

// 1. Creamos el Pool en lugar de una conexión única
const poolConnection = mysql.createPool({
  host: Deno.env.get('DB_HOST') || 'localhost',
  user: Deno.env.get('DB_USER') || 'root',
  password: Deno.env.get('DB_PASS') || 'password',
  database: 'test',
  ssl: {
    ca: Deno.env.get('CAT_KEY') || '',
  },
  // 2. Configuraciones recomendadas para evitar cierres
  waitForConnections: true,
  connectionLimit: 10, // Máximo de conexiones simultáneas
  queueLimit: 0, // 0 significa sin límite de espera en cola
  enableKeepAlive: true, // Mantiene la conexión activa enviando "pings"
  keepAliveInitialDelay: 10000, // Empieza tras 10 segundos de inactividad
});

// 3. Exportamos la instancia de Drizzle usando el pool
export const db = drizzle(poolConnection, { schema, mode: 'default' });

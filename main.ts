import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

import login from './routes/login.ts';
import cliente from './routes/cliente.ts';
import sabor from './routes/sabores.ts';
import { db } from './db/mysql.ts';
import { sql } from 'drizzle-orm';

const app = new Hono();

app.use(logger());
app.use('/*', cors());

app.route('/login', login);
app.route('/cliente', cliente);
app.route('/sabor', sabor);

const port = Number(Deno.env.get('PORT') ?? 8080);

try {
  await db.execute(sql`SELECT 1`);
  console.log('✅ Conexión a DB establecida y lista todo bien');
} catch (error) {
  console.error('❌ Error al conectar a la DB:', error);
}

console.log(`🚀 API corriendo en puerto ${port}`);

Deno.serve({ port: 8080, hostname: '0.0.0.0' }, req => {
  return app.fetch(req);
});

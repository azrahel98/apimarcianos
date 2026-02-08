import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

import login from './routes/login.ts';
import cliente from './routes/cliente.ts';
import sabor from './routes/sabores.ts';

const app = new Hono();

app.use(logger());
app.use('/*', cors());

app.route('/login', login);
app.route('/cliente', cliente);
app.route('/sabor', sabor);

const port = Number(Deno.env.get('PORT') ?? 8000);

console.log(`🚀 API corriendo en puerto ${port}`);

Deno.serve({ port }, app.fetch);

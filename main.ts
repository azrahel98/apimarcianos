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

Deno.serve(app.fetch);

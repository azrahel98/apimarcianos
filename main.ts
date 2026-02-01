import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

import login from './routes/login.ts';

const app = new Hono();

app.use(logger());

app.use('/*', cors());

app.route('/login', login);

Deno.serve(app.fetch);

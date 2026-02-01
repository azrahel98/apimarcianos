import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { Database } from './db/mysql.ts';
import login from './routes/login.ts';

const app = new Hono();

app.use(logger());

app.use('/*', cors());

app.get('/', async c => {
  try {
    const db = await Database.getInstance();
    const users = await db.execute('SELECT * FROM usuarios');

    return c.json(users);
  } catch (error) {
    console.log(error);
    return c.json({ error: 'Error al conectar con la DB' }, 500);
  }
});

app.route('/login', login);

Deno.serve(app.fetch);

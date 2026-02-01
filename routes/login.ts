import { Hono } from 'hono';
import { Database } from '../db/mysql.ts';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';

const login = new Hono();

const UserSchema = z.object({
  name: z.string(),
});

login.get('/', async c => {
  const db = await Database.getInstance();
  const result = await db.execute('SELECT id, name FROM usuarios');
  return c.json(result);
});

login.post('/', zValidator('form', UserSchema), async c => {
  const body = c.req.valid('form') as z.infer<typeof UserSchema>;
  const db = await Database.getInstance();
  await db.execute('INSERT INTO usuarios (name) VALUES (?)', [body.name]);
  return c.json({ message: 'Usuario creado' }, 201);
});

export default login;

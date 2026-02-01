import { Hono } from 'hono';
import { db } from '../db/mysql.ts';
import { z } from 'zod';
import { zValidator } from './error.ts';
import { pedidos } from '../db/schemas.ts';
import { eq } from 'drizzle-orm';
import { jwt } from 'hono/jwt';

const cliente = new Hono();

cliente.use(
  '/*',
  jwt({
    secret: Deno.env.get('JWT_SECRET') || 'secret',
    alg: 'HS256',
  })
);

const UserSchema = z.object({
  id: z.coerce.number().min(1, { message: 'El id debe ser mayor a 0' }),
});

cliente.get('/', zValidator('query', UserSchema), async c => {
  const { id } = c.req.valid('query');

  const res = await db.select().from(pedidos).where(eq(pedidos.usuario, id));

  return c.json(res, 200);
});

export default cliente;

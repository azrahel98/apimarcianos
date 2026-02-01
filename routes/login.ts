import { Hono } from 'hono';
import { db } from '../db/mysql.ts';
import { z } from 'zod';
import { zValidator } from './error.ts';
import { users } from '../db/schemas.ts';
import { eq } from 'drizzle-orm';
import { sign } from 'hono/jwt';

const login = new Hono();

const UserSchema = z.object({
  email: z
    .string({ error: 'Debe tener un campo llamado email' })
    .email({ error: 'El correo debe ser valido', abort: true }),
  contrasena: z
    .string({ error: 'Debe tener un campo llamado contrasena' })
    .min(2, { message: 'La contraseña debe tener al menos 2 caracteres' }),
});

login.post('/', zValidator('json', UserSchema), async c => {
  const body = c.req.valid('json') as z.infer<typeof UserSchema>;
  const res = await db
    .select()
    .from(users)
    .where(eq(users.correo, body.email))
    .limit(1);

  if (!res[0]) return c.json({ message: 'Usuario no encontrado' }, 401);

  if (res[0].password !== body.contrasena) {
    return c.json({ message: 'Contraseña incorrecta' }, 401);
  }

  const token = await sign(
    {
      id_usuario: res[0].id_usuario,
      nombre: res[0].nombre,
      rol: res[0].rol,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
    },
    Deno.env.get('JWT_SECRET') || 'secret'
  );

  return c.json({ token: token }, 200);
});

export default login;

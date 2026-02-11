import { Hono } from 'hono';
import { db } from '../db/mysql.ts';
import { z } from 'zod';
import { zValidator } from './error.ts';
import { usuarios } from '../db/schemas.ts';
import { eq } from 'drizzle-orm';
import { checkServerIdentity } from 'node:tls';

const registro = new Hono();

const RegistroSchema = z.object({
  nombre: z.string().min(1, { message: 'El nombre es requerido' }),
  email: z
    .string({ error: 'Debe tener un campo llamado email' })
    .email({ error: 'El correo debe ser valido', abort: true }),
  contrasena: z
    .string({ error: 'Debe tener un campo llamado contrasena' })
    .min(2, { message: 'La contraseña debe tener al menos 2 caracteres' }),
  instrucciones_entrega: z.string(),
});

registro.post('/', zValidator('json', RegistroSchema), async c => {
  const body = c.req.valid('json');

  try {
    const existe = await db
      .select()
      .from(usuarios)
      .where(eq(usuarios.correo, body.email))
      .limit(1);

    if (existe.length > 0) {
      return c.json({ message: 'El correo ya está registrado' }, 409);
    }

    console.log(body);
    await db.insert(usuarios).values({
      nombre: body.nombre,
      correo: body.email,
      password: body.contrasena,
      instrucciones_entrega: body.instrucciones_entrega,
      rol: 'cliente',
    });

    return c.json({ message: 'Usuario registrado exitosamente' }, 201);
  } catch (error) {
    console.error('Error al registrar usuario:', error);
    return c.json({ message: 'Error interno del servidor' }, 500);
  }
});

export default registro;

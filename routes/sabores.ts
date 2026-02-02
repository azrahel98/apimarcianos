import { Hono } from 'hono';
import { db } from '../db/mysql.ts';
import { z } from 'zod';
import { zValidator } from './error.ts';
import { sabores, movimientos_stock } from '../db/schemas.ts';
import { sql, eq } from 'drizzle-orm';
import { jwt } from 'hono/jwt';

const sabor = new Hono();

sabor.use(
  '/*',
  jwt({
    secret: Deno.env.get('JWT_SECRET') || 'secret',
    alg: 'HS256',
  })
);

sabor.get('/', async c => {
  const lista = await db.select().from(sabores);

  return c.json(lista);
});

const NuevoSaborSchema = z.object({
  nombre: z.string(),
  precio: z.number(),
  stock: z.number(),
});

sabor.post('/nuevo', zValidator('json', NuevoSaborSchema), async c => {
  const data = c.req.valid('json');

  const [result] = await db.insert(sabores).values({
    nombre: data.nombre,
    precio: data.precio.toString(),
    stock: data.stock,
  });

  return c.json({ success: true, id: result.insertId });
});

const StockSchema = z.object({
  id_sabor: z.number(),
  cantidad_nueva: z.number().min(1, 'La cantidad debe ser positiva'),
});

sabor.patch('/sabores/stock', zValidator('json', StockSchema), async c => {
  const { id_sabor, cantidad_nueva } = c.req.valid('json');

  try {
    await db.transaction(async tx => {
      // 1. Aumentar el stock en la tabla sabores
      await tx
        .update(sabores)
        .set({ stock: sql`${sabores.stock} + ${cantidad_nueva}` })
        .where(eq(sabores.id_sabor, id_sabor));

      // 2. Guardar el movimiento para el seguimiento
      await tx.insert(movimientos_stock).values({
        id_sabor: id_sabor,
        cantidad: cantidad_nueva,
        tipo: 'ingreso',
      });
    });

    return c.json({
      success: true,
      message: 'Stock actualizado e ingreso registrado',
    });
  } catch (err: any) {
    return c.json(
      { success: false, message: 'Error al actualizar stock' },
      500
    );
  }
});

export default sabor;

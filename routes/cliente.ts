import { Hono } from 'hono';
import { db } from '../db/mysql.ts';
import { z } from 'zod';
import { zValidator } from './error.ts';
import { pedidos, ventas, sabores } from '../db/schemas.ts';
import { sql, and, eq, asc } from 'drizzle-orm';
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

  const res = await db
    .select()
    .from(pedidos)
    .where(eq(pedidos.usuario, id))
    .orderBy(asc(pedidos.fecha));

  return c.json(res, 200);
});

const CanjeSchema = z.object({
  id: z.coerce.number(),
  id_sabor_elegido: z.number().min(1, 'Debes elegir un sabor válido'),
});

cliente.post('/canjear', zValidator('json', CanjeSchema), async c => {
  const { id, id_sabor_elegido } = c.req.valid('json');

  try {
    const resultado = await db.transaction(async tx => {
      const [sabor] = await tx
        .select()
        .from(sabores)
        .where(eq(sabores.id_sabor, id_sabor_elegido));

      if (!sabor || (sabor.stock ?? 0) < 1) {
        return {
          success: false,
          message: `Lo sentimos, no hay stock de marciano de ${sabor?.nombre || 'este sabor'}.`,
        };
      }

      const ventasPendientes = await tx
        .select()
        .from(ventas)
        .where(
          and(
            eq(ventas.id_usuario, id),
            eq(ventas.estado, 'completado'),
            eq(ventas.es_canje, 0),
            sql`${ventas.cantidad} > ${ventas.cantidad_usada}`
          )
        )
        .orderBy(asc(ventas.fecha_venta));

      const totalUnidades = ventasPendientes.reduce(
        (acc, v) => acc + (v.cantidad! - (v.cantidad_usada || 0)),
        0
      );

      if (totalUnidades < 10) {
        return {
          success: false,
          message: `Saldo insuficiente. Tienes ${totalUnidades} marcianos, te faltan ${10 - totalUnidades}.`,
        };
      }

      let puntosPorGastar = 10;
      for (const v of ventasPendientes) {
        if (puntosPorGastar <= 0) break;

        const saldoFila = v.cantidad! - (v.cantidad_usada || 0);
        const gasto = Math.min(saldoFila, puntosPorGastar);
        const nuevaCantidadUsada = (v.cantidad_usada || 0) + gasto;

        await tx
          .update(ventas)
          .set({
            cantidad_usada: nuevaCantidadUsada,
            es_canje: nuevaCantidadUsada === v.cantidad ? 1 : 0,
          })
          .where(eq(ventas.id_venta, v.id_venta));

        puntosPorGastar -= gasto;
      }

      await tx.insert(ventas).values({
        id_usuario: id,
        id_sabor: id_sabor_elegido,
        cantidad: 1,
        es_canje: 1,
        estado: 'canje',
        cantidad_usada: 1,
      });

      await tx
        .update(sabores)
        .set({ stock: sql`${sabores.stock} - 1` })
        .where(eq(sabores.id_sabor, id_sabor_elegido));

      return {
        success: true,
        message: `¡Canje exitoso! Disfruta tu marciano de ${sabor.nombre}.`,
        canjesRealizados: 1,
      };
    });

    return c.json(resultado, resultado.success ? 200 : 400);
  } catch (error) {
    console.error('Error en proceso de canje:', error);
    return c.json(
      { success: false, message: 'Error interno del servidor' },
      500
    );
  }
});

const VentaSchema = z.object({
  id_usuario: z.number(),
  id_sabor: z.number(),
  cantidad: z.number().min(1, 'La cantidad mínima es 1'),
});

cliente.post('/pedido', zValidator('json', VentaSchema), async c => {
  const { id_usuario, id_sabor, cantidad } = c.req.valid('json');

  try {
    const resultado = await db.transaction(async tx => {
      const [sabor] = await tx
        .select()
        .from(sabores)
        .where(eq(sabores.id_sabor, id_sabor));

      if (!sabor) {
        return { success: false, message: 'El sabor no existe.' };
      }

      if ((sabor.stock || 0) < cantidad) {
        return {
          success: false,
          message: `Stock insuficiente. Solo quedan ${sabor.stock} unidades de ${sabor.nombre}.`,
        };
      }

      await tx.insert(ventas).values({
        id_usuario,
        id_sabor,
        cantidad,
        estado: 'pendiente',
        es_canje: 0,
        cantidad_usada: 0,
      });

      await tx
        .update(sabores)
        .set({ stock: sql`${sabores.stock} - ${cantidad}` })
        .where(eq(sabores.id_sabor, id_sabor));

      return {
        success: true,
        message: 'Venta registrada con éxito y stock actualizado.',
      };
    });

    return c.json(resultado, resultado.success ? 201 : 400);
  } catch (error) {
    console.error('Error al registrar pedido:', error);
    return c.json(
      { success: false, message: 'Error interno del servidor' },
      500
    );
  }
});

export default cliente;

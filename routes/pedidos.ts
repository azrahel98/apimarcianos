import { Hono } from 'hono';
import { db } from '../db/mysql.ts';
import {
  detalle_pedidos,
  pedidos,
  sabores,
  usuarios,
  movimientos_stock,
} from '../db/schemas.ts';
import { eq, desc, sql } from 'drizzle-orm';
import { z } from 'zod';
import { zValidator } from './error.ts';

const MovimientoSchema = z.object({
  idSabor: z.number(),
  cantidad: z.number(),
  tipo: z.enum(['ingreso', 'ajuste', 'venta', 'canje']),
});

const app = new Hono();

app.post('/movimiento', zValidator('json', MovimientoSchema), async c => {
  const { idSabor, cantidad, tipo } = c.req.valid('json');

  try {
    const result = await db.transaction(async tx => {
      // 1. Registrar movimiento
      const [movimiento] = await tx.insert(movimientos_stock).values({
        id_sabor: idSabor,
        cantidad: cantidad,
        tipo: tipo,
      });

      // 2. Actualizar stock
      // Lógica: ingreso (+) venta (-) canje (-) ajuste (+) (asumiendo que ajuste es sumar/restar valor con signo si fuera necesario, o magnitud)
      // Para simplificar: venta y canje RESTAN. Ingreso y Ajuste SUMAN (si ajuste es negativo, resta).

      let operacion = sql`+ ${cantidad}`;
      if (tipo === 'venta' || tipo === 'canje') {
        operacion = sql`- ${cantidad}`;
      }

      await tx
        .update(sabores)
        .set({ stock: sql`COALESCE(${sabores.stock}, 0) ${operacion}` })
        .where(eq(sabores.id_sabor, idSabor));

      return movimiento;
    });

    return c.json({ success: true, id_movimiento: result.insertId });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

app.get('/', async c => {
  try {
    // 1. Obtenemos la data plana (Join)
    const rows = await db
      .select({
        id_pedido: pedidos.id_pedido,
        fecha: pedidos.fecha_pedido,
        estado: pedidos.estado,
        es_canje: pedidos.es_canje,
        sabor: sabores.nombre,
        cantidad: detalle_pedidos.cantidad,
        precio_unitario: detalle_pedidos.precio_unitario,
        subtotal: sql`${detalle_pedidos.cantidad} * ${detalle_pedidos.precio_unitario}`,
        usuario: usuarios.nombre,
      })
      .from(pedidos)
      .innerJoin(
        detalle_pedidos,
        eq(pedidos.id_pedido, detalle_pedidos.id_pedido)
      )
      .innerJoin(sabores, eq(detalle_pedidos.id_sabor, sabores.id_sabor))
      .innerJoin(usuarios, eq(pedidos.id_usuario, usuarios.id_usuario))
      .orderBy(desc(pedidos.fecha_pedido));

    // 2. Agrupamos los datos en una estructura anidada
    const resultado = rows.reduce((acc: any[], row) => {
      // Buscamos si el pedido ya existe en nuestro acumulador
      let pedido = acc.find(p => p.id_pedido === row.id_pedido);

      if (!pedido) {
        // Si no existe, creamos el objeto del pedido con el array de detalle vacío
        pedido = {
          id_pedido: row.id_pedido,
          fecha: row.fecha,
          estado: row.estado,
          es_canje: row.es_canje,
          usuario: row.usuario,
          detalle: [],
          total_pedido: 0,
        };
        acc.push(pedido);
      }

      // Añadimos el sabor al array de detalle del pedido correspondiente
      pedido.detalle.push({
        sabor: row.sabor,
        cantidad: row.cantidad,
        precio_unitario: row.precio_unitario,
        subtotal: parseFloat(row.subtotal as string),
      });

      // Sumamos al total del pedido
      pedido.total_pedido += parseFloat(row.subtotal as string);

      return acc;
    }, []);

    return c.json(resultado);
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

export default app;

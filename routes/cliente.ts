import { Hono } from 'hono';
import { db } from '../db/mysql.ts';
import { usuarios, pedidos, detalle_pedidos, sabores } from '../db/schemas.ts';
import { eq, sql, desc } from 'drizzle-orm';
import { z } from 'zod';
import { zValidator } from './error.ts'; // Asegúrate de que la ruta sea correcta

const cliente = new Hono();

// --- Esquemas de Validación ---

const CompraSchema = z.object({
  userId: z.number(),
  productos: z.array(
    z.object({
      idSabor: z.number(),
      cantidad: z.number().min(1),
    })
  ),
});

const CanjeSchema = z.object({
  userId: z.number(),
  idSabor: z.number(),
});

const CambioEstadoSchema = z.object({
  id_pedido: z.number(),
  nuevoEstado: z.enum([
    'pendiente',
    'completado',
    'cancelado',
    'porcobrar',
    'canje',
  ]),
});

// --- Endpoints ---

/**
 * POST /comprar
 * Suma puntos según la CANTIDAD de unidades compradas.
 */
cliente.post('/comprar', zValidator('json', CompraSchema), async c => {
  const { userId, productos } = c.req.valid('json');

  try {
    const resultado = await db.transaction(async tx => {
      // 1. Crear cabecera (Estado inicial: pendiente)
      const [nuevoPedido] = await tx.insert(pedidos).values({
        id_usuario: userId,
        es_canje: 0,
        estado: 'pendiente',
      });

      const pedidoId = nuevoPedido.insertId;

      for (const item of productos) {
        const [sabor] = await tx
          .select()
          .from(sabores)
          .where(eq(sabores.id_sabor, item.idSabor));

        if (!sabor || (sabor.stock ?? 0) < item.cantidad) {
          throw new Error(
            `Stock insuficiente para ${sabor?.nombre ?? 'sabor desconocido'}`
          );
        }

        await tx.insert(detalle_pedidos).values({
          id_pedido: pedidoId,
          id_sabor: item.idSabor,
          cantidad: item.cantidad,
          precio_unitario: sabor.precio ?? '0.00',
        });

        await tx
          .update(sabores)
          .set({ stock: sql`COALESCE(${sabores.stock}, 0) - ${item.cantidad}` })
          .where(eq(sabores.id_sabor, item.idSabor));
      }

      return { pedidoId };
    });

    return c.json({ success: true, ...resultado });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});
/**
 * POST /canjear
 * Resta 10 puntos por cada canje individual (1 por 1).
 */
cliente.post('/canjear', zValidator('json', CanjeSchema), async c => {
  const { userId, idSabor } = c.req.valid('json');

  try {
    await db.transaction(async tx => {
      const [user] = await tx
        .select()
        .from(usuarios)
        .where(eq(usuarios.id_usuario, userId));

      const puntosActuales = user?.puntos_acumulados ?? 0;
      if (!user || puntosActuales < 10) {
        throw new Error('Puntos insuficientes. Necesitas al menos 10 puntos.');
      }

      // 1. Crear pedido de canje
      const [nuevoPedido] = await tx.insert(pedidos).values({
        id_usuario: userId,
        es_canje: 1,
        estado: 'canje',
      });

      // 2. Registrar detalle (Precio 0)
      await tx.insert(detalle_pedidos).values({
        id_pedido: nuevoPedido.insertId,
        id_sabor: idSabor,
        cantidad: 1,
        precio_unitario: '0.00',
      });

      // 3. Restar 10 puntos del saldo acumulado
      await tx
        .update(usuarios)
        .set({
          puntos_acumulados: sql`COALESCE(${usuarios.puntos_acumulados}, 0) - 10`,
        })
        .where(eq(usuarios.id_usuario, userId));

      // 4. Descontar 1 unidad del stock
      await tx
        .update(sabores)
        .set({ stock: sql`COALESCE(${sabores.stock}, 0) - 1` })
        .where(eq(sabores.id_sabor, idSabor));
    });

    return c.json({ success: true, message: 'Canje realizado correctamente' });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});

/**
 * GET /historial/:userId
 */
cliente.get('/historial/:userId', async c => {
  const userId = parseInt(c.req.param('userId'));

  const historial = await db
    .select({
      id: pedidos.id_pedido,
      fecha: pedidos.fecha_pedido,
      es_canje: pedidos.es_canje,
      sabor: sabores.nombre,
      cantidad: detalle_pedidos.cantidad,
      subtotal: sql`${detalle_pedidos.cantidad} * ${detalle_pedidos.precio_unitario}`,
    })
    .from(pedidos)
    .innerJoin(
      detalle_pedidos,
      eq(pedidos.id_pedido, detalle_pedidos.id_pedido)
    )
    .innerJoin(sabores, eq(detalle_pedidos.id_sabor, sabores.id_sabor))
    .where(eq(pedidos.id_usuario, userId))
    .orderBy(desc(pedidos.fecha_pedido));

  return c.json(historial);
});

cliente.patch('/estado', zValidator('json', CambioEstadoSchema), async c => {
  const { id_pedido, nuevoEstado } = c.req.valid('json');

  try {
    const resultado = await db.transaction(async tx => {
      // 1. Obtener el pedido actual para saber si ya estaba completado o si es canje
      const [pedido] = await tx
        .select()
        .from(pedidos)
        .where(eq(pedidos.id_pedido, id_pedido));

      if (!pedido) throw new Error('Pedido no encontrado');
      if (!pedido.id_usuario) throw new Error('Pedido sin usuario asociado');

      // Si ya estaba completado, no volvemos a sumar puntos para evitar duplicados
      if (pedido.estado === 'completado') {
        throw new Error('Este pedido ya fue completado anteriormente');
      }

      // 2. Actualizar el estado del pedido
      await tx
        .update(pedidos)
        .set({ estado: nuevoEstado })
        .where(eq(pedidos.id_pedido, id_pedido));

      // 3. Lógica de Puntos: SOLO si el nuevo estado es 'completado' y NO es un canje
      if (nuevoEstado === 'completado' && pedido.es_canje === 0) {
        // Sumamos todas las cantidades de los sabores en este pedido
        const detalles = await tx
          .select({ cantidad: detalle_pedidos.cantidad })
          .from(detalle_pedidos)
          .where(eq(detalle_pedidos.id_pedido, id_pedido));

        const totalPuntosASumar = detalles.reduce(
          (acc, item) => acc + (item.cantidad ?? 0),
          0
        );

        if (totalPuntosASumar > 0) {
          await tx
            .update(usuarios)
            .set({
              puntos_acumulados: sql`COALESCE(${usuarios.puntos_acumulados}, 0) + ${totalPuntosASumar}`,
            })
            .where(eq(usuarios.id_usuario, pedido.id_usuario));

          return {
            message: `Estado actualizado. Se sumaron ${totalPuntosASumar} puntos.`,
            puntosSumados: totalPuntosASumar,
          };
        }
      }

      return { message: 'Estado actualizado correctamente', puntosSumados: 0 };
    });

    return c.json({ success: true, ...resultado });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});

cliente.get('/puntos/:userId', async c => {
  const userId = parseInt(c.req.param('userId'));

  try {
    // 1. Obtener los puntos acumulados del usuario
    const [user] = await db
      .select({
        nombre: usuarios.nombre,
        puntos: usuarios.puntos_acumulados,
      })
      .from(usuarios)
      .where(eq(usuarios.id_usuario, userId));

    if (!user) {
      return c.json({ success: false, message: 'Usuario no encontrado' }, 404);
    }

    const puntosActuales = user.puntos ?? 0;

    // 2. Lógica de Negocio: 10 puntos = 1 canje
    const canjesDisponibles = Math.floor(puntosActuales / 10);
    const puntosParaSiguiente = 10 - (puntosActuales % 10);

    return c.json({
      success: true,
      data: {
        cliente: user.nombre,
        puntos_totales: puntosActuales,
        canjes_disponibles: canjesDisponibles,
        faltan_para_el_proximo:
          canjesDisponibles > 0 && puntosParaSiguiente === 10
            ? 0
            : puntosParaSiguiente,
      },
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

/**
 * GET /pedidos-agrupados/:userId
 * Retorna una lista de pedidos donde cada uno contiene su detalle interno.
 */
cliente.get('/pedidos-agrupados/:userId', async c => {
  const userId = parseInt(c.req.param('userId'));

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
      })
      .from(pedidos)
      .innerJoin(
        detalle_pedidos,
        eq(pedidos.id_pedido, detalle_pedidos.id_pedido)
      )
      .innerJoin(sabores, eq(detalle_pedidos.id_sabor, sabores.id_sabor))
      .where(eq(pedidos.id_usuario, userId))
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

export default cliente;

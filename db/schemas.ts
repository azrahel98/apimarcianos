import {
  mysqlTable,
  serial,
  varchar,
  text,
  int,
  timestamp,
  mysqlView,
  double,
  tinyint,
  mysqlEnum,
  decimal,
} from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';

export const usuarios = mysqlTable('usuarios', {
  id_usuario: serial('id_usuario').primaryKey(),
  nombre: varchar('nombre', { length: 100 }).notNull(),
  correo: varchar('correo', { length: 100 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  rol: mysqlEnum('rol', ['cliente', 'admin']).default('cliente'),
  puntos_acumulados: int('puntos_acumulados').default(0), // Aquí contaremos los pedidos
  fecha_registro: timestamp('fecha_registro').defaultNow(),
});

// 2. Sabores
export const sabores = mysqlTable('sabores', {
  id_sabor: serial('id_sabor').primaryKey(),
  nombre: varchar('nombre', { length: 50 }).notNull().unique(),
  precio: decimal('precio', { precision: 10, scale: 2 }).notNull(),
  stock: int('stock').default(0),
});

// 3. Pedidos (Cabecera)
export const pedidos = mysqlTable('pedidos', {
  id_pedido: serial('id_pedido').primaryKey(),
  id_usuario: int('id_usuario').references(() => usuarios.id_usuario),
  fecha_pedido: timestamp('fecha_pedido').defaultNow(),
  es_canje: tinyint('es_canje').default(0),
  estado: mysqlEnum('estado', [
    'pendiente',
    'completado',
    'cancelado',
    'porcobrar',
    'canje',
  ]).default('pendiente'),
});

// 4. Detalle de Pedidos
export const detalle_pedidos = mysqlTable('detalle_pedidos', {
  id_detalle: serial('id_detalle').primaryKey(),
  id_pedido: int('id_pedido').references(() => pedidos.id_pedido),
  id_sabor: int('id_sabor').references(() => sabores.id_sabor),
  cantidad: int('cantidad').notNull().default(1),
  precio_unitario: decimal('precio_unitario', {
    precision: 10,
    scale: 2,
  }).notNull(),
});

export const movimientos_stock = mysqlTable('movimientos_stock', {
  id_movimiento: serial('id_movimiento').primaryKey(),
  id_sabor: int('id_sabor').notNull(),
  cantidad: int('cantidad').notNull(),
  tipo: mysqlEnum('tipo', ['ingreso', 'ajuste', 'venta', 'canje']).default(
    'ingreso'
  ),
  fecha: timestamp('fecha').default(sql`CURRENT_TIMESTAMP`),
});

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

export const users = mysqlTable('usuarios', {
  id_usuario: serial('id_usuario').primaryKey(),
  nombre: varchar('nombre', { length: 255 }).notNull(),
  correo: varchar('correo', { length: 255 }).notNull().unique(),
  password: text('password').notNull(),
  rol: varchar('rol', { length: 50 }).default('user'),
  puntos: int('puntos_acumulados').default(0),
  fecha_registro: timestamp('fecha_registro').defaultNow(),
});

export const pedidos = mysqlView('pedido', {
  venta: serial('id_venta').primaryKey(),
  usuario: serial('id_usuario').primaryKey(),
  marciano: varchar('nombre', { length: 255 }).notNull(),
  precio: double('precio').notNull(),
  cantidad: int('cantidad').notNull(),
  cantidad_usada: int('cantidad_usada').default(0),
  fecha: timestamp('fecha_venta'),
  estado: varchar('estado', { length: 50 }).default('pendiente'),
}).existing();

export const usuarios = mysqlTable('usuarios', {
  id_usuario: serial('id_usuario').primaryKey(),
});

export const ventas = mysqlTable('ventas', {
  id_venta: serial('id_venta').primaryKey().notNull(),
  id_usuario: int('id_usuario'),
  id_sabor: int('id_sabor'),
  cantidad: int('cantidad').default(1),
  fecha_venta: timestamp('fecha_venta', { mode: 'string' }).default(
    sql`CURRENT_TIMESTAMP`
  ),
  es_canje: tinyint('es_canje').default(0),
  estado: mysqlEnum('estado', [
    'pendiente',
    'completado',
    'cancelado',
    'porcobrar',
    'canje',
  ]),
  cantidad_usada: int('cantidad_usada').default(0),
});

export const sabores = mysqlTable('sabores', {
  id_sabor: serial('id_sabor').primaryKey(),
  nombre: varchar('nombre', { length: 50 }).notNull(),
  precio: decimal('precio', { precision: 10, scale: 2 }).notNull(),
  stock: int('stock').notNull(),
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

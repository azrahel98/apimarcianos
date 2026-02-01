import {
  mysqlTable,
  serial,
  varchar,
  text,
  int,
  timestamp,
  mysqlView,
  double,
} from 'drizzle-orm/mysql-core';

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
  fecha: timestamp('fecha_venta'),
  estado: varchar('estado', { length: 50 }).default('pendiente'),
}).existing();

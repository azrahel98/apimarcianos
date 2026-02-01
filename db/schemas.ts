import {
  mysqlTable,
  serial,
  varchar,
  text,
  int,
  timestamp,
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

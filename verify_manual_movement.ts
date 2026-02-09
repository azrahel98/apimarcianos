import { db } from './db/mysql.ts';
import { sabores, movimientos_stock } from './db/schemas.ts';
import { eq, desc } from 'drizzle-orm';

async function main() {
  console.log('--- Verificando Movimientos Manuales de Stock ---');

  // 1. Obtener un sabor y su stock inicial
  let sabor = (await db.select().from(sabores).limit(1))[0];
  if (!sabor) {
    console.log('Creando sabor de prueba...');
    const result = await db.insert(sabores).values({
      nombre: `Sabor Manual ${Date.now()}`,
      precio: '10.00',
      stock: 100,
    });
    sabor = { id_sabor: result[0].insertId, stock: 100 } as any;
  }
  const stockInicial = sabor.stock ?? 0;
  console.log(`Sabor ID: ${sabor.id_sabor}, Stock Inicial: ${stockInicial}`);

  // 2. Probar INGRESO (+10)
  console.log('--- Probando INGRESO (+10) ---');
  try {
    const resIngreso = await fetch('http://localhost:8000/pedidos/movimiento', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idSabor: sabor.id_sabor,
        cantidad: 10,
        tipo: 'ingreso',
      }),
    });
    const dataIngreso = await resIngreso.json();
    console.log('Respuesta Ingreso:', dataIngreso);
  } catch (e) {
    console.error('Error request ingreso:', e);
  }

  // Verificar stock después de ingreso
  let saborAfterIngreso = (
    await db.select().from(sabores).where(eq(sabores.id_sabor, sabor.id_sabor))
  )[0];
  console.log(
    `Stock tras ingreso (esperado ${stockInicial + 10}):`,
    saborAfterIngreso.stock
  );

  if (saborAfterIngreso.stock === stockInicial + 10) {
    console.log('✅ Ingreso OK');
  } else {
    console.error('❌ Ingreso FALLÓ');
  }

  // 3. Probar VENTA (-5)
  console.log('--- Probando VENTA (-5) ---');
  try {
    const resVenta = await fetch('http://localhost:8000/pedidos/movimiento', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idSabor: sabor.id_sabor,
        cantidad: 5,
        tipo: 'venta',
      }),
    });
    const dataVenta = await resVenta.json();
    console.log('Respuesta Venta:', dataVenta);
  } catch (e) {
    console.error('Error request venta:', e);
  }

  // Verificar stock después de venta
  let saborAfterVenta = (
    await db.select().from(sabores).where(eq(sabores.id_sabor, sabor.id_sabor))
  )[0];
  console.log(
    `Stock tras venta (esperado ${stockInicial + 10 - 5}):`,
    saborAfterVenta.stock
  );

  if (saborAfterVenta.stock === stockInicial + 10 - 5) {
    console.log('✅ Venta OK');
  } else {
    console.error('❌ Venta FALLÓ');
  }
}

main();

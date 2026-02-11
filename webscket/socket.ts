import { Context } from 'hono';

const clients = new Set<WebSocket>();

export const handleWebSocket = (c: Context) => {
  if (c.req.header('upgrade') !== 'websocket') {
    return c.text('No es una conexión WebSocket', 400);
  }

  const { socket, response } = Deno.upgradeWebSocket(c.req.raw);

  socket.onopen = () => {
    console.log('✅ Cliente conectado al WebSocket');
    clients.add(socket);
  };

  socket.onclose = () => {
    console.log('❌ Cliente desconectado');
    clients.delete(socket);
  };

  socket.onerror = e => {
    console.error('⚠️ Error en WebSocket:', e);
  };

  return response;
};

export const notifyNewOrder = (pedido: any) => {
  const payload = JSON.stringify({
    event: 'order_created',
    data: pedido,
    timestamp: new Date().toISOString(),
  });

  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
};

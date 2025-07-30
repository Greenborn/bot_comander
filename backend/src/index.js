import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const clients = {};


function broadcastBotsList() {
  const bots = Object.entries(clients).map(([id, data]) => ({
    id,
    connectedAt: data.connectedAt
  }));
  const msg = JSON.stringify({ type: 'bots', bots });
  Object.values(clients).forEach(({ ws }) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(msg);
    }
  });
}

wss.on('connection', (ws) => {
  const clientId = Date.now() + Math.random().toString(36).substr(2, 9);
  clients[clientId] = { ws, connectedAt: Date.now() };
  console.log(`Nuevo bot conectado: ${clientId} (total: ${Object.keys(clients).length})`);

  // Enviar mensaje de bienvenida
  ws.send(JSON.stringify({ type: 'welcome', message: '¡Bienvenido, bot soldier!' }));

  // Enviar listado actualizado a todos los clientes
  broadcastBotsList();

  ws.on('close', () => {
    delete clients[clientId];
    console.log(`Bot desconectado: ${clientId} (total: ${Object.keys(clients).length})`);
    broadcastBotsList();
  });
});


// Endpoint para obtener bots conectados
app.get('/api/bots', (req, res) => {
  const bots = Object.entries(clients).map(([id, data]) => ({
    id,
    connectedAt: data.connectedAt
  }));
  res.json(bots);
});

const HOST = process.env.API_HOST || '0.0.0.0';
const PORT = process.env.API_PORT || 3000;
server.listen(PORT, HOST, () => {
  console.log(`Servidor escuchando en http://${HOST}:${PORT}`);
});

import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const clients = {};

wss.on('connection', (ws) => {
  const clientId = Date.now() + Math.random().toString(36).substr(2, 9);
  clients[clientId] = { ws, connectedAt: Date.now() };

  ws.on('close', () => {
    delete clients[clientId];
  });
});

server.listen(process.env.API_PORT || 3000, () => {
  console.log('Servidor escuchando en puerto', process.env.API_PORT || 3000);
});

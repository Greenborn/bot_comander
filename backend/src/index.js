import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';
import { spawn, exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

dotenv.config({ path: '../.env' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Función para construir el frontend
function buildFrontend() {
  return new Promise((resolve, reject) => {
    // Saltar build en modo desarrollo si se especifica
    if (process.env.SKIP_FRONTEND_BUILD === 'true') {
      console.log('⏭️ Saltando construcción del frontend (SKIP_FRONTEND_BUILD=true)');
      resolve();
      return;
    }
    
    console.log('🔨 Construyendo panel de control...');
    
    const frontendPath = path.resolve(__dirname, '../../frontend');
    
    // Verificar si existe el directorio del frontend
    if (!fs.existsSync(frontendPath)) {
      console.warn('⚠️ No se encontró el directorio del frontend, continuando sin build...');
      resolve();
      return;
    }
    
    // Ejecutar npm run build en el directorio del frontend
    const buildProcess = exec('npm run build', { 
      cwd: frontendPath,
      stdio: 'inherit'
    }, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Error al construir el frontend:', error.message);
        console.error('💡 Tip: Usa SKIP_FRONTEND_BUILD=true para saltarse el build');
        reject(error);
        return;
      }
      
      if (stderr) {
        console.warn('⚠️ Advertencias durante la construcción:', stderr);
      }
      
      console.log('✅ Panel de control construido exitosamente');
      if (stdout) console.log(stdout);
      resolve();
    });
    
    buildProcess.stdout?.on('data', (data) => {
      process.stdout.write(`🔨 ${data}`);
    });
    
    buildProcess.stderr?.on('data', (data) => {
      process.stderr.write(`⚠️ ${data}`);
    });
  });
}

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Servir archivos estáticos del frontend construido
const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');
app.use(express.static(frontendDistPath));

// Middleware para parsear JSON
app.use(express.json());

const clients = {};


function broadcastBotsList() {
  const bots = Object.entries(clients)
    .filter(([id, data]) => data.type === 'bot')
    .map(([id, data]) => ({
      id,
      connectedAt: data.connectedAt,
      type: data.type,
      lastActivity: data.lastActivity || data.connectedAt
    }));
    
  const panels = Object.entries(clients)
    .filter(([id, data]) => data.type === 'panel')
    .map(([id, data]) => ({
      id,
      connectedAt: data.connectedAt,
      type: data.type
    }));

  const msg = JSON.stringify({ 
    type: 'clients_update', 
    bots, 
    panels,
    stats: {
      totalBots: bots.length,
      totalPanels: panels.length
    }
  });
  
  // Enviar solo a los paneles de control
  Object.values(clients)
    .filter(client => client.type === 'panel')
    .forEach(({ ws }) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(msg);
      }
    });
}

wss.on('connection', (ws, req) => {
  const clientId = Date.now() + Math.random().toString(36).substr(2, 9);
  
  // Inicializar cliente sin tipo definido
  clients[clientId] = { 
    ws, 
    connectedAt: Date.now(),
    type: null,
    lastActivity: Date.now()
  };

  console.log(`Nueva conexión: ${clientId}`);

  // Enviar mensaje de bienvenida pidiendo identificación
  ws.send(JSON.stringify({ 
    type: 'identify_request', 
    message: 'Por favor identifícate como "bot" o "panel"',
    clientId 
  }));

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      
      // Manejar identificación del cliente
      if (message.type === 'identify') {
        if (message.clientType === 'bot' || message.clientType === 'panel') {
          clients[clientId].type = message.clientType;
          clients[clientId].lastActivity = Date.now();
          
          if (message.clientType === 'bot') {
            clients[clientId].botName = message.botName || `Bot-${clientId.slice(-4)}`;
            console.log(`Bot conectado: ${clients[clientId].botName} (${clientId})`);
            ws.send(JSON.stringify({ 
              type: 'welcome', 
              message: `¡Bienvenido, ${clients[clientId].botName}!` 
            }));
          } else {
            console.log(`Panel de control conectado: ${clientId}`);
            ws.send(JSON.stringify({ 
              type: 'welcome', 
              message: '¡Panel de control conectado!' 
            }));
          }
          
          broadcastBotsList();
        } else {
          ws.send(JSON.stringify({ 
            type: 'error', 
            message: 'Tipo de cliente no válido. Use "bot" o "panel"' 
          }));
        }
      }
      
      // Manejar heartbeat de bots
      if (message.type === 'heartbeat' && clients[clientId].type === 'bot') {
        clients[clientId].lastActivity = Date.now();
        ws.send(JSON.stringify({ type: 'heartbeat_ack' }));
      }
      
      // Manejar comandos desde paneles hacia bots
      if (message.type === 'command' && clients[clientId].type === 'panel') {
        const targetBot = message.targetBot;
        const command = message.command;
        
        if (clients[targetBot] && clients[targetBot].type === 'bot') {
          clients[targetBot].ws.send(JSON.stringify({
            type: 'command',
            command: command,
            from: 'panel'
          }));
        }
      }
      
    } catch (e) {
      console.error('Error parsing message:', e);
    }
  });

  ws.on('close', () => {
    if (clients[clientId]) {
      const clientType = clients[clientId].type;
      const clientName = clients[clientId].botName || clientId;
      console.log(`${clientType || 'Cliente'} desconectado: ${clientName} (${clientId})`);
      delete clients[clientId];
      broadcastBotsList();
    }
  });
});


// Endpoint para obtener bots conectados
app.get('/api/bots', (req, res) => {
  const bots = Object.entries(clients)
    .filter(([id, data]) => data.type === 'bot')
    .map(([id, data]) => ({
      id,
      botName: data.botName,
      connectedAt: data.connectedAt,
      lastActivity: data.lastActivity,
      type: data.type
    }));
    
  const panels = Object.entries(clients)
    .filter(([id, data]) => data.type === 'panel')
    .map(([id, data]) => ({
      id,
      connectedAt: data.connectedAt,
      type: data.type
    }));

  res.json({
    bots,
    panels,
    stats: {
      totalBots: bots.length,
      totalPanels: panels.length,
      totalClients: Object.keys(clients).length
    }
  });
});

// Catch-all handler: enviar index.html para todas las rutas no API
app.get('*', (req, res) => {
  res.sendFile(path.resolve(frontendDistPath, 'index.html'));
});

const HOST = process.env.API_HOST || '0.0.0.0';
const PORT = process.env.API_PORT || 3000;

// Función para iniciar el servidor
async function startServer() {
  try {
    // Construir el frontend antes de iniciar el servidor
    await buildFrontend();
    
    // Iniciar el servidor
    server.listen(PORT, HOST, () => {
      console.log(`🚀 Servidor escuchando en http://${HOST}:${PORT}`);
      console.log(`📱 Panel de control disponible en: http://${HOST}:${PORT}`);
    });
  } catch (error) {
    console.error('💥 Error al iniciar el servidor:', error.message);
    process.exit(1);
  }
}

// Iniciar el servidor con build automático
startServer();

import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';
import { spawn, exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';

dotenv.config({ path: '../.env' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ruta del archivo de configuración de bots
const BOT_KEYS_FILE = path.resolve(__dirname, '../../bot-keys.json');

// Cargar configuración de bots
function loadBotKeys() {
  if (!fs.existsSync(BOT_KEYS_FILE)) {
    return {};
  }
  
  try {
    const content = fs.readFileSync(BOT_KEYS_FILE, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error('❌ Error al leer archivo de claves de bots:', error.message);
    return {};
  }
}

// Validar API key de bot
async function validateBotApiKey(username, apiKey) {
  const botKeys = loadBotKeys();
  const botConfig = botKeys[username];
  
  if (!botConfig) {
    return { valid: false, reason: 'Bot no registrado' };
  }
  
  if (!botConfig.isActive) {
    return { valid: false, reason: 'Bot desactivado' };
  }
  
  try {
    const isValid = await bcrypt.compare(apiKey, botConfig.apiKeyHash);
    return { 
      valid: isValid, 
      reason: isValid ? 'API key válida' : 'API key inválida',
      botConfig: isValid ? botConfig : null
    };
  } catch (error) {
    console.error('Error validando API key:', error);
    return { valid: false, reason: 'Error interno' };
  }
}

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

// Rate limiting para el endpoint de login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 intentos por IP
  message: { error: 'Demasiados intentos de login. Intenta de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware para verificar JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de acceso requerido' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido' });
    }
    req.user = user;
    next();
  });
}

const clients = {};


function broadcastBotsList() {
  const bots = Object.entries(clients)
    .filter(([id, data]) => data.type === 'bot')
    .map(([id, data]) => ({
      id,
      username: data.username,
      botName: data.botName,
      connectedAt: data.connectedAt,
      type: data.type,
      lastActivity: data.lastActivity || data.connectedAt,
      authenticated: data.authenticated || false
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

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      
      // Manejar identificación del cliente
      if (message.type === 'identify') {
        if (message.clientType === 'bot') {
          // Validar API key para bots
          if (!message.username || !message.apiKey) {
            ws.send(JSON.stringify({ 
              type: 'error', 
              code: 'MISSING_CREDENTIALS',
              message: 'Se requiere username y apiKey para bots' 
            }));
            ws.close();
            return;
          }
          
          const validation = await validateBotApiKey(message.username, message.apiKey);
          
          if (!validation.valid) {
            console.log(`❌ Bot "${message.username}" rechazado: ${validation.reason}`);
            ws.send(JSON.stringify({ 
              type: 'error', 
              code: 'INVALID_CREDENTIALS',
              message: `Autenticación fallida: ${validation.reason}` 
            }));
            ws.close();
            return;
          }
          
          // Bot autenticado exitosamente
          clients[clientId].type = 'bot';
          clients[clientId].username = message.username;
          clients[clientId].botName = message.botName || message.username;
          clients[clientId].lastActivity = Date.now();
          clients[clientId].authenticated = true;
          
          console.log(`✅ Bot autenticado: ${clients[clientId].botName} (${message.username})`);
          ws.send(JSON.stringify({ 
            type: 'welcome', 
            message: `¡Bienvenido, ${clients[clientId].botName}!`,
            authenticated: true
          }));
          
        } else if (message.clientType === 'panel') {
          clients[clientId].type = message.clientType;
          clients[clientId].lastActivity = Date.now();
          
          console.log(`Panel de control conectado: ${clientId}`);
          ws.send(JSON.stringify({ 
            type: 'welcome', 
            message: '¡Panel de control conectado!' 
          }));
        } else {
          ws.send(JSON.stringify({ 
            type: 'error', 
            message: 'Tipo de cliente no válido. Use "bot" o "panel"' 
          }));
        }
        
        broadcastBotsList();
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
      
      // Manejar comandos del sistema desde paneles hacia bots
      if (message.type === 'system_command' && clients[clientId].type === 'panel') {
        const targetBot = message.targetBot;
        const command = message.command;
        
        if (clients[targetBot] && clients[targetBot].type === 'bot') {
          clients[targetBot].ws.send(JSON.stringify({
            type: 'system_command',
            command: command,
            from: 'panel',
            requestId: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          }));
        } else {
          // Bot no encontrado, enviar error al panel
          ws.send(JSON.stringify({
            type: 'command_response',
            success: false,
            error: 'Bot no encontrado o no disponible'
          }));
        }
      }
      
      // Manejar respuestas de comandos del sistema desde bots
      if (message.type === 'system_command_response' && clients[clientId].type === 'bot') {
        // Reenviar la respuesta a todos los paneles conectados
        Object.values(clients)
          .filter(client => client.type === 'panel')
          .forEach(({ ws }) => {
            if (ws.readyState === ws.OPEN) {
              ws.send(JSON.stringify({
                type: 'command_response',
                success: message.success,
                output: message.output,
                error: message.error,
                command: message.command,
                botId: clientId,
                requestId: message.requestId
              }));
            }
          });
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


// Endpoint de login
app.post('/api/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
    }

    // Verificar que las credenciales estén configuradas
    if (!process.env.AUTH_USERNAME || !process.env.AUTH_PASSWORD_HASH) {
      return res.status(500).json({ 
        error: 'Autenticación no configurada. Ejecuta "npm run setup-auth" para configurar.' 
      });
    }

    // Verificar usuario
    if (username !== process.env.AUTH_USERNAME) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, process.env.AUTH_PASSWORD_HASH);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Generar token JWT
    const token = jwt.sign(
      { username: username },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ 
      success: true, 
      token,
      message: 'Login exitoso' 
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint para verificar token
app.get('/api/verify-token', authenticateToken, (req, res) => {
  res.json({ valid: true, username: req.user.username });
});

// Endpoint para obtener bots conectados (protegido)
app.get('/api/bots', authenticateToken, (req, res) => {
  const bots = Object.entries(clients)
    .filter(([id, data]) => data.type === 'bot')
    .map(([id, data]) => ({
      id,
      username: data.username,
      botName: data.botName,
      connectedAt: data.connectedAt,
      lastActivity: data.lastActivity,
      type: data.type,
      authenticated: data.authenticated || false
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

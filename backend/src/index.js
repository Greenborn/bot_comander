// ...existing code...

// Inicialización de Express

// Importación dinámica de multer y configuración del endpoint ZIP
(async () => {
  let multer;
  try {
    multer = (await import('multer')).default;
  } catch (e) {
    console.error('No se pudo importar multer:', e);
    return;
  }
  // Configuración de multer para archivos ZIP
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB máx
    fileFilter: (req, file, cb) => {
      if (file.mimetype === 'application/zip' || file.originalname.endsWith('.zip')) {
        cb(null, true);
      } else {
        cb(new Error('Solo se permiten archivos .zip'));
      }
    }
  });

  // Endpoint para enviar ZIP a un bot (privado)
  app.post('/api/send-zip', authenticateToken, upload.single('zip'), async (req, res) => {
    try {
      const botId = req.body.botId;
      const file = req.file;
      if (!botId || !file) {
        return res.status(400).json({ error: 'Faltan parámetros botId o archivo ZIP.' });
      }
      if (!clients[botId] || clients[botId].type !== 'bot') {
        return res.status(404).json({ error: 'Bot no encontrado o no disponible.' });
      }
      // Enviar archivo ZIP al bot por WebSocket (como base64)
      const zipBase64 = file.buffer.toString('base64');
      clients[botId].ws.send(JSON.stringify({
        type: 'receive_zip',
        filename: file.originalname,
        size: file.size,
        data: zipBase64,
        from: 'panel'
      }));
      res.json({ success: true, message: 'Archivo ZIP enviado al bot.' });
    } catch (error) {
      console.error('Error enviando ZIP:', error);
      res.status(500).json({ error: 'Error interno al enviar ZIP.' });
    }
  });
})();
// ...existing code...
// ...existing code...
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
import cors from 'cors';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ruta del archivo de configuración de bots
const BOT_KEYS_FILE = path.resolve(__dirname, '../../bot-keys.json');

// Ruta del directorio de datos de bots
const BOT_DATA_DIR = path.resolve(__dirname, '../../bot_data');

// Almacenamiento en memoria para datos de bots
const botDataBuffer = new Map();

// Configuración del intervalo de guardado (en minutos)
const SAVE_INTERVAL_MINUTES = parseInt(process.env.BOT_DATA_SAVE_INTERVAL) || 5;

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

// Funciones para manejar datos de bots
function ensureBotDataDirectory() {
  if (!fs.existsSync(BOT_DATA_DIR)) {
    fs.mkdirSync(BOT_DATA_DIR, { recursive: true });
    console.log(`📁 Directorio de datos de bots creado: ${BOT_DATA_DIR}`);
  }
}

function getDateString() {
  const now = new Date();
  return now.toISOString().split('T')[0]; // YYYY-MM-DD
}

function getBotDataFilePath(botName, date) {
  ensureBotDataDirectory();
  return path.join(BOT_DATA_DIR, `${botName}_${date}.json`);
}

function storeBotData(botName, data) {
  const date = getDateString();
  const key = `${botName}_${date}`;
  
  if (!botDataBuffer.has(key)) {
    botDataBuffer.set(key, []);
  }
  
  const botData = {
    timestamp: Date.now(),
    data: data
  };
  
  botDataBuffer.get(key).push(botData);
}

function saveBotDataToFile() {
  if (botDataBuffer.size === 0) {
    return;
  }
  
  console.log(`💾 Guardando datos de ${botDataBuffer.size} bots...`);
  
  for (const [key, dataArray] of botDataBuffer.entries()) {
    const [botName, date] = key.split('_');
    const filePath = getBotDataFilePath(botName, date);
    
    let existingData = [];
    if (fs.existsSync(filePath)) {
      try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        existingData = JSON.parse(fileContent);
      } catch (error) {
        console.error(`Error leyendo archivo existente ${filePath}:`, error.message);
      }
    }
    
    const allData = [...existingData, ...dataArray];
    
    try {
      fs.writeFileSync(filePath, JSON.stringify(allData, null, 2), 'utf8');
      console.log(`✅ Datos guardados para ${botName} en ${filePath} (${dataArray.length} nuevos registros)`);
    } catch (error) {
      console.error(`❌ Error guardando datos para ${botName}:`, error.message);
    }
  }
  
  // Limpiar buffer después de guardar
  botDataBuffer.clear();
}

function loadBotDataFromFile(botName, date) {
  const filePath = getBotDataFilePath(botName, date);
  
  if (!fs.existsSync(filePath)) {
    return [];
  }
  
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error(`Error leyendo datos del bot ${botName} para la fecha ${date}:`, error.message);
    return [];
  }
}

function getBotDataFiles(botName) {
  ensureBotDataDirectory();
  
  try {
    const files = fs.readdirSync(BOT_DATA_DIR);
    const botFiles = files
      .filter(file => file.startsWith(`${botName}_`) && file.endsWith('.json'))
      .map(file => {
        const date = file.replace(`${botName}_`, '').replace('.json', '');
        const filePath = path.join(BOT_DATA_DIR, file);
        const stats = fs.statSync(filePath);
        return {
          date,
          file,
          size: stats.size,
          modified: stats.mtime.toISOString()
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date)); // Ordenar por fecha descendente
    
    return botFiles;
  } catch (error) {
    console.error(`Error listando archivos para bot ${botName}:`, error.message);
    return [];
  }
}

function getAllBotNames() {
  ensureBotDataDirectory();
  
  try {
    const files = fs.readdirSync(BOT_DATA_DIR);
    const botNames = new Set();
    
    files
      .filter(file => file.endsWith('.json'))
      .forEach(file => {
        const parts = file.split('_');
        if (parts.length >= 2) {
          const botName = parts.slice(0, -1).join('_'); // Todo excepto la fecha
          botNames.add(botName);
        }
      });
    
    return Array.from(botNames).sort();
  } catch (error) {
    console.error('Error listando nombres de bots:', error.message);
    return [];
  }
}

// Función para inicializar el frontend según el modo configurado
async function initializeFrontend() {
  const serveMode = process.env.SERVE_FRONTEND_MODE || 'development';
  
  if (serveMode === 'development') {
    console.log('🔧 Modo desarrollo: frontend servido desde Vite dev server');
    console.log('💡 Asegúrate de ejecutar "npm run dev" en el directorio frontend');
    console.log('📱 Panel de control disponible en: http://localhost:5173 (Vite dev server)');
    
    // En modo desarrollo, configurar proxy hacia el dev server de Vite
    setupDevelopmentProxy();
  } else {
    console.log('🏗️ Modo producción: construyendo frontend...');
    await buildFrontend();
    setupProductionStatic();
  }
}

// Configurar proxy para modo desarrollo
function setupDevelopmentProxy() {
  // Middleware para redirigir al dev server de Vite en desarrollo
  app.get('/', (req, res) => {
    res.redirect('http://localhost:5173');
  });
  // Wildcard route removed to avoid conflicts with parameterized API routes
}

// Configurar servido estático para producción
function setupProductionStatic() {
  // Servir archivos estáticos del frontend construido
  const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');
  app.use(express.static(frontendDistPath));
  
  // Servir el index.html para rutas no API
  // Use regex to match all non-API routes for SPA
  app.get(/^((?!\/api).)*$/, (req, res) => {
    res.sendFile(path.resolve(frontendDistPath, 'index.html'));
  });
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
// Configuración de multer para archivos ZIP
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB máx
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/zip' || file.originalname.endsWith('.zip')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos .zip'));
    }
  }
});

// Endpoint para enviar ZIP a un bot (privado)
app.post('/api/send-zip', authenticateToken, upload.single('zip'), async (req, res) => {
  try {
    const botId = req.body.botId;
    const file = req.file;
    if (!botId || !file) {
      return res.status(400).json({ error: 'Faltan parámetros botId o archivo ZIP.' });
    }
    if (!clients[botId] || clients[botId].type !== 'bot') {
      return res.status(404).json({ error: 'Bot no encontrado o no disponible.' });
    }
    // Enviar archivo ZIP al bot por WebSocket (como base64)
    const zipBase64 = file.buffer.toString('base64');
    clients[botId].ws.send(JSON.stringify({
      type: 'receive_zip',
      filename: file.originalname,
      size: file.size,
      data: zipBase64,
      from: 'panel'
    }));
    res.json({ success: true, message: 'Archivo ZIP enviado al bot.' });
  } catch (error) {
    console.error('Error enviando ZIP:', error);
    res.status(500).json({ error: 'Error interno al enviar ZIP.' });
  }
});
      return;
    }
    
    // Ejecutar npm run build en el directorio del frontend
    const buildProcess = exec('npm run build', { 
      cwd: path.resolve(__dirname, '../../'),
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

// Configurar CORS
const corsOptions = {
  origin: function (origin, callback) {
    // Permitir sin origin (para aplicaciones móviles, Postman, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:5173', // Vite dev server
      'http://localhost:8080', // Producción en el mismo puerto
      'http://127.0.0.1:5173',
      'http://127.0.0.1:8080'
    ];
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS: Origen no permitido: ${origin}`);
      callback(null, true); // Por ahora permitir todos en desarrollo
    }
  },
  credentials: true
};

app.use(cors(corsOptions));

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
      authenticated: data.authenticated || false,
      ipv4: data.ipv4,
      ipv6: data.ipv6
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
  // Obtener direcciones IP del socket
  let ipv4 = null;
  let ipv6 = null;
  // Detectar IP pública si hay proxy
  if (req && req.headers && req.headers['x-forwarded-for']) {
    // Puede ser una lista de IPs, tomar la primera
    const forwarded = req.headers['x-forwarded-for'].split(',')[0].trim();
    if (forwarded.includes(':')) {
      ipv6 = forwarded;
    } else {
      ipv4 = forwarded;
    }
  } else if (req && req.socket && req.socket.remoteAddress) {
    if (req.socket.remoteFamily === 'IPv4') {
      ipv4 = req.socket.remoteAddress;
    } else if (req.socket.remoteFamily === 'IPv6') {
      ipv6 = req.socket.remoteAddress;
    }
  }
  clients[clientId] = { 
    ws, 
    connectedAt: Date.now(),
    type: null,
    lastActivity: Date.now(),
    ipv4,
    ipv6
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
      
      // Manejar mensajes genéricos de bots (información, datos, logs, etc.)
      if (message.type === 'generic_message' && clients[clientId].type === 'bot') {
        const botName = clients[clientId].username || clients[clientId].botName;
        
        if (botName && message.payload) {
          // Almacenar la información en memoria
          storeBotData(botName, {
            type: message.type,
            category: message.category || 'general',
            priority: message.priority || 'normal',
            payload: message.payload,
            metadata: message.metadata || {},
            botName: botName
          });
          
          console.log(`📊 Información recibida de ${botName}: ${message.category || 'general'}`);
          
          // Si el bot espera respuesta, enviar confirmación
          if (message.expectResponse && message.requestId) {
            ws.send(JSON.stringify({
              type: 'generic_message_response',
              requestId: message.requestId,
              success: true,
              message: 'Información recibida y almacenada'
            }));
          }
        }
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
      
      // Manejar solicitudes de terminal PTY desde paneles hacia bots
      if (message.type === 'pty_start' && clients[clientId].type === 'panel') {
        const targetBot = message.targetBot;
        
        if (clients[targetBot] && clients[targetBot].type === 'bot') {
          clients[targetBot].ws.send(JSON.stringify({
            type: 'pty_start',
            requestId: message.requestId,
            command: message.command,
            interactive: message.interactive || false,
            cols: message.cols || 80,
            rows: message.rows || 24,
            from: 'panel'
          }));
        } else {
          ws.send(JSON.stringify({
            type: 'pty_error',
            requestId: message.requestId,
            error: 'Bot no encontrado o no disponible'
          }));
        }
      }
      
      // Manejar entrada PTY desde paneles hacia bots
      if (message.type === 'pty_input' && clients[clientId].type === 'panel') {
        const targetBot = message.targetBot;
        
        if (clients[targetBot] && clients[targetBot].type === 'bot') {
          clients[targetBot].ws.send(JSON.stringify({
            type: 'pty_input',
            sessionId: message.sessionId,
            data: message.data
          }));
        }
      }
      
      // Manejar redimensionamiento PTY desde paneles hacia bots
      if (message.type === 'pty_resize' && clients[clientId].type === 'panel') {
        const targetBot = message.targetBot;
        
        if (clients[targetBot] && clients[targetBot].type === 'bot') {
          clients[targetBot].ws.send(JSON.stringify({
            type: 'pty_resize',
            sessionId: message.sessionId,
            cols: message.cols,
            rows: message.rows
          }));
        }
      }
      
      // Manejar terminación PTY desde paneles hacia bots
      if (message.type === 'pty_kill' && clients[clientId].type === 'panel') {
        const targetBot = message.targetBot;
        
        if (clients[targetBot] && clients[targetBot].type === 'bot') {
          clients[targetBot].ws.send(JSON.stringify({
            type: 'pty_kill',
            sessionId: message.sessionId,
            signal: message.signal || 'SIGTERM'
          }));
        }
      }
      
      // Manejar lista de sesiones PTY desde paneles hacia bots
      if (message.type === 'pty_list' && clients[clientId].type === 'panel') {
        const targetBot = message.targetBot;
        
        if (clients[targetBot] && clients[targetBot].type === 'bot') {
          clients[targetBot].ws.send(JSON.stringify({
            type: 'pty_list',
            requestId: message.requestId || `list_${Date.now()}`
          }));
        }
      }
      
      // Reenviar respuestas PTY desde bots hacia paneles
      if (clients[clientId].type === 'bot' && message.type?.startsWith('pty_')) {
        Object.values(clients)
          .filter(client => client.type === 'panel')
          .forEach(({ ws }) => {
            if (ws.readyState === ws.OPEN) {
              ws.send(JSON.stringify(message));
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

// Endpoint para obtener archivos de datos de un bot específico
app.get('/api/bot-data/:botName/files', authenticateToken, (req, res) => {
  try {
    const { botName } = req.params;
    const files = getBotDataFiles(botName);
    
    res.json({
      botName,
      files,
      total: files.length
    });
  } catch (error) {
    console.error('Error obteniendo archivos de bot:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint para obtener datos de un bot en una fecha específica
app.get('/api/bot-data/:botName/date/:date', authenticateToken, (req, res) => {
  try {
    const { botName, date } = req.params;
    
    // Validar formato de fecha YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Formato de fecha inválido. Use YYYY-MM-DD' });
    }
    
    const data = loadBotDataFromFile(botName, date);
    
    res.json({
      botName,
      date,
      data,
      total: data.length
    });
  } catch (error) {
    console.error('Error obteniendo datos de bot:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint para obtener todos los bots que tienen datos
app.get('/api/bot-data/bots', authenticateToken, (req, res) => {
  try {
    const botNames = getAllBotNames();
    
    res.json({
      bots: botNames,
      total: botNames.length
    });
  } catch (error) {
    console.error('Error obteniendo lista de bots:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

const HOST = process.env.API_HOST || '0.0.0.0';
const PORT = process.env.API_PORT || 3000;

// Función para iniciar el servidor
async function startServer() {
  try {
    // Inicializar el frontend según el modo configurado
    await initializeFrontend();
    
    // Iniciar el servidor
    server.listen(PORT, HOST, () => {
      console.log(`🚀 Servidor API escuchando en http://${HOST}:${PORT}`);
      
      const serveMode = process.env.SERVE_FRONTEND_MODE || 'development';
      if (serveMode === 'production') {
        console.log(`📱 Panel de control disponible en: http://${HOST}:${PORT}`);
      }
      
      // Iniciar el intervalo de guardado de datos de bots
      const saveIntervalMs = SAVE_INTERVAL_MINUTES * 60 * 1000;
      setInterval(saveBotDataToFile, saveIntervalMs);
      console.log(`⏰ Intervalo de guardado de datos configurado: cada ${SAVE_INTERVAL_MINUTES} minutos`);
    });
  } catch (error) {
    console.error('💥 Error al iniciar el servidor:', error.message);
    process.exit(1);
  }
}

// Manejar cierre graceful del servidor
process.on('SIGINT', () => {
  console.log('\n🛑 Cerrando servidor...');
  
  // Guardar datos pendientes antes de cerrar
  saveBotDataToFile();
  
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Cerrando servidor...');
  
  // Guardar datos pendientes antes de cerrar
  saveBotDataToFile();
  
  process.exit(0);
});

// Iniciar el servidor con build automático
startServer();

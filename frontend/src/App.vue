<template>
  <div class="container-fluid">
    <!-- Login Form -->
    <div v-if="!isAuthenticated" class="d-flex justify-content-center align-items-center vh-100">
      <div class="card shadow-lg" style="width: 400px;">
        <div class="card-body">
          <div class="text-center mb-4">
            <i class="bi bi-robot fs-1 text-primary"></i>
            <h3 class="mt-2">Bot Commander</h3>
            <p class="text-muted">Acceso al Panel de Control</p>
          </div>
          
          <form @submit.prevent="login">
            <div class="mb-3">
              <label for="username" class="form-label">Usuario</label>
              <div class="input-group">
                <span class="input-group-text">
                  <i class="bi bi-person"></i>
                </span>
                <input 
                  type="text" 
                  class="form-control" 
                  id="username"
                  v-model="loginForm.username"
                  placeholder="Ingrese su usuario"
                  :disabled="isLoggingIn"
                  required
                >
              </div>
            </div>
            
            <div class="mb-3">
              <label for="password" class="form-label">Contraseña</label>
              <div class="input-group">
                <span class="input-group-text">
                  <i class="bi bi-lock"></i>
                </span>
                <input 
                  type="password" 
                  class="form-control" 
                  id="password"
                  v-model="loginForm.password"
                  placeholder="Ingrese su contraseña"
                  :disabled="isLoggingIn"
                  required
                >
              </div>
            </div>
            
            <div v-if="loginError" class="alert alert-danger" role="alert">
              <i class="bi bi-exclamation-triangle"></i>
              {{ loginError }}
            </div>
            
            <button 
              type="submit" 
              class="btn btn-primary w-100"
              :disabled="isLoggingIn"
            >
              <span v-if="isLoggingIn" class="spinner-border spinner-border-sm me-2"></span>
              <i v-else class="bi bi-box-arrow-in-right me-2"></i>
              {{ isLoggingIn ? 'Iniciando sesión...' : 'Iniciar Sesión' }}
            </button>
          </form>
        </div>
      </div>
    </div>

    <!-- Main Dashboard (only shown when authenticated) -->
    <div v-else>
      <!-- Header -->
      <nav class="navbar navbar-dark bg-dark mb-4">
        <div class="container-fluid">
          <span class="navbar-brand mb-0 h1">
            <i class="bi bi-robot"></i>
            Bot Commander
          </span>
          <div class="d-flex align-items-center">
            <span class="navbar-text me-3">
              <span class="badge bg-success me-2">{{ stats.totalBots }}</span>
              Bots
              <span class="badge bg-info ms-3 me-2">{{ stats.totalPanels }}</span>
              Paneles
              <span class="badge ms-3 me-2" :class="connectionStatus === 'Conectado' ? 'bg-success' : 'bg-danger'">
                {{ connectionStatus }}
              </span>
            </span>
            <div class="dropdown">
              <button class="btn btn-outline-light btn-sm dropdown-toggle" type="button" data-bs-toggle="dropdown">
                <i class="bi bi-person-circle"></i>
                {{ currentUser }}
              </button>
              <ul class="dropdown-menu">
                <li>
                  <button class="dropdown-item" @click="logout">
                    <i class="bi bi-box-arrow-right"></i>
                    Cerrar Sesión
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </nav>

    <!-- Main Content -->
    <div class="container">
      <div class="row">
        <div class="col-12">
          <!-- Stats Cards -->
          <div class="row mb-4">
            <div class="col-md-3">
              <div class="card text-white bg-primary">
                <div class="card-body">
                  <div class="d-flex justify-content-between">
                    <div>
                      <h5 class="card-title">Total Bots</h5>
                      <h2 class="mb-0">{{ stats.totalBots }}</h2>
                    </div>
                    <div class="align-self-center">
                      <i class="bi bi-robot fs-1"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="col-md-3">
              <div class="card text-white bg-success">
                <div class="card-body">
                  <div class="d-flex justify-content-between">
                    <div>
                      <h5 class="card-title">Bots Activos</h5>
                      <h2 class="mb-0">{{ stats.totalBots }}</h2>
                    </div>
                    <div class="align-self-center">
                      <i class="bi bi-wifi fs-1"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="col-md-3">
              <div class="card text-white bg-info">
                <div class="card-body">
                  <div class="d-flex justify-content-between">
                    <div>
                      <h5 class="card-title">Paneles</h5>
                      <h2 class="mb-0">{{ stats.totalPanels }}</h2>
                    </div>
                    <div class="align-self-center">
                      <i class="bi bi-display fs-1"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="col-md-3">
              <div class="card text-white bg-warning">
                <div class="card-body">
                  <div class="d-flex justify-content-between">
                    <div>
                      <h5 class="card-title">Estado</h5>
                      <h6 class="mb-0">{{ connectionStatus }}</h6>
                    </div>
                    <div class="align-self-center">
                      <i class="bi bi-activity fs-1"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Bots List -->
          <div class="row">
            <div class="col-md-8">
              <div class="card">
                <div class="card-header">
                  <h5 class="mb-0">
                    <i class="bi bi-robot"></i>
                    Bots Conectados ({{ stats.totalBots }})
                  </h5>
                </div>
                <div class="card-body">
                  <div v-if="bots.length === 0" class="text-center py-5">
                    <i class="bi bi-robot fs-1 text-muted"></i>
                    <p class="text-muted mt-3">No hay bots conectados actualmente</p>
                    <small class="text-muted">Los bots aparecerán aquí cuando se conecten al WebSocket</small>
                  </div>
                  
                  <div v-else class="row">
                    <div v-for="bot in bots" :key="bot.id" class="col-md-6 mb-3">
                      <div class="card border-left-primary">
                        <div class="card-body">
                          <div class="d-flex justify-content-between align-items-center mb-2">
                            <h6 class="card-title mb-0">
                              <i class="bi bi-robot text-primary"></i>
                              {{ bot.botName || `Bot-${bot.id.slice(-4)}` }}
                            </h6>
                            <span class="badge bg-success">Online</span>
                          </div>
                          <p class="card-text">
                            <strong>ID:</strong> 
                            <code class="text-primary">{{ bot.id.slice(-8) }}</code>
                          </p>
                          <p class="card-text">
                            <strong>Conectado:</strong><br>
                            <small class="text-muted">
                              <i class="bi bi-clock"></i>
                              {{ new Date(bot.connectedAt).toLocaleString() }}
                            </small>
                          </p>
                          <p class="card-text" v-if="bot.lastActivity">
                            <strong>Última actividad:</strong><br>
                            <small class="text-success">
                              <i class="bi bi-activity"></i>
                              {{ new Date(bot.lastActivity).toLocaleString() }}
                            </small>
                          </p>
                          <div class="d-flex gap-2">
                            <button class="btn btn-sm btn-outline-primary">
                              <i class="bi bi-info-circle"></i>
                              Detalles
                            </button>
                            <button class="btn btn-sm btn-outline-warning">
                              <i class="bi bi-gear"></i>
                              Comandos
                            </button>
                            <button 
                              class="btn btn-sm position-relative"
                              :class="hasActiveTerminalSession(bot) ? 'btn-success' : 'btn-outline-success'"
                              @click="openConsole(bot)"
                              data-bs-toggle="modal" 
                              data-bs-target="#consoleModal"
                            >
                              <i class="bi bi-terminal"></i>
                              Consola
                              <span 
                                v-if="hasActiveTerminalSession(bot)" 
                                class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-warning text-dark"
                              >
                                <i class="bi bi-circle-fill" style="font-size: 8px;"></i>
                                <span class="visually-hidden">Sesión activa</span>
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Panels List -->
            <div class="col-md-4">
              <div class="card">
                <div class="card-header">
                  <h5 class="mb-0">
                    <i class="bi bi-display"></i>
                    Paneles de Control ({{ stats.totalPanels }})
                  </h5>
                </div>
                <div class="card-body">
                  <div v-if="panels.length === 0" class="text-center py-3">
                    <i class="bi bi-display fs-2 text-muted"></i>
                    <p class="text-muted mt-2">Solo este panel conectado</p>
                  </div>
                  
                  <div v-else>
                    <div v-for="panel in panels" :key="panel.id" class="mb-2">
                      <div class="card border-left-info">
                        <div class="card-body py-2">
                          <div class="d-flex justify-content-between align-items-center">
                            <div>
                              <h6 class="mb-1">
                                <i class="bi bi-display text-info"></i>
                                Panel {{ panel.id.slice(-4) }}
                              </h6>
                              <small class="text-muted">
                                <i class="bi bi-clock"></i>
                                {{ new Date(panel.connectedAt).toLocaleString() }}
                              </small>
                            </div>
                            <span class="badge bg-info">Activo</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>

    <!-- Console Modal -->
    <div class="modal fade" id="consoleModal" tabindex="-1" aria-labelledby="consoleModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-lg">
        <div class="modal-content bg-dark text-light">
          <div class="modal-header border-secondary">
            <h5 class="modal-title" id="consoleModalLabel">
              <i class="bi bi-terminal"></i>
              Consola - {{ selectedBot?.botName || 'Bot' }}
            </h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body p-0">
            <div class="terminal-container" style="height: 400px; background-color: #0d1117;">
              <div 
                class="terminal-output p-3" 
                id="terminal-content"
                style="height: 350px; overflow-x: auto; overflow-y: auto; font-family: 'Consolas', 'Monaco', 'Courier New', monospace; font-size: 12px; line-height: 1.2; white-space: pre-wrap; background-color: #0d1117; color: #c9d1d9; word-wrap: break-word;"
                ref="terminalOutput"
              >
                <div v-for="(line, index) in terminalLines" :key="index" v-html="formatTerminalOutput(line.data || line)"></div>
                <div v-if="terminalLines.length === 0" class="text-muted">
                  <div v-if="!isBotConnected()">
                    ⚠️ El bot no está conectado al servidor.
                  </div>
                  <div v-else-if="!terminalConnected">
                    🖥️ Terminal listo. Presiona "Iniciar Terminal" para comenzar.
                  </div>
                  <div v-else>
                    ⏳ Iniciando sesión de terminal...
                  </div>
                </div>
              </div>
              <div class="terminal-input border-top border-secondary p-2" style="background-color: #161b22;">
                <div class="input-group">
                  <span 
                    class="input-group-text bg-dark border-secondary"
                    :class="getTerminalStatusClass()"
                  >
                    <i class="bi bi-terminal"></i>
                    {{ getTerminalStatusText() }}
                  </span>
                  <input 
                    type="text" 
                    class="form-control bg-dark text-light border-secondary terminal-input-field"
                    placeholder="Escribe en la terminal..."
                    v-model="terminalInput"
                    @keydown="handleTerminalKeydown"
                    :disabled="!isBotConnected()"
                    ref="terminalInputField"
                  >
                  <button 
                    :class="isBotConnected() ? 'btn btn-outline-success' : 'btn btn-outline-secondary'" 
                    @click="startTerminalSession"
                    v-if="!terminalConnected"
                    :disabled="!isBotConnected()"
                    :title="isBotConnected() ? 'Iniciar sesión de terminal' : 'Bot no conectado al servidor'"
                  >
                    <i class="bi bi-play-circle"></i>
                    {{ isBotConnected() ? 'Iniciar Terminal' : 'Bot Desconectado' }}
                  </button>
                  <button 
                    class="btn btn-outline-danger" 
                    @click="stopTerminalSession"
                    v-if="terminalConnected"
                    title="Terminar sesión de terminal"
                  >
                    <i class="bi bi-stop-circle"></i>
                    Terminar Terminal
                  </button>
                  <span 
                    v-if="!isBotConnected()"
                    class="btn btn-outline-secondary disabled"
                    title="Bot no está conectado al servidor"
                  >
                    <i class="bi bi-exclamation-triangle"></i>
                    Bot Desconectado
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer border-secondary">
            <button type="button" class="btn btn-outline-warning" @click="clearTerminal">
              <i class="bi bi-trash"></i>
              Limpiar Terminal
            </button>
            <div class="btn-group">
              <button 
                type="button" 
                class="btn btn-outline-info" 
                @click="sendTerminalCommand('clear')"
                :disabled="!terminalConnected || !isBotConnected()"
                title="Limpiar pantalla"
              >
                <i class="bi bi-eraser"></i>
                Clear
              </button>
              <button 
                type="button" 
                class="btn btn-outline-info" 
                @click="sendTerminalCommand('exit')"
                :disabled="!terminalConnected || !isBotConnected()"
                title="Salir"
              >
                <i class="bi bi-box-arrow-right"></i>
                Exit
              </button>
            </div>
            <button 
              type="button" 
              class="btn btn-outline-danger" 
              @click="clearBotSession"
              title="Limpiar sesión del bot"
            >
              <i class="bi bi-x-circle"></i>
              Limpiar Sesión
            </button>
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const bots = ref([]);
const panels = ref([]);
const stats = ref({
  totalBots: 0,
  totalPanels: 0
});
const connectionStatus = ref('Desconectado');
const isAuthenticated = ref(false);
const isLoggingIn = ref(false);
const loginError = ref('');
const currentUser = ref('');
const loginForm = ref({
  username: '',
  password: ''
});

// Console related variables
const selectedBot = ref(null);
const consoleOutput = ref([]);
const currentCommand = ref('');
const commandExecuting = ref(false);
const consoleInput = ref(null);

// PTY Terminal variables (para el modal de consola)
const terminalSessionId = ref(null);
const terminalConnected = ref(false);
const terminalLines = ref([]);
const terminalInput = ref('');
const terminalCols = ref(120);  // Ancho estándar para comandos como htop
const terminalRows = ref(30);   // Altura estándar
const terminalRawMode = ref(false);
const terminalInputField = ref(null);

// Mapa para rastrear sessionId -> botId
const sessionToBotMap = ref(new Map());
const terminalOutput = ref(null);

// Almacenar sesiones PTY por bot
const botTerminalSessions = ref(new Map());

// Función para calcular dimensiones del terminal
function calculateTerminalDimensions() {
  const terminal = terminalOutput.value;
  if (!terminal) {
    return { cols: 120, rows: 30 }; // valores por defecto
  }
  
  // Obtener el tamaño de la fuente
  const styles = window.getComputedStyle(terminal);
  const fontSize = parseFloat(styles.fontSize);
  const lineHeight = parseFloat(styles.lineHeight) || fontSize * 1.2;
  
  // Calcular dimensiones basadas en el contenedor
  const containerWidth = terminal.clientWidth - 24; // restar padding
  const containerHeight = terminal.clientHeight - 24; // restar padding
  
  // Calcular caracteres por ancho (más preciso para fuentes monospace)
  // Consolas/Monaco tienen un ratio de ~0.6, Courier New ~0.65
  const charWidth = fontSize * 0.6;
  const cols = Math.floor(containerWidth / charWidth);
  const rows = Math.floor(containerHeight / lineHeight);
  
  return {
    // Preferir un ancho conservador para comandos estructurados
    cols: Math.max(100, Math.min(cols, 150)), // entre 100 y 150 columnas (óptimo para htop)
    rows: Math.max(25, Math.min(rows, 40))    // entre 25 y 40 filas
  };
}

let ws;
let authToken = '';

// Verificar si ya hay un token válido al cargar la página
onMounted(async () => {
  const savedToken = localStorage.getItem('bot_commander_token');
  if (savedToken) {
    if (await verifyToken(savedToken)) {
      authToken = savedToken;
      isAuthenticated.value = true;
      initializeWebSocket();
    } else {
      localStorage.removeItem('bot_commander_token');
    }
  }
  
  // Agregar listener para redimensionar terminal cuando cambie el tamaño de ventana
  window.addEventListener('resize', () => {
    if (terminalConnected.value && terminalSessionId.value) {
      setTimeout(() => {
        resizeTerminal();
      }, 100);
    }
  });
});

async function verifyToken(token) {
  try {
    const response = await fetch('/api/verify-token', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      currentUser.value = data.username;
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error verificando token:', error);
    return false;
  }
}

async function login() {
  if (isLoggingIn.value) return;
  
  isLoggingIn.value = true;
  loginError.value = '';
  
  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: loginForm.value.username,
        password: loginForm.value.password
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      authToken = data.token;
      currentUser.value = loginForm.value.username;
      localStorage.setItem('bot_commander_token', authToken);
      isAuthenticated.value = true;
      loginForm.value.username = '';
      loginForm.value.password = '';
      initializeWebSocket();
    } else {
      loginError.value = data.error || 'Error al iniciar sesión';
    }
  } catch (error) {
    console.error('Error en login:', error);
    loginError.value = 'Error de conexión. Verifique su conexión a internet.';
  } finally {
    isLoggingIn.value = false;
  }
}

function logout() {
  localStorage.removeItem('bot_commander_token');
  authToken = '';
  isAuthenticated.value = false;
  currentUser.value = '';
  connectionStatus.value = 'Desconectado';
  if (ws) {
    ws.close();
    ws = null;
  }
}

function initializeWebSocket() {
  console.log('VITE_WS_URL:', import.meta.env.VITE_WS_URL);
  ws = new WebSocket(import.meta.env.VITE_WS_URL);
  
  ws.onopen = () => {
    console.log('WebSocket conectado exitosamente');
    connectionStatus.value = 'Conectado';
  };
  
  ws.onerror = (error) => {
    console.error('Error de WebSocket:', error);
    connectionStatus.value = 'Error';
  };
  
  ws.onclose = (event) => {
    console.log('WebSocket cerrado:', event.code, event.reason);
    connectionStatus.value = 'Desconectado';
    
    // Limpiar todas las sesiones PTY al desconectarse
    botTerminalSessions.value.clear();
    terminalSessionId.value = null;
    terminalConnected.value = false;
    
    console.log('Sesiones PTY limpiadas debido a desconexión WebSocket');
  };
  
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log('Mensaje recibido:', data);
      
      // Responder a solicitud de identificación
      if (data.type === 'identify_request') {
        ws.send(JSON.stringify({
          type: 'identify',
          clientType: 'panel'
        }));
      }
      
      // Manejar actualización de clientes
      if (data.type === 'clients_update') {
        bots.value = data.bots;
        panels.value = data.panels;
        stats.value = data.stats;
      }
      
      // Manejar mensaje de bienvenida
      if (data.type === 'welcome') {
        console.log('Bienvenida:', data.message);
      }
      
      // Manejar respuesta de comando de consola
      if (data.type === 'command_response') {
        handleCommandResponse(data);
      }
      
      // Manejar mensajes PTY
      if (data.type.startsWith('pty_')) {
        handlePtyMessage(data);
      }
      
    } catch (e) {
      console.error('Error parseando mensaje:', e);
    }
  };
}

// Console functions - ahora con PTY
function openConsole(bot) {
  selectedBot.value = bot;
  
  // Obtener o crear sesión para este bot
  let session = botTerminalSessions.value.get(bot.id);
  
  if (session && session.connected) {
    // Restaurar sesión existente
    terminalSessionId.value = session.sessionId;
    terminalConnected.value = session.connected;
    terminalLines.value = session.lines || [];
    terminalInput.value = '';
    
    // Registrar sessionId -> botId para futuros mensajes
    sessionToBotMap.value.set(session.sessionId, bot.id);
    
    console.log(`Restaurando sesión PTY existente para ${bot.botName}: ${session.sessionId}`);
    
    // Agregar mensaje informativo sobre la restauración
    terminalLines.value.push({
      data: `\x1b[36m[Sesión restaurada: ${session.sessionId}]\x1b[0m\r\n`,
      timestamp: new Date()
    });
  } else if (session && !session.connected) {
    // Sesión desconectada, mostrar historial pero no permitir comandos
    terminalSessionId.value = null;
    terminalConnected.value = false;
    terminalLines.value = session.lines || [];
    terminalInput.value = '';
    
    console.log(`Mostrando historial de sesión desconectada para ${bot.botName}`);
    
    // Agregar mensaje informativo
    terminalLines.value.push({
      data: `\x1b[33m[Sesión desconectada - Historial del terminal]\x1b[0m\r\n`,
      timestamp: new Date()
    });
  } else {
    // Inicializar nueva sesión
    terminalSessionId.value = null;
    terminalConnected.value = false;
    terminalLines.value = [];
    terminalInput.value = '';

    console.log(`Iniciando nueva sesión PTY para ${bot.botName}`);
  }
  
  // Focus input after modal is shown
  setTimeout(() => {
    if (terminalInputField.value) {
      terminalInputField.value.focus();
    }
    
    // Redimensionar terminal si hay una sesión activa
    if (terminalConnected.value && terminalSessionId.value) {
      resizeTerminal();
    }
  }, 500);
}

// PTY functions para el modal de consola
function startTerminalSession() {
  if (!selectedBot.value || terminalConnected.value) return;
  
  // Calcular dimensiones automáticamente
  const dimensions = calculateTerminalDimensions();
  terminalCols.value = dimensions.cols;
  terminalRows.value = dimensions.rows;
  
  const requestId = `pty_req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`Iniciando terminal PTY con dimensiones: ${dimensions.cols}x${dimensions.rows}`);
  
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'pty_start',
      targetBot: selectedBot.value.id,
      requestId: requestId,
      interactive: true,
      cols: terminalCols.value,
      rows: terminalRows.value
    }));
  }
}

function killTerminalSession() {
  if (!terminalSessionId.value || !terminalConnected.value) return;
  
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'pty_kill',
      targetBot: selectedBot.value.id,
      sessionId: terminalSessionId.value,
      signal: 'SIGTERM'
    }));
  }
}

function resizeTerminal() {
  if (!terminalSessionId.value || !terminalConnected.value) return;
  
  // Recalcular dimensiones automáticamente
  const dimensions = calculateTerminalDimensions();
  terminalCols.value = dimensions.cols;
  terminalRows.value = dimensions.rows;
  
  console.log(`Redimensionando terminal PTY a: ${dimensions.cols}x${dimensions.rows}`);
  
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'pty_resize',
      targetBot: selectedBot.value.id,
      sessionId: terminalSessionId.value,
      cols: terminalCols.value,
      rows: terminalRows.value
    }));
  }
}

function handleTerminalKeydown(event) {
  if (!terminalConnected.value || !terminalSessionId.value) return;
  
  let data = '';
  
  // Manejar teclas especiales
  if (event.key === 'Enter') {
    // Enviar el comando cuando se presiona Enter
    sendTerminalCommand();
    event.preventDefault();
    return;
  } else if (event.ctrlKey && event.key === 'c') {
    data = '\x03'; // Ctrl+C
    event.preventDefault();
  } else if (event.ctrlKey && event.key === 'd') {
    data = '\x04'; // Ctrl+D (EOF)
    event.preventDefault();
  } else if (event.key === 'Tab') {
    data = '\t';
    event.preventDefault();
  } else if (event.key === 'ArrowUp') {
    data = '\x1b[A';
    event.preventDefault();
  } else if (event.key === 'ArrowDown') {
    data = '\x1b[B';
    event.preventDefault();
  } else if (event.key === 'ArrowRight') {
    data = '\x1b[C';
    event.preventDefault();
  } else if (event.key === 'ArrowLeft') {
    data = '\x1b[D';
    event.preventDefault();
  }
  
  if (data && ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'pty_input',
      targetBot: selectedBot.value.id,
      sessionId: terminalSessionId.value,
      data: data
    }));
  }
}

function clearTerminal() {
  terminalLines.value = [];
}

function clearBotSession() {
  if (selectedBot.value) {
    const botId = selectedBot.value.id;
    
    // Eliminar sesión del bot
    botTerminalSessions.value.delete(botId);
    
    // Limpiar estado actual
    terminalSessionId.value = null;
    terminalConnected.value = false;
    terminalLines.value = [];
    terminalInput.value = '';
    
    console.log(`Sesión PTY limpiada para ${selectedBot.value.botName}`);
    
    // Agregar mensaje informativo
    terminalLines.value.push({
      data: `\x1b[31m[Sesión limpiada manualmente]\x1b[0m\r\n`,
      timestamp: new Date()
    });
  }
}

function hasActiveTerminalSession(bot) {
  // Verificar si el bot tiene una sesión PTY activa
  const session = botTerminalSessions.value.get(bot.id);
  return session && session.connected && session.sessionId;
}

function getTerminalStatusText() {
  if (!selectedBot.value) return 'Sin bot';
  
  // Verificar si el bot está conectado al servidor
  const isConnected = bots.value.some(bot => bot.id === selectedBot.value.id);
  if (!isConnected) return 'Bot desconectado';
  
  // Si tiene sesión PTY activa
  if (terminalConnected.value && terminalSessionId.value) {
    return 'Terminal activo';
  }
  
  // Bot conectado pero sin terminal
  return 'Listo para terminal';
}

function getTerminalStatusClass() {
  if (!selectedBot.value) return 'text-muted';
  
  // Verificar si el bot está conectado al servidor
  const isConnected = bots.value.some(bot => bot.id === selectedBot.value.id);
  if (!isConnected) return 'text-danger';
  
  // Si tiene sesión PTY activa
  if (terminalConnected.value && terminalSessionId.value) {
    return 'text-success';
  }
  
  // Bot conectado pero sin terminal
  return 'text-warning';
}

function isBotConnected() {
  if (!selectedBot.value) return false;
  return bots.value.some(bot => bot.id === selectedBot.value.id);
}

function toggleRawMode() {
  terminalRawMode.value = !terminalRawMode.value;
}

function sendTerminalCommand(directCommand = null) {
  if (!terminalConnected.value || !terminalSessionId.value) return;
  
  // Usar comando directo o el valor del input
  let command;
  if (directCommand) {
    command = directCommand + '\r';
  } else {
    if (!terminalInput.value.trim()) return;
    command = terminalInput.value + '\r';
    // Limpiar el input solo si se envía desde el input
    terminalInput.value = '';
  }
  
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'pty_input',
      targetBot: selectedBot.value.id,
      sessionId: terminalSessionId.value,
      data: command
    }));
  }
  scrollTerminalToBottom();
}

function listTerminalSessions() {
  if (!selectedBot.value) return;
  
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'pty_list',
      targetBot: selectedBot.value.id
    }));
  }
}

function disconnectTerminal() {
  if (terminalConnected.value && terminalSessionId.value) {
    killTerminalSession();
  }
}

function handlePtyMessage(data) {
  console.log('Mensaje recibido:', data);
  
  // Para pty_started, usamos el bot seleccionado
  if (data.type === 'pty_started') {
    const botId = selectedBot.value?.id;
    if (!botId) return;
    
    handlePtyStarted(data, botId);
    return;
  }
  
  // Para otros mensajes PTY, encontramos el bot usando sessionId
  const botId = sessionToBotMap.value.get(data.sessionId);
  if (!botId) {
    console.warn(`Ignorando mensaje ${data.type} de sesión desconocida: ${data.sessionId}`);
    return;
  }
  
  // Obtener la sesión del bot correspondiente
  const session = botTerminalSessions.value.get(botId);
  if (!session || session.sessionId !== data.sessionId) {
    console.warn(`Sesión desconocida para bot ${botId}: ${data.sessionId}`);
    return;
  }
  
  switch (data.type) {
    case 'pty_output':
      handlePtyOutput(data, botId);
      break;
      
    case 'pty_session_ended':
      handlePtySessionEnded(data, botId);
      break;
      
    case 'pty_sessions_list':
      // Este mensaje es del bot actualmente seleccionado
      const currentBotId = selectedBot.value?.id;
      if (currentBotId && currentBotId === botId) {
        handlePtySessionsList(data);
      }
      break;
      
    case 'pty_error':
      // Este mensaje es del bot actualmente seleccionado
      const errorBotId = selectedBot.value?.id;
      if (errorBotId && errorBotId === botId) {
        handlePtyError(data);
      }
      break;
      
    default:
      console.warn('Tipo de mensaje PTY desconocido:', data.type);
  }
}

function handlePtyStarted(data, botId) {
  // Solo actualizar UI si es el bot actualmente abierto en el modal
  const isCurrentBot = selectedBot.value?.id === botId;
  
  if (isCurrentBot) {
    terminalSessionId.value = data.sessionId;
    terminalConnected.value = true;
  }
  
  // Registrar sessionId -> botId para futuros mensajes
  sessionToBotMap.value.set(data.sessionId, botId);
  
  const startMessage = {
    data: `\x1b[32m[Sesión iniciada: ${data.sessionId}]\x1b[0m\r\n`,
    timestamp: new Date()
  };
  
  // Actualizar UI solo si es el bot actual
  if (isCurrentBot) {
    terminalLines.value.push(startMessage);
    scrollTerminalToBottom();
    
    // Focus terminal input
    setTimeout(() => {
      if (terminalInputField.value) {
        terminalInputField.value.focus();
      }
    }, 100);
  }
  
  // Siempre actualizar la sesión almacenada
  botTerminalSessions.value.set(botId, {
    sessionId: data.sessionId,
    connected: true,
    lines: isCurrentBot ? [...terminalLines.value] : [startMessage],
    createdAt: new Date()
  });
  
  console.log(`Sesión PTY iniciada para bot ${botId}: ${data.sessionId}`);
}

function handlePtyOutput(data, botId) {
  const session = botTerminalSessions.value.get(botId);
  if (!session) return;
  
  const outputMessage = {
    data: data.data,
    timestamp: new Date()
  };
  
  // Actualizar sesión almacenada
  const updatedLines = [...(session.lines || []), outputMessage];
  
  // Limitar líneas para performance
  if (updatedLines.length > 50) {
    updatedLines.splice(0, updatedLines.length - 20);
  }
  
  botTerminalSessions.value.set(botId, {
    ...session,
    lines: updatedLines,
    lastActivity: new Date()
  });
  
  // Solo actualizar UI si es el bot actualmente abierto
  const isCurrentBot = selectedBot.value?.id === botId && terminalSessionId.value === data.sessionId;
  if (isCurrentBot) {
    // Limitar líneas en UI para performance
    if (terminalLines.value.length > 50) {
      terminalLines.value = terminalLines.value.slice(-20);
    }
    
    terminalLines.value.push(outputMessage);
    scrollTerminalToBottom();
  }
  
  console.log(`Output PTY recibido para bot ${botId} (${session.lines?.length || 0} líneas total)`);
}

function handlePtySessionEnded(data, botId) {
  const session = botTerminalSessions.value.get(botId);
  if (!session) return;
  
  const endMessage = {
    data: `\x1b[31m[Sesión terminada: código ${data.exitCode || 'desconocido'}]\x1b[0m\r\n`,
    timestamp: new Date()
  };
  
  // Actualizar sesión almacenada
  const updatedLines = [...(session.lines || []), endMessage];
  botTerminalSessions.value.set(botId, {
    ...session,
    connected: false,
    lines: updatedLines,
    lastActivity: new Date()
  });
  
  // Limpiar mapeo de sessionId
  sessionToBotMap.value.delete(data.sessionId);
  
  // Solo actualizar UI si es el bot actualmente abierto
  const isCurrentBot = selectedBot.value?.id === botId && terminalSessionId.value === data.sessionId;
  if (isCurrentBot) {
    terminalLines.value.push(endMessage);
    terminalConnected.value = false;
    terminalSessionId.value = null;
    scrollTerminalToBottom();
  }
  
  console.log(`Sesión PTY terminada para bot ${botId}: ${data.sessionId}`);
}

function handlePtySessionsList(data) {
  const sessions = data.sessions || [];
  terminalLines.value.push({
    data: `\x1b[36m[Sesiones activas: ${sessions.length}]\x1b[0m\r\n`,
    timestamp: new Date()
  });
  sessions.forEach(session => {
    terminalLines.value.push({
      data: `\x1b[36m- ${session.sessionId}: ${session.command} (${Math.floor(session.uptime/1000)}s)\x1b[0m\r\n`,
      timestamp: new Date()
    });
  });
  scrollTerminalToBottom();
}

function handlePtyError(data) {
  terminalLines.value.push({
    data: `\x1b[31m[Error: ${data.error}]\x1b[0m\r\n`,
    timestamp: new Date()
  });
  scrollTerminalToBottom();
}

function executeCommand() {
  if (!currentCommand.value.trim() || commandExecuting.value || !selectedBot.value) {
    return;
  }
  
  const command = currentCommand.value.trim();
  
  // Add command to output
  consoleOutput.value.push({
    type: 'command',
    text: `${selectedBot.value.botName}@system:~$ ${command}`,
    timestamp: new Date()
  });
  
  // Send command to bot
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'system_command',
      targetBot: selectedBot.value.id,
      command: command,
      from: 'panel'
    }));
    
    commandExecuting.value = true;
    currentCommand.value = '';
    
    // Scroll to bottom
    scrollConsoleToBottom();
  } else {
    consoleOutput.value.push({
      type: 'error',
      text: 'Error: No hay conexión WebSocket',
      timestamp: new Date()
    });
  }
}

function handleCommandResponse(data) {
  if (data.success) {
    if (data.output) {
      consoleOutput.value.push({
        type: 'output',
        text: data.output,
        timestamp: new Date()
      });
    }
    if (data.error) {
      consoleOutput.value.push({
        type: 'error',
        text: data.error,
        timestamp: new Date()
      });
    }
  } else {
    consoleOutput.value.push({
      type: 'error',
      text: data.error || 'Error ejecutando comando',
      timestamp: new Date()
    });
  }
  
  commandExecuting.value = false;
  scrollConsoleToBottom();
  
  // Focus input again
  setTimeout(() => {
    if (consoleInput.value) {
      consoleInput.value.focus();
    }
  }, 100);
}

function clearConsole() {
  consoleOutput.value = [];
}

function scrollConsoleToBottom() {
  setTimeout(() => {
    const consoleOutputEl = document.querySelector('.console-output');
    if (consoleOutputEl) {
      consoleOutputEl.scrollTop = consoleOutputEl.scrollHeight;
    }
  }, 50);
}

function formatTerminalOutput(data) {
  // Validar que data sea una cadena de texto
  if (!data) return '';
  if (typeof data !== 'string') {
    // Si no es cadena, convertir a string
    data = String(data);
  }
  
  // Si está en modo raw, mostrar todo con mínimo procesamiento
  if (terminalRawMode.value) {
    return data
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\r\n/g, '<br>')
      .replace(/\n/g, '<br>')
      .replace(/\r/g, '<br>')
      .replace(/ /g, '&nbsp;');
  }
  
  // Primero escapar caracteres HTML
  let escaped = data
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  // Limpiar secuencias problemáticas ANTES de procesar colores
  let cleaned = escaped
    // Remover secuencias problemáticas específicas que vimos
    .replace(/\)07/g, '')
    .replace(/\\\)07=/g, '') 
    .replace(/\x1B\([0AB]\)/g, '')
    .replace(/\x1B=/g, '')
    .replace(/\x1B>/g, '')
    .replace(/\x1B\[?\d*[lh]/g, '') // modos del terminal
    .replace(/\x1B\[\?[\d;]*[lh]/g, '') // modos del terminal con parámetros
    .replace(/\x1B\[\d*[rR]/g, '') // configurar región de scroll
    .replace(/\x1B\[\d+;\d+r/g, '') // configurar región de scroll con parámetros
    .replace(/\x1B\]\d+;[^\x07\x1B]*(\x07|\x1B\\)/g, '') // comandos OSC
    .replace(/\x1B[PX^_][^\x1B]*\x1B\\/g, '') // secuencias DCS, PM, APC
    // Remover códigos de control de cursor complejos
    .replace(/\x1B\[\?\d+h/g, '') // activar modos
    .replace(/\x1B\[\?\d+l/g, '') // desactivar modos
    .replace(/\x1B\[[\d;]*[HfF]/g, '') // posición absoluta de cursor
    .replace(/\x1B\[\d*[ABCD]/g, '') // movimiento relativo de cursor
    .replace(/\x1B\[\d*[JK]/g, '') // borrar línea/pantalla
    .replace(/\x1B\[2J/g, '') // limpiar pantalla completa
    .replace(/\x1B\[H/g, '') // cursor al inicio
    .replace(/\x1B\[0?m/g, '</span>') // reset como cierre de span
    // Remover otros caracteres de control problemáticos
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Limpiar códigos específicos que siguen apareciendo
    .replace(/\[32m\[Sesión iniciada:[^\]]*\]/g, '<span style="color: #0DBC79;">[Sesión iniciada]</span>')
    .replace(/\[01;32m/g, '<span style="color: #23D18B; font-weight: bold;">')
    .replace(/\[00m/g, '</span>')
    .replace(/\[01;34m/g, '<span style="color: #3B8EEA; font-weight: bold;">');
  
  // Procesar SOLO códigos de color y estilos básicos
  let withColors = cleaned
    // Colores de texto estándar (30-37)
    .replace(/\x1B\[30m/g, '<span style="color: #666666;">') // negro -> gris oscuro
    .replace(/\x1B\[31m/g, '<span style="color: #CD3131;">') // rojo
    .replace(/\x1B\[32m/g, '<span style="color: #0DBC79;">') // verde
    .replace(/\x1B\[33m/g, '<span style="color: #E5E510;">') // amarillo
    .replace(/\x1B\[34m/g, '<span style="color: #2472C8;">') // azul
    .replace(/\x1B\[35m/g, '<span style="color: #BC3FBC;">') // magenta
    .replace(/\x1B\[36m/g, '<span style="color: #11A8CD;">') // cyan
    .replace(/\x1B\[37m/g, '<span style="color: #E5E5E5;">') // blanco
    
    // Colores brillantes (90-97)
    .replace(/\x1B\[90m/g, '<span style="color: #888888;">') // gris
    .replace(/\x1B\[91m/g, '<span style="color: #F14C4C;">') // rojo brillante
    .replace(/\x1B\[92m/g, '<span style="color: #23D18B;">') // verde brillante
    .replace(/\x1B\[93m/g, '<span style="color: #F5F543;">') // amarillo brillante
    .replace(/\x1B\[94m/g, '<span style="color: #3B8EEA;">') // azul brillante
    .replace(/\x1B\[95m/g, '<span style="color: #D670D6;">') // magenta brillante
    .replace(/\x1B\[96m/g, '<span style="color: #29B8DB;">') // cyan brillante
    .replace(/\x1B\[97m/g, '<span style="color: #FFFFFF;">') // blanco brillante
    
    // Estilos de texto básicos
    .replace(/\x1B\[1m/g, '<span style="font-weight: bold;">') // negrita
    .replace(/\x1B\[2m/g, '<span style="opacity: 0.6;">') // dim
    .replace(/\x1B\[4m/g, '<span style="text-decoration: underline;">') // subrayado
    
    // Códigos combinados comunes (negrita + color)
    .replace(/\x1B\[1;30m/g, '<span style="color: #888888; font-weight: bold;">') // negro negrita
    .replace(/\x1B\[1;31m/g, '<span style="color: #F14C4C; font-weight: bold;">') // rojo negrita
    .replace(/\x1B\[1;32m/g, '<span style="color: #23D18B; font-weight: bold;">') // verde negrita
    .replace(/\x1B\[1;33m/g, '<span style="color: #F5F543; font-weight: bold;">') // amarillo negrita
    .replace(/\x1B\[1;34m/g, '<span style="color: #3B8EEA; font-weight: bold;">') // azul negrita
    .replace(/\x1B\[1;35m/g, '<span style="color: #D670D6; font-weight: bold;">') // magenta negrita
    .replace(/\x1B\[1;36m/g, '<span style="color: #29B8DB; font-weight: bold;">') // cyan negrita
    .replace(/\x1B\[1;37m/g, '<span style="color: #FFFFFF; font-weight: bold;">') // blanco negrita
    
    // Códigos dim + color
    .replace(/\x1B\[2;30m/g, '<span style="color: #444444; opacity: 0.6;">') // negro dim
    .replace(/\x1B\[2;31m/g, '<span style="color: #CD3131; opacity: 0.6;">') // rojo dim
    .replace(/\x1B\[2;32m/g, '<span style="color: #0DBC79; opacity: 0.6;">') // verde dim
    .replace(/\x1B\[2;33m/g, '<span style="color: #E5E510; opacity: 0.6;">') // amarillo dim
    .replace(/\x1B\[2;34m/g, '<span style="color: #2472C8; opacity: 0.6;">') // azul dim
    .replace(/\x1B\[2;35m/g, '<span style="color: #BC3FBC; opacity: 0.6;">') // magenta dim
    .replace(/\x1B\[2;36m/g, '<span style="color: #11A8CD; opacity: 0.6;">') // cyan dim
    .replace(/\x1B\[2;37m/g, '<span style="color: #E5E5E5; opacity: 0.6;">'); // blanco dim
  
  // ÚLTIMA LIMPIEZA: remover cualquier secuencia ANSI que quede
  let finalCleaned = withColors
    .replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '') // cualquier secuencia ANSI restante
    .replace(/\x1B\[[?!>][0-9;]*[a-zA-Z]/g, '') // secuencias con prefijos especiales
    .replace(/\x1B[^[]./g, '') // secuencias que no empiecen con [
    .replace(/\x1B/g, '') // cualquier ESC restante
    // Limpiar códigos específicos remanentes sin el caracter de escape
    .replace(/\[32m/g, '<span style="color: #0DBC79;">')
    .replace(/\[01;32m/g, '<span style="color: #23D18B; font-weight: bold;">')
    .replace(/\[00m/g, '</span>')
    .replace(/\[01;34m/g, '<span style="color: #3B8EEA; font-weight: bold;">')
    .replace(/\[\d+;\d+m/g, '') // cualquier código de color restante
    .replace(/\[\d+m/g, ''); // cualquier código simple restante
  
  // Convertir espacios y saltos de línea para HTML
  let processed = finalCleaned
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n/g, '<br>')
    .replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;')
    .replace(/  /g, '&nbsp;&nbsp;');
  
  return processed;
}

function scrollTerminalToBottom() {
  setTimeout(() => {
    if (terminalOutput.value) {
      terminalOutput.value.scrollTop = terminalOutput.value.scrollHeight;
    }
  }, 50);
}

onUnmounted(() => {
  if (ws) ws.close();
  
  // Limpiar listeners
  window.removeEventListener('resize', resizeTerminal);
});
</script>

<style scoped>
.border-left-primary {
  border-left: 4px solid #007bff !important;
}

.border-left-info {
  border-left: 4px solid #17a2b8 !important;
}

.card {
  transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.navbar-brand {
  font-weight: 600;
}

.badge {
  font-size: 0.9em;
}

.btn {
  transition: all 0.2s ease-in-out;
}

.fs-1 {
  opacity: 0.8;
}

code {
  font-size: 0.9em;
  padding: 2px 6px;
  border-radius: 4px;
  background-color: rgba(0,123,255,0.1);
}

/* Console styles */
.console-container {
  border: 1px solid #30363d;
  border-radius: 6px;
}

.console-output {
  background-color: #0d1117 !important;
}

.console-line {
  margin-bottom: 2px;
  white-space: pre-wrap;
  word-break: break-all;
}

.console-input-field {
  background-color: #161b22 !important;
  border-color: #30363d !important;
  color: #f0f6fc !important;
}

.console-input-field:focus {
  background-color: #161b22 !important;
  border-color: #58a6ff !important;
  color: #f0f6fc !important;
  box-shadow: 0 0 0 0.25rem rgba(88, 166, 255, 0.25);
}

.console-input-field::placeholder {
  color: #7d8590;
}

/* Custom scrollbar for console */
.console-output::-webkit-scrollbar {
  width: 8px;
}

.console-output::-webkit-scrollbar-track {
  background: #21262d;
}

.console-output::-webkit-scrollbar-thumb {
  background: #30363d;
  border-radius: 4px;
}

.console-output::-webkit-scrollbar-thumb:hover {
  background: #484f58;
}

/* Terminal PTY styles */
.terminal-container {
  border: 1px solid #30363d;
  border-radius: 6px;
}

.terminal-toolbar {
  border-bottom: 1px solid #30363d;
}

.terminal-output {
  background-color: #0d1117 !important;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace !important;
  font-size: 13px;
  line-height: 1.2;
  overflow-wrap: anywhere;
  word-break: normal;
  max-height: 400px;
  overflow-y: auto;
}

.terminal-line {
  margin-bottom: 1px;
  line-height: 1.2;
  white-space: pre-wrap;  /* Preservar espacios con wrapping cuando sea necesario */
  word-wrap: break-word;
  overflow-wrap: anywhere;
  display: block;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
}

/* Estilos específicos para el terminal PTY */
#terminal-content {
  scrollbar-width: thin;
  scrollbar-color: #666 #0d1117;
  /* Permitir scroll horizontal para contenido muy ancho */
  overflow-x: auto;
  overflow-y: auto;
}

/* Manejar líneas muy largas */
#terminal-content div {
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow-wrap: anywhere;
  /* Permitir que las líneas largas se ajusten */
  max-width: 100%;
}

#terminal-content::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

#terminal-content::-webkit-scrollbar-track {
  background: #0d1117;
}

#terminal-content::-webkit-scrollbar-thumb {
  background: #666;
  border-radius: 4px;
}

#terminal-content::-webkit-scrollbar-thumb:hover {
  background: #888;
}

.terminal-input-field {
  background-color: #161b22 !important;
  border-color: #30363d !important;
  color: #f0f6fc !important;
  font-family: 'Courier New', monospace !important;
}

.terminal-input-field:focus {
  background-color: #161b22 !important;
  border-color: #58a6ff !important;
  color: #f0f6fc !important;
  box-shadow: 0 0 0 0.25rem rgba(88, 166, 255, 0.25);
}

.terminal-input-field::placeholder {
  color: #7d8590;
}

/* Terminal scrollbar */
.terminal-output::-webkit-scrollbar {
  width: 8px;
}

.terminal-output::-webkit-scrollbar-track {
  background: #21262d;
}

.terminal-output::-webkit-scrollbar-thumb {
  background: #30363d;
  border-radius: 4px;
}

.terminal-output::-webkit-scrollbar-thumb:hover {
  background: #484f58;
}
</style>

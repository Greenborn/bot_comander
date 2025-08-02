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
                              class="btn btn-sm btn-outline-success"
                              @click="openConsole(bot)"
                              data-bs-toggle="modal" 
                              data-bs-target="#consoleModal"
                            >
                              <i class="bi bi-terminal"></i>
                              Consola
                            </button>
                            <button 
                              class="btn btn-sm btn-outline-info"
                              @click="openTerminal(bot)"
                              data-bs-toggle="modal" 
                              data-bs-target="#terminalModal"
                            >
                              <i class="bi bi-window-desktop"></i>
                              Terminal
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
            <div class="console-container" style="height: 400px; background-color: #0d1117;">
              <div class="console-output p-3" style="height: 350px; overflow-y: auto; font-family: 'Courier New', monospace; font-size: 14px;">
                <div v-for="(line, index) in consoleOutput" :key="index" class="console-line">
                  <span :class="line.type === 'command' ? 'text-info' : line.type === 'error' ? 'text-danger' : 'text-light'">
                    {{ line.text }}
                  </span>
                </div>
                <div v-if="consoleOutput.length === 0" class="text-muted">
                  Consola lista. Escribe un comando y presiona Enter.
                </div>
              </div>
              <div class="console-input border-top border-secondary p-2" style="background-color: #161b22;">
                <div class="input-group">
                  <span class="input-group-text bg-dark text-info border-secondary">
                    {{ selectedBot?.botName || 'bot' }}@system:~$
                  </span>
                  <input 
                    type="text" 
                    class="form-control bg-dark text-light border-secondary console-input-field"
                    placeholder="Escribe un comando..."
                    v-model="currentCommand"
                    @keyup.enter="executeCommand"
                    :disabled="commandExecuting"
                    ref="consoleInput"
                  >
                  <button 
                    class="btn btn-outline-success" 
                    @click="executeCommand"
                    :disabled="commandExecuting || !currentCommand.trim()"
                  >
                    <span v-if="commandExecuting" class="spinner-border spinner-border-sm me-1"></span>
                    <i v-else class="bi bi-play-fill"></i>
                    {{ commandExecuting ? 'Ejecutando...' : 'Ejecutar' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer border-secondary">
            <button type="button" class="btn btn-outline-secondary" @click="clearConsole">
              <i class="bi bi-trash"></i>
              Limpiar
            </button>
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Terminal PTY Modal -->
    <div class="modal fade" id="terminalModal" tabindex="-1" aria-labelledby="terminalModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-xl">
        <div class="modal-content bg-dark text-light">
          <div class="modal-header border-secondary">
            <h5 class="modal-title" id="terminalModalLabel">
              <i class="bi bi-window-desktop"></i>
              Terminal Interactivo - {{ selectedBot?.botName || 'Bot' }}
              <span v-if="terminalSessionId" class="badge bg-success ms-2">{{ terminalSessionId.slice(-8) }}</span>
            </h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body p-0">
            <div class="terminal-container" style="height: 500px; background-color: #0d1117;">
              <!-- Terminal Toolbar -->
              <div class="terminal-toolbar bg-secondary p-2 d-flex justify-content-between align-items-center">
                <div class="d-flex gap-2">
                  <button 
                    class="btn btn-sm btn-success" 
                    @click="startTerminalSession"
                    :disabled="terminalConnected"
                  >
                    <i class="bi bi-play-fill"></i>
                    {{ terminalConnected ? 'Conectado' : 'Conectar' }}
                  </button>
                  <button 
                    class="btn btn-sm btn-warning" 
                    @click="killTerminalSession"
                    :disabled="!terminalConnected"
                  >
                    <i class="bi bi-stop-fill"></i>
                    Desconectar
                  </button>
                  <button 
                    class="btn btn-sm btn-outline-light" 
                    @click="clearTerminal"
                  >
                    <i class="bi bi-trash"></i>
                    Limpiar
                  </button>
                  <button 
                    class="btn btn-sm btn-outline-info" 
                    @click="toggleRawMode"
                    :class="{ 'btn-info': terminalRawMode, 'btn-outline-info': !terminalRawMode }"
                  >
                    <i class="bi bi-code"></i>
                    {{ terminalRawMode ? 'Normal' : 'Raw' }}
                  </button>
                </div>
                <div class="d-flex gap-2 align-items-center">
                  <small class="text-light">Tamaño:</small>
                  <input 
                    type="number" 
                    class="form-control form-control-sm" 
                    style="width: 70px;" 
                    v-model="terminalCols" 
                    min="40" 
                    max="200"
                    @change="resizeTerminal"
                  >
                  <small class="text-light">x</small>
                  <input 
                    type="number" 
                    class="form-control form-control-sm" 
                    style="width: 70px;" 
                    v-model="terminalRows" 
                    min="10" 
                    max="50"
                    @change="resizeTerminal"
                  >
                </div>
              </div>
              
              <!-- Terminal Output -->
              <div 
                class="terminal-output p-3" 
                :style="{
                  height: '400px', 
                  overflowY: 'auto', 
                  fontFamily: 'Courier New, monospace', 
                  fontSize: '14px',
                  lineHeight: '1.2'
                }"
                ref="terminalOutput"
              >
                <div v-if="terminalLines.length === 0 && !terminalConnected" class="text-muted">
                  Terminal interactivo. Haz clic en "Conectar" para iniciar una sesión.
                </div>
                <div v-else-if="terminalLines.length === 0 && terminalConnected" class="text-info">
                  Iniciando sesión de terminal...
                </div>
                <div v-for="(line, index) in terminalLines" :key="index" class="terminal-line">
                  <span 
                    :class="{
                      'text-light': !line.isCommand,
                      'text-success': line.isCommand,
                      'fw-bold': line.isCommand
                    }" 
                    v-html="line.isCommand ? line.data : formatTerminalOutput(line.data)"
                  ></span>
                </div>
              </div>
              
              <!-- Terminal Input -->
              <div class="terminal-input border-top border-secondary p-2" style="background-color: #161b22;">
                <div class="input-group">
                  <span class="input-group-text bg-dark text-success border-secondary">
                    <i class="bi bi-chevron-right"></i>
                  </span>
                  <input 
                    type="text" 
                    class="form-control bg-dark text-light border-secondary terminal-input-field"
                    placeholder="Escribe comandos directamente..."
                    v-model="terminalInput"
                    @keydown="handleTerminalKeydown"
                    @keyup.enter="sendTerminalCommand"
                    :disabled="!terminalConnected"
                    ref="terminalInputField"
                  >
                </div>
                <small class="text-muted mt-1 d-block">
                  Usa Enter para nueva línea, Ctrl+C para interrumpir, Ctrl+D para EOF
                </small>
              </div>
            </div>
          </div>
          <div class="modal-footer border-secondary">
            <button type="button" class="btn btn-outline-info" @click="listTerminalSessions">
              <i class="bi bi-list"></i>
              Listar Sesiones
            </button>
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" @click="disconnectTerminal">
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

// Terminal PTY related variables
const terminalSessionId = ref(null);
const terminalConnected = ref(false);
const terminalLines = ref([]);
const terminalInput = ref('');
const terminalCols = ref(80);
const terminalRows = ref(24);
const terminalRawMode = ref(false);
const terminalInputField = ref(null);
const terminalOutput = ref(null);

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

// Console functions
function openConsole(bot) {
  selectedBot.value = bot;
  consoleOutput.value = [];
  currentCommand.value = '';
  commandExecuting.value = false;
  
  // Focus input after modal is shown
  setTimeout(() => {
    if (consoleInput.value) {
      consoleInput.value.focus();
    }
  }, 500);
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

// Terminal PTY functions
function openTerminal(bot) {
  selectedBot.value = bot;
  terminalSessionId.value = null;
  terminalConnected.value = false;
  terminalLines.value = [];
  terminalInput.value = '';
  
  // Focus input after modal is shown
  setTimeout(() => {
    if (terminalInputField.value) {
      terminalInputField.value.focus();
    }
  }, 500);
}

function startTerminalSession() {
  if (!selectedBot.value || terminalConnected.value) return;
  
  const requestId = `pty_req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
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
  
  // Solo manejar teclas especiales, NO enviar caracteres normales
  if (event.key === 'Enter') {
    // El Enter se maneja en sendTerminalCommand
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
  // NO enviar caracteres normales ni backspace aquí
  
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

function toggleRawMode() {
  terminalRawMode.value = !terminalRawMode.value;
}

function sendTerminalCommand() {
  if (!terminalConnected.value || !terminalSessionId.value || !terminalInput.value.trim()) return;
  
  // Mostrar el comando en la vista del terminal
  terminalLines.value.push({
    data: `$ ${terminalInput.value}`,
    timestamp: new Date(),
    isCommand: true
  });
  
  // Enviar el comando completo al bot
  const command = terminalInput.value + '\r';
  
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'pty_input',
      targetBot: selectedBot.value.id,
      sessionId: terminalSessionId.value,
      data: command
    }));
  }
  
  // Limpiar el input
  terminalInput.value = '';
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
  switch (data.type) {
    case 'pty_started':
      terminalSessionId.value = data.sessionId;
      terminalConnected.value = true;
      terminalLines.value.push({
        data: `\x1b[32m[Sesión iniciada: ${data.sessionId}]\x1b[0m\r\n`,
        timestamp: new Date()
      });
      scrollTerminalToBottom();
      
      // Focus terminal input
      setTimeout(() => {
        if (terminalInputField.value) {
          terminalInputField.value.focus();
        }
      }, 100);
      break;
      
    case 'pty_output':
      if (data.sessionId === terminalSessionId.value) {
        // Para aplicaciones interactivas como htop, implementar estrategia más agresiva
        let processedData = data.data;
        
        // Si hay demasiadas líneas, limpiar más agresivamente
        if (terminalLines.value.length > 50) {
          terminalLines.value = terminalLines.value.slice(-20);
        }
        
        // Para htop y aplicaciones similares, combinar datos más agresivamente
        if (processedData.length < 200 && terminalLines.value.length > 0) {
          const lastLine = terminalLines.value[terminalLines.value.length - 1];
          const timeDiff = new Date() - lastLine.timestamp;
          
          // Si es muy reciente (menos de 200ms), combinarlo
          if (timeDiff < 200) {
            lastLine.data += processedData;
            lastLine.timestamp = new Date();
            
            // Si la línea combinada es muy larga, crear nueva línea
            if (lastLine.data.length > 1000) {
              terminalLines.value.push({
                data: processedData,
                timestamp: new Date()
              });
            }
            
            scrollTerminalToBottom();
            break;
          }
        }
        
        terminalLines.value.push({
          data: processedData,
          timestamp: new Date()
        });
        scrollTerminalToBottom();
      }
      break;
      
    case 'pty_session_ended':
      if (data.sessionId === terminalSessionId.value) {
        terminalConnected.value = false;
        terminalLines.value.push({
          data: `\x1b[31m[Sesión terminada: código ${data.exitCode}]\x1b[0m\r\n`,
          timestamp: new Date()
        });
        scrollTerminalToBottom();
        terminalSessionId.value = null;
      }
      break;
      
    case 'pty_sessions_list':
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
      break;
      
    case 'pty_error':
      terminalLines.value.push({
        data: `\x1b[31m[Error: ${data.error}]\x1b[0m\r\n`,
        timestamp: new Date()
      });
      scrollTerminalToBottom();
      break;
  }
}

function formatTerminalOutput(data) {
  if (!data) return '';
  
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
  
  // Función más agresiva para limpiar códigos ANSI problemáticos
  let cleaned = data
    // Remover TODAS las secuencias de escape complejas
    .replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '')
    // Remover secuencias con parámetros opcionales
    .replace(/\x1B\[[?!>][0-9;]*[a-zA-Z]/g, '')
    // Remover secuencias de título de ventana y comandos OSC
    .replace(/\x1B\][0-9];[^\x07\x1B]*(\x07|\x1B\\)/g, '')
    // Remover secuencias DCS, PM, APC
    .replace(/\x1B[PX^_][^\x1B]*\x1B\\/g, '')
    // Remover secuencias problemáticas específicas
    .replace(/\\\)07=/g, '')
    .replace(/\x1B\([0AB]\)/g, '')
    .replace(/\x1B=/g, '')
    .replace(/\x1B>/g, '')
    // Remover caracteres de control C0 y C1 más agresivamente
    .replace(/[\x00-\x1F\x7F-\x9F]/g, (match) => {
      // Preservar solo algunos caracteres importantes
      if (match === '\n' || match === '\r' || match === '\t' || match === ' ') {
        return match;
      }
      return '';
    })
    // Limpiar múltiples espacios y caracteres raros
    .replace(/\s{3,}/g, '  ')
    .replace(/[^\x20-\x7E\n\r\t]/g, '');
  
  // Convertir a formato más limpio para web
  let processed = cleaned
    // Convertir espacios y saltos de línea para HTML
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n/g, '<br>')
    .replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;')
    .replace(/  /g, '&nbsp;&nbsp;'); // Solo espacios dobles para preservar formato
  
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
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow-wrap: anywhere;
  display: block;
  max-width: 100%;
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

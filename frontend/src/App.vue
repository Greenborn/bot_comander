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
                style="height: 350px; overflow-y: auto; font-family: 'Courier New', monospace; font-size: 14px; white-space: pre-wrap;"
                ref="terminalOutput"
              >
                <div v-for="(line, index) in terminalLines" :key="index" v-html="formatTerminalOutput(line.data || line)"></div>
                <div v-if="terminalLines.length === 0" class="text-muted">
                  Terminal listo. Conectando...
                </div>
              </div>
              <div class="terminal-input border-top border-secondary p-2" style="background-color: #161b22;">
                <div class="input-group">
                  <span class="input-group-text bg-dark text-success border-secondary">
                    <i class="bi bi-terminal"></i>
                    {{ terminalConnected ? 'Conectado' : 'Desconectado' }}
                  </span>
                  <input 
                    type="text" 
                    class="form-control bg-dark text-light border-secondary terminal-input-field"
                    placeholder="Escribe en la terminal..."
                    @keydown="handleTerminalKeydown"
                    :disabled="!terminalConnected"
                    ref="terminalInput"
                  >
                  <button 
                    class="btn btn-outline-success" 
                    @click="startTerminalSession"
                    v-if="!terminalConnected"
                  >
                    <i class="bi bi-play-circle"></i>
                    Conectar
                  </button>
                  <button 
                    class="btn btn-outline-danger" 
                    @click="stopTerminalSession"
                    v-else
                  >
                    <i class="bi bi-stop-circle"></i>
                    Desconectar
                  </button>
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
                :disabled="!terminalConnected"
                title="Limpiar pantalla"
              >
                <i class="bi bi-eraser"></i>
                Clear
              </button>
              <button 
                type="button" 
                class="btn btn-outline-info" 
                @click="sendTerminalCommand('exit')"
                :disabled="!terminalConnected"
                title="Salir"
              >
                <i class="bi bi-box-arrow-right"></i>
                Exit
              </button>
            </div>
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

// Console functions - ahora con PTY
function openConsole(bot) {
  selectedBot.value = bot;
  
  // Inicializar PTY
  terminalSessionId.value = null;
  terminalConnected.value = false;
  terminalLines.value = [];
  terminalInput.value = '';
  
  // Focus input after modal is shown
  setTimeout(() => {
    if (consoleInput.value) {
      consoleInput.value.focus();
    }
  }, 500);
}

// PTY functions para el modal de consola
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
        let processedData = data.data;
        
        // Limitar número de líneas para performance
        if (terminalLines.value.length > 50) {
          terminalLines.value = terminalLines.value.slice(-20);
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

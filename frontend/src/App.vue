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
</style>

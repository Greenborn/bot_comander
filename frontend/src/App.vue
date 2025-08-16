<template>
  <div class="container-fluid">
    <!-- Login Form como componente -->
    <LoginForm
      v-if="!isAuthenticated"
      :loginForm="loginForm"
      :isLoggingIn="isLoggingIn"
      :loginError="loginError"
      :login="login"
    />

    <!-- Main Dashboard (only shown when authenticated) -->
    <div v-else>
      <!-- HeaderNav como componente -->
      <HeaderNav
        :stats="stats"
        :connectionStatus="connectionStatus"
        :currentUser="currentUser"
        @logout="logout"
      />

    <!-- Main Content -->
    <div class="container">
      <div class="row">
        <div class="col-12">
          <!-- Stats Cards -->
          <StatsCard :stats="stats" :connectionStatus="connectionStatus" />

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
                      <BotCard 
                        :bot="{ ...bot, hasActiveTerminalSession: hasActiveTerminalSession(bot) }"
                        @details="openBotDetails"
                        @commands="() => {}"
                        @console="openConsole"
                        @data="openBotDataModal"
                        @send-zip="openSendZipModal"
                      />
                      <BotDetails 
                        :show="showBotDetailsModal" 
                        :bot="botDetailsTarget" 
                        @close="closeBotDetailsModal" 
                      />
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

    <!-- Console Modal migrado a BotConsoleModal.vue -->
    <BotConsoleModal
      v-if="selectedBotForConsole"
      :selectedBotForConsole="selectedBotForConsole"
      :terminalLines="terminalLines"
      :terminalConnected="terminalConnected"
      :terminalInputField="terminalInputField"
      :getTerminalStatusClass="getTerminalStatusClass"
      :getTerminalStatusText="getTerminalStatusText"
      :isBotConnected="isBotConnected"
      :handleTerminalKeydown="handleTerminalKeydown"
      :startTerminalSession="startTerminalSession"
      :stopTerminalSession="disconnectTerminal"
      :clearTerminal="clearTerminal"
      :sendTerminalCommand="sendTerminalCommand"
      :clearBotSession="clearBotSession"
      @close="selectedBotForConsole = null"
    />
  </div>

  <!-- Modal para Datos de Bot migrado a BotDataQuery.vue -->
  <BotDataQuery v-if="selectedBotForData" :bot="selectedBotForData" @close="selectedBotForData = null" />

  <!-- Modal para Enviar ZIP -->
  <SendZipModal
    :show="showSendZipModal"
    :bot="zipTargetBot"
    :sendingZip="sendingZip"
    :zipSendError="zipSendError"
    :zipSendSuccess="zipSendSuccess"
    :selectedZipFile="selectedZipFile"
    @close="closeSendZipModal"
    @select-zip="selectedZipFile = $event; zipSendError = ''"
    @zip-error="zipSendError = $event"
    @send-zip="handleSendZip"
  />
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import BotDetails from './BotDetails.vue';
import BotCard from './BotCard.vue';
import SendZipModal from './SendZipModal.vue';
import BotDataQuery from './BotDataQuery.vue';
import BotConsoleModal from './BotConsoleModal.vue';
import LoginForm from './LoginForm.vue';
import HeaderNav from './HeaderNav.vue';
import StatsCard from './StatsCard.vue';

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
const selectedBotForConsole = ref(null);
const selectedBotForData = ref(null);
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

// Variables para envío de ZIP
const showSendZipModal = ref(false);
const zipTargetBot = ref(null);
const selectedZipFile = ref(null);
const sendingZip = ref(false);
const zipSendError = ref('');
const zipSendSuccess = ref(false);

function openSendZipModal(bot) {
  zipTargetBot.value = bot;
  showSendZipModal.value = true;
  selectedZipFile.value = null;
  sendingZip.value = false;
  zipSendError.value = '';
  zipSendSuccess.value = false;
}

function closeSendZipModal() {
  showSendZipModal.value = false;
  zipTargetBot.value = null;
  selectedZipFile.value = null;
  sendingZip.value = false;
  zipSendError.value = '';
  zipSendSuccess.value = false;
}

function onZipFileChange(event) {
  const file = event.target.files[0];
  if (file && file.name.endsWith('.zip')) {
    selectedZipFile.value = file;
    zipSendError.value = '';
  } else {
    selectedZipFile.value = null;
    zipSendError.value = 'Solo se permiten archivos .zip.';
  }
}

async function handleSendZip() {
  if (!selectedZipFile.value || !zipTargetBot.value) return;
  sendingZip.value = true;
  zipSendError.value = '';
  zipSendSuccess.value = false;
  try {
    const formData = new FormData();
    formData.append('zip', selectedZipFile.value);
    formData.append('botId', zipTargetBot.value.id);
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/send-zip`, {
      method: 'POST',
      body: formData,
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    });
    if (response.ok) {
      zipSendSuccess.value = true;
      zipSendError.value = '';
    } else {
      const data = await response.json();
      zipSendError.value = data.error || 'Error al enviar el archivo ZIP.';
    }
  } catch (error) {
    zipSendError.value = 'Error de red o servidor.';
  } finally {
    sendingZip.value = false;
  }
}

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
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/verify-token`, {
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
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/login`, {
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
  selectedBotForConsole.value = bot;
  
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
  if (!selectedBotForConsole.value || terminalConnected.value) return;
  
  // Calcular dimensiones automáticamente
  const dimensions = calculateTerminalDimensions();
  terminalCols.value = dimensions.cols;
  terminalRows.value = dimensions.rows;
  
  const requestId = `pty_req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`Iniciando terminal PTY con dimensiones: ${dimensions.cols}x${dimensions.rows}`);
  
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'pty_start',
      targetBot: selectedBotForConsole.value.id,
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
      targetBot: selectedBotForConsole.value.id,
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
      targetBot: selectedBotForConsole.value.id,
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
      targetBot: selectedBotForConsole.value.id,
      sessionId: terminalSessionId.value,
      data: data
    }));
  }
}

function clearTerminal() {
  terminalLines.value = [];
}

function clearBotSession() {
  if (selectedBotForConsole.value) {
    const botId = selectedBotForConsole.value.id;
    
    // Eliminar sesión del bot
    botTerminalSessions.value.delete(botId);
    
    // Limpiar estado actual
    terminalSessionId.value = null;
    terminalConnected.value = false;
    terminalLines.value = [];
    terminalInput.value = '';
    
    console.log(`Sesión PTY limpiada para ${selectedBotForConsole.value.botName}`);
    
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
  if (!selectedBotForConsole.value) return 'Sin bot';
  
  // Verificar si el bot está conectado al servidor
  const isConnected = bots.value.some(bot => bot.id === selectedBotForConsole.value.id);
  if (!isConnected) return 'Bot desconectado';
  
  // Si tiene sesión PTY activa
  if (terminalConnected.value && terminalSessionId.value) {
    return 'Terminal activo';
  }
  
  // Bot conectado pero sin terminal
  return 'Listo para terminal';
}

function getTerminalStatusClass() {
  if (!selectedBotForConsole.value) return 'text-muted';
  
  // Verificar si el bot está conectado al servidor
  const isConnected = bots.value.some(bot => bot.id === selectedBotForConsole.value.id);
  if (!isConnected) return 'text-danger';
  
  // Si tiene sesión PTY activa
  if (terminalConnected.value && terminalSessionId.value) {
    return 'text-success';
  }
  
  // Bot conectado pero sin terminal
  return 'text-warning';
}

function isBotConnected() {
  if (!selectedBotForConsole.value) return false;
  return bots.value.some(bot => bot.id === selectedBotForConsole.value.id);
}

function toggleRawMode() {
  terminalRawMode.value = !terminalRawMode.value;
}

function sendTerminalCommand(directCommand = null) {
  console.log('[sendTerminalCommand] Comando recibido:', directCommand);
  if (!terminalConnected.value || !terminalSessionId.value) return;
  let command;
  if (directCommand !== null && typeof directCommand === 'string') {
    if (!directCommand.trim()) return;
    command = directCommand + '\r';
    // Limpiar el input solo si el comando vino del input
    terminalInput.value = '';
  } else if (terminalInput.value && terminalInput.value.trim()) {
    command = terminalInput.value + '\r';
    terminalInput.value = '';
  } else {
    return;
  }
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'pty_input',
      targetBot: selectedBotForConsole.value.id,
      sessionId: terminalSessionId.value,
      data: command
    }));
  }
  scrollTerminalToBottom();
}

function listTerminalSessions() {
  if (!selectedBotForConsole.value) return;
  
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'pty_list',
      targetBot: selectedBotForConsole.value.id
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
    const botId = selectedBotForConsole.value?.id;
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
      const currentBotId = selectedBotForConsole.value?.id;
      if (currentBotId && currentBotId === botId) {
        handlePtySessionsList(data);
      }
      break;
      
    case 'pty_error':
      // Este mensaje es del bot actualmente seleccionado
      const errorBotId = selectedBotForConsole.value?.id;
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
  const isCurrentBot = selectedBotForConsole.value?.id === botId;
  
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
  const isCurrentBot = selectedBotForConsole.value?.id === botId && terminalSessionId.value === data.sessionId;
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
  const isCurrentBot = selectedBotForConsole.value?.id === botId && terminalSessionId.value === data.sessionId;
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
  if (!currentCommand.value.trim() || commandExecuting.value || !selectedBotForConsole.value) {
    return;
  }
  
  const command = currentCommand.value.trim();
  
  // Add command to output
  consoleOutput.value.push({
    type: 'command',
    text: `${selectedBotForConsole.value.botName}@system:~$ ${command}`,
    timestamp: new Date()
  });
  
  // Send command to bot
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'system_command',
      targetBot: selectedBotForConsole.value.id,
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



function scrollTerminalToBottom() {
  setTimeout(() => {
    if (terminalOutput.value) {
      terminalOutput.value.scrollTop = terminalOutput.value.scrollHeight;
    }
  }, 50);
}

// Función para abrir el modal de datos del bot (ahora delega al componente BotDataQuery)
function openBotDataModal(bot) {
  selectedBotForData.value = bot;
}

onUnmounted(() => {
  if (ws) ws.close();
  
  // Limpiar listeners
  window.removeEventListener('resize', resizeTerminal);
});


// Variables y métodos para el modal de detalles del bot
const showBotDetailsModal = ref(false);
const botDetailsTarget = ref(null);

function openBotDetails(bot) {
  botDetailsTarget.value = bot;
  showBotDetailsModal.value = true;
}

function closeBotDetailsModal() {
  showBotDetailsModal.value = false;
  botDetailsTarget.value = null;
}
</script>

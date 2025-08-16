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
      :formatTerminalOutput="formatTerminalOutput"
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
    .replace(/\x1B\[\?[\d;]*[lh]/g, '') // modos del terminal
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

code {
  font-size: 0.9em;
  padding: 2px 6px;
  border-radius: 4px;
  background-color: rgba(0,123,255,0.1);
}


/* Estilos para modales de datos de bots */
.bot-data-files .file-item {
  transition: all 0.2s ease;
}

.bot-data-files .file-item:hover {
  background-color: #f8f9fa;
  border-color: #007bff !important;
  transform: translateX(5px);
}

.data-entry {
  transition: all 0.2s ease;
}

.data-entry:hover {
  background-color: #f8f9fa;
}

.data-viewer {
  font-family: 'Courier New', monospace;
}

.json-viewer pre {
  font-size: 0.9rem;
  line-height: 1.4;
}

/* Animaciones para badges */
.badge {
  transition: all 0.2s ease;
}

.badge:hover {
  transform: scale(1.05);
}

/* Mejora para botones pequeños */
.btn-sm {
  transition: all 0.2s ease;
}

.btn-sm:hover {
  transform: translateY(-1px);
}
</style>

<template>
  <div v-if="selectedBotForConsole" class="modal-backdrop" style="z-index: 1050;"></div>
  <div v-if="selectedBotForConsole" class="modal show d-block" tabindex="-1" aria-labelledby="consoleModalLabel" aria-modal="true" role="dialog" style="z-index: 1060;">
    <div class="modal-dialog modal-lg">
      <div class="modal-content bg-dark text-light">
        <div class="modal-header border-secondary">
          <h5 class="modal-title" id="consoleModalLabel">
            <i class="bi bi-terminal"></i>
            Consola - {{ selectedBotForConsole?.botName || 'Bot' }}
          </h5>
          <button type="button" class="btn-close btn-close-white" @click="$emit('close')" aria-label="Close"></button>
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
                  v-model="localInput"
                  @keydown="onKeydown"
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
              @click="() => sendTerminalCommand('clear')"
              :disabled="!terminalConnected || !isBotConnected()"
              title="Limpiar pantalla"
            >
              <i class="bi bi-eraser"></i>
              Clear
            </button>
            <button 
              type="button" 
              class="btn btn-outline-info" 
              @click="() => sendTerminalCommand('exit')"
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
          <button type="button" class="btn btn-secondary" @click="$emit('close')">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
function onKeydown(event) {
  if (event.key === 'Enter') {
    const valueToSend = localInput.value;
    // Enviar comando con el valor actual del input
    if (typeof props.sendTerminalCommand === 'function') {
      props.sendTerminalCommand(valueToSend);
    }
  // Limpiar el input local DESPUÉS de enviar
  localInput.value = '';
    event.preventDefault();
    return;
  }
  // Delegar otras teclas al handler original si existe
  if (typeof props.handleTerminalKeydown === 'function') {
    props.handleTerminalKeydown(event);
  }
}
import { ref } from 'vue';
const props = defineProps({
  selectedBotForConsole: Object,
  terminalLines: Array,
  terminalConnected: Boolean,
  terminalInputField: Object,
  getTerminalStatusClass: Function,
  getTerminalStatusText: Function,
  isBotConnected: Function,
  formatTerminalOutput: Function,
  handleTerminalKeydown: Function,
  startTerminalSession: Function,
  stopTerminalSession: Function,
  clearTerminal: Function,
  sendTerminalCommand: Function,
  clearBotSession: Function
});

const emit = defineEmits(['close']);
const localInput = ref('');
</script>

<style scoped>
/* Estilos terminal y modal migrados desde App.vue */
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
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
}
#terminal-content {
  scrollbar-width: thin;
  scrollbar-color: #666 #0d1117;
  overflow-x: auto;
  overflow-y: auto;
}
#terminal-content div {
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow-wrap: anywhere;
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
/* Puedes copiar los estilos relevantes del App.vue aquí si lo deseas */
</style>

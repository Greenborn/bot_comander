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

// Definir terminalRawMode local si no viene por props
const terminalRawMode = ref(false);
const props = defineProps({
  selectedBotForConsole: Object,
  terminalLines: Array,
  terminalConnected: Boolean,
  terminalInputField: Object,
  getTerminalStatusClass: Function,
  getTerminalStatusText: Function,
  isBotConnected: Function,
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
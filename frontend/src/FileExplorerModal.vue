<template>
  <div class="modal-backdrop">
    <div class="modal-content">
      <div class="modal-header">
        <h5>Explorador de archivos</h5>
        <button @click="$emit('close')">Cerrar</button>
      </div>
      <div class="modal-body">
        <div v-if="loading" class="text-center">Cargando...</div>
        <div v-else>
          <div class="file-grid">
            <div v-for="item in items" :key="item.name" class="file-item" @click="handleClick(item)">
              <i :class="item.type === 'folder' ? 'bi bi-folder' : 'bi bi-file-earmark'" style="font-size:2em;"></i>
              <div class="file-name">{{ item.name }}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <span>Ruta: {{ currentPath }}</span>
      </div>
    </div>
  </div>
</template>


<script setup>
import { ref, onMounted } from 'vue';
import { useWebSocket } from './useWebSocket.js';

const props = defineProps({
  bot: { type: Object, required: true }
});

const items = ref([]);
const currentPath = ref('/');
const loading = ref(false);

function parseLsOutput(output, currentPathValue) {
  const lines = output.split('\n').filter(l => l.trim() && !l.includes('total'));
  const result = [];
  for (const line of lines) {
    const parts = line.split(/\s+/);
    if (parts.length < 9) continue;
    const name = parts.slice(8).join(' ');
    if (name === '.' || name === '..') continue;
    const type = line[0] === 'd' ? 'folder' : 'file';
    result.push({
      name,
      type,
      path: currentPathValue === '/' ? name : currentPathValue.replace(/\/$/, '') + '/' + name
    });
  }
  return result;
}

function fetchItems(path) {
  loading.value = true;
  const { sendMessage } = useWebSocket(import.meta.env.VITE_WS_URL);
  const requestId = 'ls_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  sendMessage({
    type: 'system_command',
    targetBot: props.bot.id,
    command: `ls -la ${path}`,
    from: 'panel',
    requestId
  }, (response) => {
    if (response.success && response.output) {
      items.value = parseLsOutput(response.output, path);
      currentPath.value = path;
    } else {
      items.value = [];
    }
    loading.value = false;
  });
}

function handleClick(item) {
  if (item.type === 'folder') {
    fetchItems(item.path);
  } else {
    downloadFile(item.path, item.name);
  }
}

function downloadFile(path, filename) {
  const { sendMessage } = useWebSocket(import.meta.env.VITE_WS_URL);
  const requestId = 'dl_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  sendMessage({
    type: 'system_command',
    targetBot: props.bot.id,
    command: 'read_file_base64',
    parameters: { path },
    from: 'panel',
    requestId
  }, (response) => {
    if (response.success && response.output) {
      const link = document.createElement('a');
      link.href = 'data:application/octet-stream;base64,' + response.output;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  });
}

onMounted(() => {
  fetchItems('/');
});
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.3);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal-content {
  background: #fff;
  border-radius: 8px;
  width: 500px;
  max-width: 90vw;
  box-shadow: 0 2px 16px rgba(0,0,0,0.2);
  display: flex;
  flex-direction: column;
}
.modal-header, .modal-footer {
  padding: 1em;
  border-bottom: 1px solid #eee;
}
.modal-footer {
  border-top: 1px solid #eee;
  border-bottom: none;
}
.modal-body {
  padding: 1em;
}
.file-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 1em;
}
.file-item {
  width: 100px;
  text-align: center;
  cursor: pointer;
}
.file-name {
  font-size: 0.9em;
  margin-top: 0.5em;
  word-break: break-all;
}
</style>

<template>
  <div>
    <h2>Bots conectados</h2>
    <ul>
      <li v-for="bot in bots" :key="bot.id">
        <strong>ID:</strong> {{ bot.id }}<br />
        <strong>Conectado desde:</strong> {{ new Date(bot.connectedAt).toLocaleString() }}
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const bots = ref([]);
let ws;

onMounted(() => {
  ws = new WebSocket(import.meta.env.VITE_WS_URL);
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'bots') {
        bots.value = data.bots;
      }
    } catch (e) {}
  };
});

onUnmounted(() => {
  if (ws) ws.close();
});
</script>

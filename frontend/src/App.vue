<template>
  <div>
    <h2>Bots conectados</h2>
    <ul>
      <li v-for="bot in bots" :key="bot.id">
        {{ bot.id }} - {{ bot.estado }}
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
    bots.value = JSON.parse(event.data);
  };
});

onUnmounted(() => {
  if (ws) ws.close();
});
</script>

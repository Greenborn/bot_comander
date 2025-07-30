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
let intervalId;

async function fetchBots() {
  try {
    const res = await fetch(import.meta.env.VITE_API_URL + '/api/bots');
    bots.value = await res.json();
  } catch (e) {
    bots.value = [];
  }
}

onMounted(() => {
  fetchBots();
  intervalId = setInterval(fetchBots, 2000); // Actualiza cada 2 segundos
});

onUnmounted(() => {
  clearInterval(intervalId);
});
</script>

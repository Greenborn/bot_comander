<template>
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
        <strong>IPv4:</strong> <span>{{ bot.ipv4 || 'N/A' }}</span><br>
        <strong>IPv6:</strong> <span>{{ bot.ipv6 || 'N/A' }}</span><br>
        <strong>Espacio libre:</strong>
        <span v-if="bot.status && bot.status.systemInfo && typeof bot.status.systemInfo.diskFree === 'number'">
          {{ formatFileSize(bot.status.systemInfo.diskFree) }}
        </span>
        <span v-else class="text-muted">N/A</span>
      </p>
      <p class="card-text">
        <strong>Conectado:</strong><br>
        <small class="text-muted">
          <i class="bi bi-clock"></i>
          {{ formatDate(bot.connectedAt) }}
        </small>
      </p>
      <p class="card-text" v-if="bot.lastActivity">
        <strong>Última actividad:</strong><br>
        <small class="text-success">
          <i class="bi bi-activity"></i>
          {{ formatDate(bot.lastActivity) }}
        </small>
      </p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'BotCard',
  props: {
    bot: {
      type: Object,
      required: true
    }
  },
  methods: {
    formatFileSize(bytes) {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },
    formatDate(dateString) {
      if (!dateString) return 'N/A';
      const date = new Date(dateString);
      return date.toLocaleString('es-ES');
    }
  }
}
</script>

<style scoped>
.card {
  transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
}
.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}
.border-left-primary {
  border-left: 4px solid #007bff !important;
}
</style>

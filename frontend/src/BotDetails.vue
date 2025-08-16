<template>
  <div v-if="show" class="modal fade show" style="display: block; background: rgba(0,0,0,0.5);" tabindex="-1" aria-labelledby="botDetailsModalLabel" aria-modal="true" role="dialog">
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="botDetailsModalLabel">
            <i class="bi bi-info-circle"></i>
            Detalles de {{ bot?.botName || 'Bot' }}
          </h5>
          <button type="button" class="btn-close" @click="$emit('close')" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <ul class="list-group">
            <li class="list-group-item"><strong>ID:</strong> <code>{{ bot?.id }}</code></li>
            <li class="list-group-item"><strong>Nombre:</strong> {{ bot?.botName }}</li>
            <li class="list-group-item"><strong>Usuario:</strong> {{ bot?.username }}</li>
            <li class="list-group-item"><strong>IPv4:</strong> {{ bot?.ipv4 || 'N/A' }}</li>
            <li class="list-group-item"><strong>IPv6:</strong> {{ bot?.ipv6 || 'N/A' }}</li>
            <li class="list-group-item"><strong>Conectado:</strong> {{ bot?.connectedAt ? new Date(bot.connectedAt).toLocaleString() : 'N/A' }}</li>
            <li class="list-group-item"><strong>Última actividad:</strong> {{ bot?.lastActivity ? new Date(bot.lastActivity).toLocaleString() : 'N/A' }}</li>
            <li class="list-group-item"><strong>Autenticado:</strong> {{ bot?.authenticated ? 'Sí' : 'No' }}</li>
            <li class="list-group-item" v-if="bot?.status"><strong>Status:</strong> <pre>{{ JSON.stringify(bot.status, null, 2) }}</pre></li>
          </ul>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="$emit('close')">Cerrar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  show: Boolean,
  bot: Object
});
</script>

<style scoped>
/* Puedes copiar estilos del modal original si lo deseas */
</style>

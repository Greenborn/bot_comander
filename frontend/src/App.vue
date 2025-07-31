<template>
  <div class="container-fluid">
    <!-- Header -->
    <nav class="navbar navbar-dark bg-dark mb-4">
      <div class="container-fluid">
        <span class="navbar-brand mb-0 h1">
          <i class="bi bi-robot"></i>
          Bot Commander
        </span>
        <span class="navbar-text">
          <span class="badge bg-success me-2">{{ bots.length }}</span>
          Bots Conectados
        </span>
      </div>
    </nav>

    <!-- Main Content -->
    <div class="container">
      <div class="row">
        <div class="col-12">
          <!-- Stats Cards -->
          <div class="row mb-4">
            <div class="col-md-4">
              <div class="card text-white bg-primary">
                <div class="card-body">
                  <div class="d-flex justify-content-between">
                    <div>
                      <h5 class="card-title">Total Bots</h5>
                      <h2 class="mb-0">{{ bots.length }}</h2>
                    </div>
                    <div class="align-self-center">
                      <i class="bi bi-robot fs-1"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="col-md-4">
              <div class="card text-white bg-success">
                <div class="card-body">
                  <div class="d-flex justify-content-between">
                    <div>
                      <h5 class="card-title">Conectados</h5>
                      <h2 class="mb-0">{{ bots.length }}</h2>
                    </div>
                    <div class="align-self-center">
                      <i class="bi bi-wifi fs-1"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="col-md-4">
              <div class="card text-white bg-info">
                <div class="card-body">
                  <div class="d-flex justify-content-between">
                    <div>
                      <h5 class="card-title">Estado</h5>
                      <h6 class="mb-0">{{ ws?.readyState === 1 ? 'Conectado' : 'Desconectado' }}</h6>
                    </div>
                    <div class="align-self-center">
                      <i class="bi bi-activity fs-1"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Bots List -->
          <div class="card">
            <div class="card-header">
              <h5 class="mb-0">
                <i class="bi bi-list-ul"></i>
                Lista de Bots Conectados
              </h5>
            </div>
            <div class="card-body">
              <div v-if="bots.length === 0" class="text-center py-5">
                <i class="bi bi-robot fs-1 text-muted"></i>
                <p class="text-muted mt-3">No hay bots conectados actualmente</p>
                <small class="text-muted">Los bots aparecerán aquí cuando se conecten al WebSocket</small>
              </div>
              
              <div v-else class="row">
                <div v-for="bot in bots" :key="bot.id" class="col-md-6 col-lg-4 mb-3">
                  <div class="card border-left-primary">
                    <div class="card-body">
                      <div class="d-flex justify-content-between align-items-center mb-2">
                        <h6 class="card-title mb-0">
                          <i class="bi bi-robot text-primary"></i>
                          Bot ID
                        </h6>
                        <span class="badge bg-success">Online</span>
                      </div>
                      <p class="card-text">
                        <strong>ID:</strong> 
                        <code class="text-primary">{{ bot.id }}</code>
                      </p>
                      <p class="card-text">
                        <strong>Conectado:</strong><br>
                        <small class="text-muted">
                          <i class="bi bi-clock"></i>
                          {{ new Date(bot.connectedAt).toLocaleString() }}
                        </small>
                      </p>
                      <div class="d-flex gap-2">
                        <button class="btn btn-sm btn-outline-primary">
                          <i class="bi bi-info-circle"></i>
                          Detalles
                        </button>
                        <button class="btn btn-sm btn-outline-warning">
                          <i class="bi bi-gear"></i>
                          Configurar
                        </button>
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

<style scoped>
.border-left-primary {
  border-left: 4px solid #007bff !important;
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

.badge {
  font-size: 0.9em;
}

.btn {
  transition: all 0.2s ease-in-out;
}

.fs-1 {
  opacity: 0.8;
}

code {
  font-size: 0.9em;
  padding: 2px 6px;
  border-radius: 4px;
  background-color: rgba(0,123,255,0.1);
}
</style>

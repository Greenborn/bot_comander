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
          <span class="badge bg-success me-2">{{ stats.totalBots }}</span>
          Bots
          <span class="badge bg-info ms-3 me-2">{{ stats.totalPanels }}</span>
          Paneles
          <span class="badge ms-3 me-2" :class="connectionStatus === 'Conectado' ? 'bg-success' : 'bg-danger'">
            {{ connectionStatus }}
          </span>
        </span>
      </div>
    </nav>

    <!-- Main Content -->
    <div class="container">
      <div class="row">
        <div class="col-12">
          <!-- Stats Cards -->
          <div class="row mb-4">
            <div class="col-md-3">
              <div class="card text-white bg-primary">
                <div class="card-body">
                  <div class="d-flex justify-content-between">
                    <div>
                      <h5 class="card-title">Total Bots</h5>
                      <h2 class="mb-0">{{ stats.totalBots }}</h2>
                    </div>
                    <div class="align-self-center">
                      <i class="bi bi-robot fs-1"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="col-md-3">
              <div class="card text-white bg-success">
                <div class="card-body">
                  <div class="d-flex justify-content-between">
                    <div>
                      <h5 class="card-title">Bots Activos</h5>
                      <h2 class="mb-0">{{ stats.totalBots }}</h2>
                    </div>
                    <div class="align-self-center">
                      <i class="bi bi-wifi fs-1"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="col-md-3">
              <div class="card text-white bg-info">
                <div class="card-body">
                  <div class="d-flex justify-content-between">
                    <div>
                      <h5 class="card-title">Paneles</h5>
                      <h2 class="mb-0">{{ stats.totalPanels }}</h2>
                    </div>
                    <div class="align-self-center">
                      <i class="bi bi-display fs-1"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="col-md-3">
              <div class="card text-white bg-warning">
                <div class="card-body">
                  <div class="d-flex justify-content-between">
                    <div>
                      <h5 class="card-title">Estado</h5>
                      <h6 class="mb-0">{{ connectionStatus }}</h6>
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
                            <strong>Conectado:</strong><br>
                            <small class="text-muted">
                              <i class="bi bi-clock"></i>
                              {{ new Date(bot.connectedAt).toLocaleString() }}
                            </small>
                          </p>
                          <p class="card-text" v-if="bot.lastActivity">
                            <strong>Última actividad:</strong><br>
                            <small class="text-success">
                              <i class="bi bi-activity"></i>
                              {{ new Date(bot.lastActivity).toLocaleString() }}
                            </small>
                          </p>
                          <div class="d-flex gap-2">
                            <button class="btn btn-sm btn-outline-primary">
                              <i class="bi bi-info-circle"></i>
                              Detalles
                            </button>
                            <button class="btn btn-sm btn-outline-warning">
                              <i class="bi bi-gear"></i>
                              Comandos
                            </button>
                          </div>
                        </div>
                      </div>
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
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const bots = ref([]);
const panels = ref([]);
const stats = ref({
  totalBots: 0,
  totalPanels: 0
});
const connectionStatus = ref('Desconectado');
let ws;

onMounted(() => {
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
      
    } catch (e) {
      console.error('Error parseando mensaje:', e);
    }
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

<template>
  <nav class="navbar navbar-dark bg-dark mb-4">
    <div class="container-fluid">
      <span class="navbar-brand mb-0 h1">
        <i class="bi bi-robot"></i>
        Bot Commander
      </span>
      <div class="d-flex align-items-center">
        <span class="navbar-text me-3">
          <span class="badge bg-success me-2">{{ stats.totalBots }}</span>
          Bots
          <span class="badge bg-info ms-3 me-2">{{ stats.totalPanels }}</span>
          Paneles
          <span class="badge ms-3 me-2" :class="connectionStatus === 'Conectado' ? 'bg-success' : 'bg-danger'">
            {{ connectionStatus }}
          </span>
        </span>
        <div class="dropdown">
          <button class="btn btn-outline-light btn-sm dropdown-toggle" type="button" data-bs-toggle="dropdown">
            <i class="bi bi-person-circle"></i>
            {{ currentUser }}
          </button>
          <ul class="dropdown-menu">
            <li>
              <button class="dropdown-item" @click="$emit('logout')">
                <i class="bi bi-box-arrow-right"></i>
                Cerrar Sesión
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup>
const props = defineProps({
  stats: Object,
  connectionStatus: String,
  currentUser: String
});
</script>

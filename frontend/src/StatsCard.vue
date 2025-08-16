<template>
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
</template>

<script setup>
import { defineProps } from 'vue';
const props = defineProps({
  stats: {
    type: Object,
    required: true
  },
  connectionStatus: {
    type: String,
    required: true
  }
});
</script>

<style scoped>
/* Estilos para las stats cards */
.card {
  transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.fs-1 {
  opacity: 0.8;
}
/* Puedes mover estilos específicos aquí si lo deseas */
</style>

<template>
  <div class="d-flex justify-content-center align-items-center vh-100">
    <div class="card shadow-lg" style="width: 400px;">
      <div class="card-body">
        <div class="text-center mb-4">
          <i class="bi bi-robot fs-1 text-primary"></i>
          <h3 class="mt-2">Bot Commander</h3>
          <p class="text-muted">Acceso al Panel de Control</p>
        </div>
        <form @submit.prevent="login">
          <div class="mb-3">
            <label for="username" class="form-label">Usuario</label>
            <div class="input-group">
              <span class="input-group-text">
                <i class="bi bi-person"></i>
              </span>
              <input 
                type="text" 
                class="form-control" 
                id="username"
                v-model="loginForm.username"
                placeholder="Ingrese su usuario"
                :disabled="isLoggingIn"
                required
              >
            </div>
          </div>
          <div class="mb-3">
            <label for="password" class="form-label">Contraseña</label>
            <div class="input-group">
              <span class="input-group-text">
                <i class="bi bi-lock"></i>
              </span>
              <input 
                type="password" 
                class="form-control" 
                id="password"
                v-model="loginForm.password"
                placeholder="Ingrese su contraseña"
                :disabled="isLoggingIn"
                required
              >
            </div>
          </div>
          <div v-if="loginError" class="alert alert-danger" role="alert">
            <i class="bi bi-exclamation-triangle"></i>
            {{ loginError }}
          </div>
          <button 
            type="submit" 
            class="btn btn-primary w-100"
            :disabled="isLoggingIn"
          >
            <span v-if="isLoggingIn" class="spinner-border spinner-border-sm me-2"></span>
            <i v-else class="bi bi-box-arrow-in-right me-2"></i>
            {{ isLoggingIn ? 'Iniciando sesión...' : 'Iniciar Sesión' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps } from 'vue';
const props = defineProps({
  loginForm: Object,
  isLoggingIn: Boolean,
  loginError: String,
  login: Function
});
</script>

<template>
  <div v-if="show" class="modal fade show" style="display: block; background: rgba(0,0,0,0.5);" tabindex="-1" aria-labelledby="sendZipModalLabel" aria-modal="true" role="dialog">
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="sendZipModalLabel">
            <i class="bi bi-file-earmark-zip"></i>
            Enviar archivo ZIP a {{ bot?.botName || 'Bot' }}
          </h5>
          <button type="button" class="btn-close" @click="$emit('close')" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="handleSendZip">
            <div class="mb-3">
              <label for="zipFileInput" class="form-label">Selecciona un archivo .zip</label>
              <input type="file" class="form-control" id="zipFileInput" accept=".zip" @change="onZipFileChange" :disabled="sendingZip">
            </div>
            <div v-if="zipSendError" class="alert alert-danger">
              <i class="bi bi-exclamation-triangle"></i>
              {{ zipSendError }}
            </div>
            <div v-if="sendingZip" class="text-center py-2">
              <div class="spinner-border text-success" role="status">
                <span class="visually-hidden">Enviando...</span>
              </div>
              <p class="mt-2">Enviando archivo ZIP...</p>
            </div>
            <div v-if="zipSendSuccess" class="alert alert-success">
              <i class="bi bi-check-circle"></i>
              Archivo ZIP enviado correctamente.
            </div>
            <div class="modal-footer">
              <button type="submit" class="btn btn-success" :disabled="!selectedZipFile || sendingZip">
                <i class="bi bi-upload"></i>
                Enviar ZIP
              </button>
              <button type="button" class="btn btn-secondary" @click="$emit('close')" :disabled="sendingZip">Cerrar</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SendZipModal',
  props: {
    show: Boolean,
    bot: Object,
    sendingZip: Boolean,
    zipSendError: String,
    zipSendSuccess: Boolean,
    selectedZipFile: File
  },
  methods: {
    onZipFileChange(event) {
      const file = event.target.files[0];
      if (file && file.name.endsWith('.zip')) {
        this.$emit('select-zip', file);
      } else {
        this.$emit('select-zip', null);
        this.$emit('zip-error', 'Solo se permiten archivos .zip.');
      }
    },
    handleSendZip() {
      this.$emit('send-zip');
    }
  }
}
</script>

<style scoped>
.modal.show {
  display: block;
}
</style>

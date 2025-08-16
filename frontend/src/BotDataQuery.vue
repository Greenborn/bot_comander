<template>
  <div class="modal fade show" style="display: block; background: rgba(0,0,0,0.5);" tabindex="-1" aria-modal="true" role="dialog">
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">
            <i class="bi bi-database"></i>
            Datos de {{ bot?.botName || 'Bot' }}
          </h5>
          <button type="button" class="btn-close" @click="emitClose" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <div v-if="loadingFiles" class="text-center py-4">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Cargando...</span>
            </div>
            <p class="mt-2">Cargando archivos de datos...</p>
          </div>
          <div v-else-if="filesError" class="alert alert-danger">
            <i class="bi bi-exclamation-triangle"></i>
            {{ filesError }}
          </div>
          <div v-else>
            <h6>
              <i class="bi bi-folder2-open"></i>
              Archivos de datos por día ({{ botDataFiles.length }})
            </h6>
            <div v-if="botDataFiles.length === 0" class="text-center py-4">
              <i class="bi bi-file-earmark-x fs-1 text-muted"></i>
              <p class="text-muted mt-2">No hay datos disponibles para este bot</p>
            </div>
            <div v-else class="bot-data-files">
              <div 
                v-for="file in botDataFiles" 
                :key="file.date"
                class="file-item d-flex justify-content-between align-items-center p-3 mb-2 border rounded"
                @click="openDataFile(file)"
                style="cursor: pointer;"
              >
                <div>
                  <div class="fw-bold">
                    <i class="bi bi-calendar3"></i>
                    {{ formatDate(file.date) }}
                  </div>
                  <small class="text-muted">
                    <i class="bi bi-file-earmark-text"></i>
                    {{ file.file }} • {{ formatFileSize(file.size) }}
                  </small>
                </div>
                <div class="text-end">
                  <small class="text-muted d-block">
                    Modificado: {{ new Date(file.modified).toLocaleString() }}
                  </small>
                  <i class="bi bi-chevron-right text-primary"></i>
                </div>
              </div>
            </div>
          </div>
          <!-- Modal de archivo de datos -->
          <div v-if="selectedDataFile" class="mt-4">
            <div class="card">
              <div class="card-header d-flex justify-content-between align-items-center">
                <span>
                  <i class="bi bi-file-earmark-text"></i>
                  {{ selectedDataFile.file }}
                  <small class="text-muted ms-2">{{ formatDate(selectedDataFile.date) }}</small>
                </span>
                <button class="btn btn-sm btn-secondary" @click="selectedDataFile = null">Cerrar</button>
              </div>
              <div class="card-body">
                <div v-if="loadingFileData" class="text-center py-3">
                  <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Cargando...</span>
                  </div>
                  <p class="mt-2">Cargando datos...</p>
                </div>
                <div v-else-if="fileDataError" class="alert alert-danger">
                  <i class="bi bi-exclamation-triangle"></i>
                  {{ fileDataError }}
                </div>
                <div v-else>
                  <div class="data-viewer">
                    <pre>{{ fileData }}</pre>
                  </div>
                  <button class="btn btn-sm btn-outline-primary mt-2" @click="downloadDataFile">Descargar JSON</button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="emitClose">Cerrar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
const props = defineProps({ bot: Object })
const emit = defineEmits(['close'])

const botDataFiles = ref([])
const loadingFiles = ref(false)
const filesError = ref('')
const selectedDataFile = ref(null)
const loadingFileData = ref(false)
const fileDataError = ref('')
const fileData = ref([])

function emitClose() {
  emit('close')
}

watch(() => props.bot, (bot) => {
  if (bot) {
    loadBotDataFiles(bot.username || bot.botName)
    selectedDataFile.value = null
    fileData.value = []
    fileDataError.value = ''
  }
})

async function loadBotDataFiles(botName) {
  loadingFiles.value = true
  filesError.value = ''
  try {
    const response = await fetch(`/api/bot-data/${encodeURIComponent(botName)}/files`)
    if (!response.ok) throw new Error('Error al obtener archivos de datos')
    const data = await response.json()
    botDataFiles.value = data.files || []
  } catch (error) {
    filesError.value = error.message
    botDataFiles.value = []
  } finally {
    loadingFiles.value = false
  }
}

async function openDataFile(file) {
  selectedDataFile.value = file
  fileDataError.value = ''
  fileData.value = []
  loadingFileData.value = true
  try {
    const botName = props.bot.username || props.bot.botName
    const response = await fetch(`/api/bot-data/${encodeURIComponent(botName)}/date/${file.date}`)
    if (!response.ok) throw new Error('Error al obtener datos del archivo')
    const data = await response.json()
    fileData.value = Array.isArray(data.data) ? data.data : [data.data]
  } catch (error) {
    fileDataError.value = error.message
    fileData.value = []
  } finally {
    loadingFileData.value = false
  }
}

function formatDate(dateString) {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  } catch (error) {
    return dateString
  }
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function downloadDataFile() {
  if (!Array.isArray(fileData.value) || fileData.value.length === 0) return
  const filename = `${props.bot.botName || 'bot'}_${selectedDataFile.value.date}.json`
  const dataStr = JSON.stringify(fileData.value, null, 2)
  const dataBlob = new Blob([dataStr], { type: 'application/json' })
  const url = URL.createObjectURL(dataBlob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
</script>

# Ejemplos de Implementación

Esta carpeta contiene ejemplos de implementación para desarrolladores que quieran crear bots o paneles para Bot Commander.

## Archivos Disponibles

### `bot-client.js`
**Ejemplo completo de cliente bot** que implementa el protocolo definido en `PROTOCOL.md`.

**Características:**
- ✅ Conexión y reconexión automática
- ✅ Sistema completo de acciones con validación
- ✅ Heartbeat con información de estado
- ✅ Manejo robusto de errores
- ✅ Ejemplos de acciones (screenshot, status)
- ✅ Validación automática de parámetros

### `data-logger-bot.js`
**Bot de ejemplo que envía información genérica** al servidor Bot Commander para demostrar el sistema de logging y monitoreo.

**Características:**
- ✅ Envío de mensajes genéricos con diferentes categorías
- ✅ Generación automática de datos de prueba
- ✅ Múltiples tipos de información: métricas del sistema, eventos, errores, etc.
- ✅ Demostración completa del sistema de datos de bots
- ✅ Configuración automática desde bot-keys.json

**Tipos de datos que genera:**
- 📊 Métricas del sistema (CPU, memoria, red)
- 📋 Logs de eventos del sistema
- 🔍 Información de procesos
- 🌐 Estadísticas de red
- 📁 Operaciones de archivos
- 👤 Actividad de usuarios
- ❌ Reportes de errores
- ⚙️ Cambios de configuración

**Uso:**
```bash
# 1. Registrar el bot primero
npm run register-bot data_logger_bot

# 2. Instalar dependencias
npm install ws

# 3. Ejecutar el bot de ejemplo
node examples/data-logger-bot.js
```

## Cómo Usar los Ejemplos

### Para Desarrolladores de Bots

1. **Copia el archivo base:**
   ```bash
   cp examples/bot-client.js my-project/bot.js
   # O para bots con datos genéricos:
   cp examples/data-logger-bot.js my-project/data-bot.js
   ```

2. **Personaliza las acciones (bot-client.js):**
   - Modifica el método `setupActions()`
   - Implementa tus acciones específicas
   - Agrega validaciones necesarias

3. **Personaliza los datos (data-logger-bot.js):**
   - Modifica los métodos `generate*()` para tus tipos de datos
   - Ajusta las categorías y prioridades
   - Personaliza la frecuencia de envío

4. **Configura tu bot:**
   ```javascript
   const bot = new BotClient({
     botName: 'MiBot',
     serverUrl: 'ws://mi-servidor:8080'
   });
   ```

### Para Desarrolladores de Paneles

Los paneles se identifican como `clientType: "panel"` y reciben:
- Actualizaciones de estado (`clients_update`)
- Respuestas de acciones (`action_*`)
- Pueden enviar comandos a bots específicos

Ver `PROTOCOL.md` para mensajes de panel específicos.

## Protocolo Completo

📋 **Documentación completa**: [`PROTOCOL.md`](../PROTOCOL.md)

Incluye:
- Todos los tipos de mensajes
- Códigos de error estándar
- Estados de bot
- Mejores prácticas
- Especificaciones de tipos de datos

## Estructura Recomendada para Bots

```javascript
// Tu bot personalizado
class MiBot extends BotClient {
  constructor() {
    super({
      botName: 'MiBot-v1.0',
      serverUrl: process.env.BOT_COMMANDER_URL || 'ws://localhost:8080'
    });
  }

  setupActions() {
    super.setupActions(); // Mantener acciones base
    
    // Agregar tus acciones específicas
    this.registerAction('mi_accion_custom', {
      description: 'Mi acción personalizada',
      parameters: [/* ... */]
    }, this.miAccionCustom.bind(this));
  }

  async miAccionCustom(params) {
    // Tu implementación aquí
    return { resultado: 'exitoso' };
  }
}
```

## Dependencias Comunes

Para implementar bots robustos, considera estas librerías:

### Automatización Web
- `puppeteer` - Control de navegador Chrome/Chromium
- `playwright` - Automatización multi-navegador
- `selenium-webdriver` - WebDriver estándar

### Captura de Pantalla
- `screenshot-desktop` - Screenshots del escritorio
- `sharp` - Procesamiento de imágenes
- `canvas` - Generación de imágenes

### Utilidades del Sistema
- `systeminformation` - Información del sistema
- `node-cron` - Tareas programadas
- `fs-extra` - Operaciones de archivos mejoradas

### Redes y APIs
- `axios` - Cliente HTTP
- `ws` - WebSocket client/server
- `node-fetch` - Fetch API para Node.js

## Testing

Para probar tu bot durante desarrollo:

1. **Ejecuta el servidor Bot Commander:**
   ```bash
   cd backend && npm run dev
   ```

2. **Ejecuta tu bot:**
   ```bash
   node mi-bot.js
   ```

3. **Verifica en el panel:**
   - Ve a `http://localhost:5173`
   - Tu bot debería aparecer en la lista
   - Prueba las acciones desde la interfaz

## Soporte

- 📋 Protocolo completo: [`PROTOCOL.md`](../PROTOCOL.md)
- 🏗️ Arquitectura: [`arquitectura.md`](../arquitectura.md)
- ⚙️ Variables de entorno: [`ENVIRONMENT.md`](../ENVIRONMENT.md)
- 📖 Documentación general: [`README.md`](../README.md)

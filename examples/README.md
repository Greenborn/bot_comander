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

**Uso:**
```bash
# Instalar dependencias
npm install ws

# Ejecutar ejemplo
node examples/bot-client.js

# O usar como base para tu bot
cp examples/bot-client.js my-bot/bot.js
```

## Cómo Usar los Ejemplos

### Para Desarrolladores de Bots

1. **Copia el archivo base:**
   ```bash
   cp examples/bot-client.js my-project/bot.js
   ```

2. **Personaliza las acciones:**
   - Modifica el método `setupActions()`
   - Implementa tus acciones específicas
   - Agrega validaciones necesarias

3. **Configura tu bot:**
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

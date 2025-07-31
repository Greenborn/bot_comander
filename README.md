# Bot Commander

Sistema de control y monitoreo de bots a través de WebSockets en tiempo real.

## Estructura del Proyecto

```
bot_comander/
├── backend/          # Servidor Node.js + Express + WebSocket
├── frontend/         # Cliente Vue.js
├── .env             # Variables de entorno (no en git)
├── .env.example     # Plantilla de variables de entorno
└── ENVIRONMENT.md   # Documentación de variables de entorno
```

## Setup Inicial

### 1. Configurar Variables de Entorno
```bash
cp .env.example .env
```

### 2. Instalar Dependencias
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 3. Ejecutar en Desarrollo
```bash
# Backend (en una terminal)
cd backend
npm run dev

# Frontend (en otra terminal)
cd frontend
npm run dev
```

## Variables de Entorno

El proyecto utiliza las siguientes variables de entorno:

- `API_PORT`: Puerto del servidor backend (default: 3000)
- `VITE_WS_URL`: URL del WebSocket para el frontend (default: ws://localhost:3000)

Ver `ENVIRONMENT.md` para documentación completa.

## Arquitectura

Este servicio utiliza:
- **Backend**: Node.js + Express + WebSocket Server
- **Frontend**: Vue.js + Vite + Bootstrap 5
- **Comunicación**: WebSockets para tiempo real con identificación de tipos de cliente

### Tipos de Clientes

El sistema distingue entre dos tipos de clientes:

1. **Bots**: Clientes automatizados que se conectan para ser monitoreados
   - Se identifican como `type: "bot"`
   - Envían heartbeats periódicos
   - Pueden recibir comandos del panel
   - Aparecen en la sección "Bots Conectados"

2. **Paneles de Control**: Interfaces de usuario para monitoreo
   - Se identifican como `type: "panel"`
   - Reciben actualizaciones de estado en tiempo real
   - Pueden enviar comandos a los bots
   - Aparecen en la sección "Paneles de Control"

### Protocolo WebSocket

Al conectarse, todos los clientes reciben un mensaje `identify_request` y deben responder con:

```json
{
  "type": "identify",
  "clientType": "bot", // o "panel"
  "botName": "NombreBot" // solo para bots
}
```

#### Descubrimiento de Acciones (Panel → Bot)

Para obtener las acciones disponibles de un bot específico:

```json
{
  "type": "get_actions",
  "targetBot": "bot_id_123",
  "requestId": "unique_request_id"
}
```

**Respuesta del Bot:**

```json
{
  "type": "actions_list",
  "requestId": "unique_request_id",
  "actions": [
    {
      "name": "take_screenshot",
      "description": "Captura una screenshot de la pantalla",
      "parameters": [
        {
          "name": "quality",
          "type": "number",
          "required": false,
          "default": 80,
          "description": "Calidad de la imagen (1-100)"
        },
        {
          "name": "format",
          "type": "string",
          "required": false,
          "default": "png",
          "options": ["png", "jpg"],
          "description": "Formato de la imagen"
        }
      ]
    },
    {
      "name": "navigate_to",
      "description": "Navegar a una URL específica",
      "parameters": [
        {
          "name": "url",
          "type": "string",
          "required": true,
          "description": "URL de destino"
        },
        {
          "name": "timeout",
          "type": "number",
          "required": false,
          "default": 30000,
          "description": "Timeout en milisegundos"
        }
      ]
    },
    {
      "name": "get_status",
      "description": "Obtener el estado actual del bot",
      "parameters": []
    }
  ]
}
```

#### Ejecución de Acciones (Panel → Bot)

Para ejecutar una acción específica en un bot:

```json
{
  "type": "execute_action",
  "targetBot": "bot_id_123",
  "actionId": "unique_action_id",
  "action": {
    "name": "take_screenshot",
    "parameters": {
      "quality": 90,
      "format": "png"
    }
  }
}
```

#### Respuestas de Estado de Acciones (Bot → Panel)

**Acción Iniciada:**
```json
{
  "type": "action_started",
  "actionId": "unique_action_id",
  "action": "take_screenshot",
  "timestamp": 1640995200000,
  "estimatedDuration": 5000
}
```

**Progreso de Acción (opcional):**
```json
{
  "type": "action_progress",
  "actionId": "unique_action_id",
  "action": "take_screenshot",
  "progress": 50,
  "message": "Capturando pantalla...",
  "timestamp": 1640995202500
}
```

**Acción Completada:**
```json
{
  "type": "action_completed",
  "actionId": "unique_action_id",
  "action": "take_screenshot",
  "success": true,
  "result": {
    "imageUrl": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "size": {
      "width": 1920,
      "height": 1080
    },
    "format": "png",
    "quality": 90
  },
  "duration": 4500,
  "timestamp": 1640995204500
}
```

**Acción Fallida:**
```json
{
  "type": "action_failed",
  "actionId": "unique_action_id",
  "action": "take_screenshot",
  "success": false,
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "No se tienen permisos para capturar pantalla",
    "details": "Error al acceder al display :0"
  },
  "duration": 1200,
  "timestamp": 1640995201200
}
```

#### Heartbeat con Estado (Bot → Servidor)

Los bots pueden incluir su estado actual en el heartbeat:

```json
{
  "type": "heartbeat",
  "timestamp": 1640995200000,
  "status": {
    "state": "idle", // idle, working, error
    "currentAction": null, // o nombre de acción en ejecución
    "actionsQueued": 0,
    "systemInfo": {
      "cpu": 45.2,
      "memory": 68.1,
      "uptime": 86400000
    }
  }
}
```

Ver `arquitectura.md` para detalles técnicos completos.

## Implementación de Bots

### Ejemplo de Bot con Acciones

```javascript
class ExampleBot {
  constructor(botName) {
    this.botName = botName;
    this.actions = new Map();
    this.activeActions = new Map();
    this.setupActions();
  }

  setupActions() {
    // Registrar acciones disponibles
    this.actions.set('take_screenshot', {
      description: 'Captura una screenshot de la pantalla',
      parameters: [
        { name: 'quality', type: 'number', required: false, default: 80 },
        { name: 'format', type: 'string', required: false, default: 'png' }
      ],
      execute: this.takeScreenshot.bind(this)
    });

    this.actions.set('get_status', {
      description: 'Obtener el estado actual del bot',
      parameters: [],
      execute: this.getStatus.bind(this)
    });
  }

  handleMessage(message) {
    switch(message.type) {
      case 'get_actions':
        this.sendActionsListQ(message.requestId);
        break;
      case 'execute_action':
        this.executeAction(message);
        break;
    }
  }

  sendActionsList(requestId) {
    const actionsList = Array.from(this.actions.entries()).map(([name, action]) => ({
      name,
      description: action.description,
      parameters: action.parameters
    }));

    this.ws.send(JSON.stringify({
      type: 'actions_list',
      requestId,
      actions: actionsList
    }));
  }

  async executeAction(message) {
    const { actionId, action } = message;
    const actionDef = this.actions.get(action.name);

    if (!actionDef) {
      this.sendActionFailed(actionId, action.name, 'ACTION_NOT_FOUND', 'Acción no encontrada');
      return;
    }

    // Notificar inicio
    this.sendActionStarted(actionId, action.name);
    
    try {
      const result = await actionDef.execute(action.parameters || {});
      this.sendActionCompleted(actionId, action.name, result);
    } catch (error) {
      this.sendActionFailed(actionId, action.name, error.code || 'EXECUTION_ERROR', error.message);
    }
  }

  async takeScreenshot(params) {
    // Implementación de screenshot
    return {
      imageUrl: 'data:image/png;base64,...',
      size: { width: 1920, height: 1080 },
      format: params.format || 'png',
      quality: params.quality || 80
    };
  }

  getStatus() {
    return {
      state: 'idle',
      uptime: process.uptime() * 1000,
      memory: process.memoryUsage(),
      activeActions: this.activeActions.size
    };
  }
}
```

### Códigos de Error Estándar

| Código | Descripción | Cuándo usar |
|--------|-------------|-------------|
| `ACTION_NOT_FOUND` | Acción no encontrada | La acción solicitada no existe |
| `INVALID_PARAMETERS` | Parámetros inválidos | Parámetros faltantes o incorrectos |
| `PERMISSION_DENIED` | Permisos insuficientes | El bot no tiene permisos para la acción |
| `RESOURCE_BUSY` | Recurso ocupado | El recurso necesario está en uso |
| `TIMEOUT` | Tiempo agotado | La acción excedió el tiempo límite |
| `NETWORK_ERROR` | Error de red | Problema de conectividad |
| `SYSTEM_ERROR` | Error del sistema | Error interno del bot |
| `EXECUTION_ERROR` | Error de ejecución | Error durante la ejecución |

### Estados de Bot

| Estado | Descripción |
|--------|-------------|
| `idle` | Bot inactivo, listo para recibir comandos |
| `working` | Bot ejecutando una o más acciones |
| `error` | Bot en estado de error |
| `maintenance` | Bot en mantenimiento |
| `offline` | Bot desconectado |
```

## Desarrollo

### Scripts Disponibles

**Backend:**
- `npm start`: Ejecutar en producción
- `npm run dev`: Ejecutar con nodemon (desarrollo)

**Frontend:**
- `npm run dev`: Servidor de desarrollo
- `npm run build`: Build para producción
- `npm run dev:all`: Ejecutar backend + frontend simultáneamente

### Testing

Para probar la funcionalidad con bots simulados:

```bash
# En una terminal separada
node test_bots.js
```

Esto conectará 3 bots de prueba que aparecerán en el panel de control.

#### Acciones de Prueba Disponibles

Los bots de prueba incluyen las siguientes acciones para testing:

- **`take_screenshot`**: Simula captura de pantalla
  - Parámetros: `quality` (number), `format` (string)
  - Duración: ~2 segundos

- **`navigate_to`**: Simula navegación web
  - Parámetros: `url` (string, requerido), `timeout` (number)
  - Duración: ~3 segundos

- **`get_status`**: Obtiene estado detallado del bot
  - Sin parámetros
  - Respuesta inmediata

- **`wait`**: Espera un tiempo determinado
  - Parámetros: `duration` (number, requerido)
  - Duración: variable según parámetro

#### Ejemplo de Uso desde Panel

1. Conectar al panel web en `http://localhost:5173`
2. Verificar que aparezcan los 3 bots conectados
3. Usar el botón "Detalles" para obtener acciones disponibles
4. Ejecutar acciones con parámetros personalizados

## Contribución

1. Clona el repositorio
2. Configura las variables de entorno
3. Instala dependencias
4. Ejecuta en modo desarrollo
5. Haz tus cambios y crea un pull request

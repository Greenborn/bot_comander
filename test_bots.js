const WebSocket = require('ws');

class TestBot {
  constructor(botName) {
    this.botName = botName;
    this.ws = null;
    this.heartbeatInterval = null;
    this.actions = new Map();
    this.activeActions = new Map();
    this.setupActions();
  }

  setupActions() {
    // Registrar acciones disponibles
    this.actions.set('take_screenshot', {
      description: 'Captura una screenshot de la pantalla',
      parameters: [
        { name: 'quality', type: 'number', required: false, default: 80, description: 'Calidad de la imagen (1-100)' },
        { name: 'format', type: 'string', required: false, default: 'png', options: ['png', 'jpg'], description: 'Formato de la imagen' }
      ],
      execute: this.takeScreenshot.bind(this)
    });

    this.actions.set('navigate_to', {
      description: 'Navegar a una URL específica',
      parameters: [
        { name: 'url', type: 'string', required: true, description: 'URL de destino' },
        { name: 'timeout', type: 'number', required: false, default: 30000, description: 'Timeout en milisegundos' }
      ],
      execute: this.navigateTo.bind(this)
    });

    this.actions.set('get_status', {
      description: 'Obtener el estado actual del bot',
      parameters: [],
      execute: this.getDetailedStatus.bind(this)
    });

    this.actions.set('wait', {
      description: 'Esperar un tiempo determinado',
      parameters: [
        { name: 'duration', type: 'number', required: true, description: 'Duración en milisegundos' }
      ],
      execute: this.wait.bind(this)
    });
  }

  connect() {
    console.log(`Conectando bot: ${this.botName}...`);
    this.ws = new WebSocket('ws://localhost:8080');

    this.ws.on('open', () => {
      console.log(`${this.botName} conectado`);
    });

    this.ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log(`${this.botName} recibió:`, message);

        // Responder a solicitud de identificación
        if (message.type === 'identify_request') {
          this.ws.send(JSON.stringify({
            type: 'identify',
            clientType: 'bot',
            botName: this.botName
          }));
        }

        // Responder a bienvenida iniciando heartbeat
        if (message.type === 'welcome') {
          console.log(`${this.botName}: ${message.message}`);
          this.startHeartbeat();
        }

        // Manejar comandos
        if (message.type === 'command') {
          console.log(`${this.botName} ejecutando comando: ${message.command}`);
          // Simular ejecución de comando
          setTimeout(() => {
            this.ws.send(JSON.stringify({
              type: 'command_result',
              command: message.command,
              result: 'Comando ejecutado exitosamente',
              timestamp: Date.now()
            }));
          }, 1000);
        }

        // Manejar solicitud de acciones
        if (message.type === 'get_actions') {
          this.sendActionsList(message.requestId);
        }

        // Manejar ejecución de acciones
        if (message.type === 'execute_action') {
          this.executeAction(message);
        }

      } catch (e) {
        console.error(`${this.botName} error parsing message:`, e);
      }
    });

    this.ws.on('close', () => {
      console.log(`${this.botName} desconectado`);
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
      }
    });

    this.ws.on('error', (error) => {
      console.error(`${this.botName} error:`, error);
    });
  }

  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          type: 'heartbeat',
          timestamp: Date.now(),
          status: {
            state: this.activeActions.size > 0 ? 'working' : 'idle',
            currentAction: this.activeActions.size > 0 ? Array.from(this.activeActions.keys())[0] : null,
            actionsQueued: this.activeActions.size,
            systemInfo: {
              cpu: Math.random() * 100,
              memory: Math.random() * 100,
              uptime: process.uptime() * 1000
            }
          }
        }));
      }
    }, 30000); // Cada 30 segundos
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

    // Validar parámetros requeridos
    const missingParams = actionDef.parameters
      .filter(p => p.required && !(p.name in (action.parameters || {})))
      .map(p => p.name);

    if (missingParams.length > 0) {
      this.sendActionFailed(actionId, action.name, 'INVALID_PARAMETERS', `Parámetros requeridos faltantes: ${missingParams.join(', ')}`);
      return;
    }

    // Registrar acción activa
    this.activeActions.set(actionId, { name: action.name, startTime: Date.now() });

    // Notificar inicio
    this.sendActionStarted(actionId, action.name);
    
    try {
      const result = await actionDef.execute(action.parameters || {});
      this.sendActionCompleted(actionId, action.name, result);
    } catch (error) {
      this.sendActionFailed(actionId, action.name, error.code || 'EXECUTION_ERROR', error.message);
    } finally {
      this.activeActions.delete(actionId);
    }
  }

  sendActionStarted(actionId, actionName) {
    this.ws.send(JSON.stringify({
      type: 'action_started',
      actionId,
      action: actionName,
      timestamp: Date.now(),
      estimatedDuration: 5000
    }));
  }

  sendActionCompleted(actionId, actionName, result) {
    const actionInfo = this.activeActions.get(actionId);
    const duration = actionInfo ? Date.now() - actionInfo.startTime : 0;

    this.ws.send(JSON.stringify({
      type: 'action_completed',
      actionId,
      action: actionName,
      success: true,
      result,
      duration,
      timestamp: Date.now()
    }));
  }

  sendActionFailed(actionId, actionName, errorCode, errorMessage) {
    const actionInfo = this.activeActions.get(actionId);
    const duration = actionInfo ? Date.now() - actionInfo.startTime : 0;

    this.ws.send(JSON.stringify({
      type: 'action_failed',
      actionId,
      action: actionName,
      success: false,
      error: {
        code: errorCode,
        message: errorMessage
      },
      duration,
      timestamp: Date.now()
    }));
  }

  // Implementaciones de acciones
  async takeScreenshot(params) {
    // Simular captura de pantalla con delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return {
      imageUrl: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`,
      size: { width: 1920, height: 1080 },
      format: params.format || 'png',
      quality: params.quality || 80
    };
  }

  async navigateTo(params) {
    // Simular navegación con delay
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    return {
      url: params.url,
      title: `Página de ${params.url}`,
      loadTime: 2856,
      status: 'success'
    };
  }

  async getDetailedStatus() {
    return {
      state: this.activeActions.size > 0 ? 'working' : 'idle',
      botName: this.botName,
      uptime: process.uptime() * 1000,
      memory: process.memoryUsage(),
      activeActions: this.activeActions.size,
      totalActionsExecuted: Math.floor(Math.random() * 100),
      lastActivity: Date.now()
    };
  }

  async wait(params) {
    const duration = params.duration;
    await new Promise(resolve => setTimeout(resolve, duration));
    
    return {
      duration,
      message: `Esperó ${duration}ms exitosamente`
    };
  }

  disconnect() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.ws) {
      this.ws.close();
    }
  }
}

// Crear bots de prueba
const bots = [
  new TestBot('WebCrawler-01'),
  new TestBot('DataProcessor-02'),
  new TestBot('Monitor-03')
];

// Conectar bots con delay
bots.forEach((bot, index) => {
  setTimeout(() => {
    bot.connect();
  }, index * 2000);
});

// Manejar cierre graceful
process.on('SIGINT', () => {
  console.log('\nDesconectando bots...');
  bots.forEach(bot => bot.disconnect());
  process.exit();
});

console.log('Bot clients iniciados. Presiona Ctrl+C para salir.');

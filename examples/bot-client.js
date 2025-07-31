/**
 * Ejemplo de Cliente Bot para Bot Commander
 * 
 * Este archivo demuestra cómo implementar un bot que sigue el protocolo
 * definido en PROTOCOL.md
 * 
 * Para usar en tu proyecto:
 * 1. Copia este archivo a tu proyecto de bot
 * 2. Instala dependencias: npm install ws
 * 3. Adapta las acciones según tus necesidades
 * 4. Consulta PROTOCOL.md para especificaciones completas
 */

const WebSocket = require('ws');

class BotClient {
  constructor(config) {
    this.config = {
      serverUrl: 'ws://localhost:8080',
      botName: 'ExampleBot',
      heartbeatInterval: 30000,
      reconnectDelay: 5000,
      ...config
    };
    
    this.ws = null;
    this.heartbeatTimer = null;
    this.actions = new Map();
    this.activeActions = new Map();
    this.isConnected = false;
    
    this.setupActions();
  }

  /**
   * Configurar acciones disponibles del bot
   * Personaliza este método según las capacidades de tu bot
   */
  setupActions() {
    // Ejemplo: Acción de screenshot
    this.registerAction('take_screenshot', {
      description: 'Captura una screenshot de la pantalla',
      category: 'capture',
      parameters: [
        {
          name: 'quality',
          type: 'number',
          required: false,
          default: 80,
          min: 1,
          max: 100,
          description: 'Calidad de la imagen (1-100)'
        },
        {
          name: 'format',
          type: 'string',
          required: false,
          default: 'png',
          options: ['png', 'jpg', 'webp'],
          description: 'Formato de la imagen'
        }
      ]
    }, this.takeScreenshot.bind(this));

    // Ejemplo: Acción de estado
    this.registerAction('get_status', {
      description: 'Obtiene el estado detallado del bot',
      category: 'system',
      parameters: []
    }, this.getDetailedStatus.bind(this));

    // Agrega más acciones según tus necesidades...
  }

  /**
   * Registrar una nueva acción
   */
  registerAction(name, definition, handler) {
    this.actions.set(name, {
      ...definition,
      execute: handler
    });
  }

  /**
   * Conectar al servidor
   */
  async connect() {
    try {
      console.log(`[${this.config.botName}] Conectando a ${this.config.serverUrl}...`);
      
      this.ws = new WebSocket(this.config.serverUrl);
      
      this.ws.on('open', this.onOpen.bind(this));
      this.ws.on('message', this.onMessage.bind(this));
      this.ws.on('close', this.onClose.bind(this));
      this.ws.on('error', this.onError.bind(this));
      
    } catch (error) {
      console.error(`[${this.config.botName}] Error conectando:`, error);
      setTimeout(() => this.connect(), this.config.reconnectDelay);
    }
  }

  /**
   * Manejador de conexión abierta
   */
  onOpen() {
    console.log(`[${this.config.botName}] Conectado exitosamente`);
    this.isConnected = true;
  }

  /**
   * Manejador de mensajes recibidos
   */
  onMessage(data) {
    try {
      const message = JSON.parse(data.toString());
      
      switch (message.type) {
        case 'identify_request':
          this.handleIdentifyRequest(message);
          break;
          
        case 'welcome':
          this.handleWelcome(message);
          break;
          
        case 'get_actions':
          this.handleGetActions(message);
          break;
          
        case 'execute_action':
          this.handleExecuteAction(message);
          break;
          
        case 'heartbeat_ack':
          // Confirmación de heartbeat recibida
          break;
          
        default:
          console.warn(`[${this.config.botName}] Tipo de mensaje desconocido:`, message.type);
      }
      
    } catch (error) {
      console.error(`[${this.config.botName}] Error procesando mensaje:`, error);
    }
  }

  /**
   * Manejador de identificación
   */
  handleIdentifyRequest(message) {
    this.send({
      type: 'identify',
      clientType: 'bot',
      botName: this.config.botName
    });
  }

  /**
   * Manejador de bienvenida
   */
  handleWelcome(message) {
    console.log(`[${this.config.botName}] ${message.message}`);
    this.startHeartbeat();
  }

  /**
   * Manejador de solicitud de acciones
   */
  handleGetActions(message) {
    const actionsList = Array.from(this.actions.entries()).map(([name, action]) => ({
      name,
      description: action.description,
      category: action.category,
      parameters: action.parameters
    }));

    this.send({
      type: 'actions_list',
      requestId: message.requestId,
      actions: actionsList
    });
  }

  /**
   * Manejador de ejecución de acciones
   */
  async handleExecuteAction(message) {
    const { actionId, action } = message;
    const actionDef = this.actions.get(action.name);

    if (!actionDef) {
      this.sendActionFailed(actionId, action.name, 'ACTION_NOT_FOUND', 'Acción no encontrada');
      return;
    }

    // Validar parámetros
    const validation = this.validateParameters(actionDef.parameters, action.parameters || {});
    if (!validation.valid) {
      this.sendActionFailed(actionId, action.name, 'INVALID_PARAMETERS', validation.error);
      return;
    }

    // Registrar acción activa
    this.activeActions.set(actionId, {
      name: action.name,
      startTime: Date.now()
    });

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

  /**
   * Validar parámetros de acción
   */
  validateParameters(paramDefs, params) {
    for (const paramDef of paramDefs) {
      if (paramDef.required && !(paramDef.name in params)) {
        return {
          valid: false,
          error: `Parámetro requerido faltante: ${paramDef.name}`
        };
      }

      if (paramDef.name in params) {
        const value = params[paramDef.name];
        
        // Validar tipo
        if (paramDef.type === 'number' && typeof value !== 'number') {
          return {
            valid: false,
            error: `Parámetro ${paramDef.name} debe ser número`
          };
        }

        // Validar rango para números
        if (paramDef.type === 'number' && typeof value === 'number') {
          if (paramDef.min !== undefined && value < paramDef.min) {
            return {
              valid: false,
              error: `Parámetro ${paramDef.name} debe ser >= ${paramDef.min}`
            };
          }
          if (paramDef.max !== undefined && value > paramDef.max) {
            return {
              valid: false,
              error: `Parámetro ${paramDef.name} debe ser <= ${paramDef.max}`
            };
          }
        }

        // Validar opciones
        if (paramDef.options && !paramDef.options.includes(value)) {
          return {
            valid: false,
            error: `Parámetro ${paramDef.name} debe ser uno de: ${paramDef.options.join(', ')}`
          };
        }
      }
    }

    return { valid: true };
  }

  /**
   * Iniciar heartbeat
   */
  startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected) {
        this.send({
          type: 'heartbeat',
          timestamp: Date.now(),
          status: {
            state: this.activeActions.size > 0 ? 'working' : 'idle',
            currentAction: this.activeActions.size > 0 ? 
              Array.from(this.activeActions.values())[0].name : null,
            actionsQueued: this.activeActions.size,
            systemInfo: this.getSystemInfo()
          }
        });
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Obtener información del sistema
   */
  getSystemInfo() {
    return {
      cpu: Math.random() * 100, // Implementar medición real
      memory: (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100,
      uptime: process.uptime() * 1000
    };
  }

  /**
   * Enviar mensaje al servidor
   */
  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Notificar inicio de acción
   */
  sendActionStarted(actionId, actionName) {
    this.send({
      type: 'action_started',
      actionId,
      action: actionName,
      timestamp: Date.now(),
      estimatedDuration: 5000 // Estimar según la acción
    });
  }

  /**
   * Notificar progreso de acción
   */
  sendActionProgress(actionId, actionName, progress, message) {
    this.send({
      type: 'action_progress',
      actionId,
      action: actionName,
      progress,
      message,
      timestamp: Date.now()
    });
  }

  /**
   * Notificar acción completada
   */
  sendActionCompleted(actionId, actionName, result) {
    const actionInfo = this.activeActions.get(actionId);
    const duration = actionInfo ? Date.now() - actionInfo.startTime : 0;

    this.send({
      type: 'action_completed',
      actionId,
      action: actionName,
      success: true,
      result,
      duration,
      timestamp: Date.now()
    });
  }

  /**
   * Notificar acción fallida
   */
  sendActionFailed(actionId, actionName, errorCode, errorMessage) {
    const actionInfo = this.activeActions.get(actionId);
    const duration = actionInfo ? Date.now() - actionInfo.startTime : 0;

    this.send({
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
    });
  }

  /**
   * Manejador de conexión cerrada
   */
  onClose() {
    console.log(`[${this.config.botName}] Conexión cerrada`);
    this.isConnected = false;
    
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    // Reintentar conexión
    setTimeout(() => this.connect(), this.config.reconnectDelay);
  }

  /**
   * Manejador de errores
   */
  onError(error) {
    console.error(`[${this.config.botName}] Error:`, error);
  }

  /**
   * Desconectar bot
   */
  disconnect() {
    this.isConnected = false;
    
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
    
    if (this.ws) {
      this.ws.close();
    }
  }

  // ====== IMPLEMENTACIONES DE ACCIONES ======
  // Personaliza estas funciones según tu bot

  /**
   * Ejemplo: Implementación de screenshot
   */
  async takeScreenshot(params) {
    // Simular delay de captura
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Tu implementación real aquí
    // Por ejemplo: usar puppeteer, sharp, etc.
    
    return {
      imageUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      size: { width: 1920, height: 1080 },
      format: params.format || 'png',
      quality: params.quality || 80,
      fileSize: 1024,
      metadata: {
        captureTime: Date.now(),
        devicePixelRatio: 1
      }
    };
  }

  /**
   * Ejemplo: Obtener estado detallado
   */
  async getDetailedStatus() {
    return {
      state: this.activeActions.size > 0 ? 'working' : 'idle',
      botName: this.config.botName,
      version: '1.0.0',
      uptime: process.uptime() * 1000,
      memory: process.memoryUsage(),
      activeActions: this.activeActions.size,
      totalActionsExecuted: 0, // Mantener contador
      capabilities: Array.from(this.actions.keys()),
      lastActivity: Date.now()
    };
  }
}

// Ejemplo de uso
if (require.main === module) {
  const bot = new BotClient({
    botName: 'MyCustomBot',
    serverUrl: 'ws://localhost:8080'
  });

  bot.connect();

  // Manejo de cierre graceful
  process.on('SIGINT', () => {
    console.log('Desconectando bot...');
    bot.disconnect();
    process.exit();
  });
}

module.exports = BotClient;

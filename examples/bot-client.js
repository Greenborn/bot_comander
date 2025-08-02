/**
 * Ejemplo de Cliente Bot para Bot Commander
 * 
 * Este archivo demuestra cómo implementar un bot que sigue el protocolo
 * definido en PROTOCOL.md
 * 
 * Para usar en tu proyecto:
 * 1. Registra tu bot: npm run register-bot TuBotName
 * 2. Copia la API key generada al campo config.apiKey 
 * 3. Copia este archivo a tu proyecto de bot
 * 4. Instala dependencias: npm install ws
 * 5. Adapta las acciones según tus necesidades
 * 6. Consulta PROTOCOL.md para especificaciones completas
 */

const WebSocket = require('ws');

class BotClient {
  constructor(config) {
    this.config = {
      serverUrl: 'ws://localhost:8080',
      botName: 'ExampleBot',
      username: 'ExampleBot',  // REQUERIDO: Nombre de usuario registrado
      apiKey: 'bot_examplebot_123456_abcdef...', // REQUERIDO: API key del bot
      heartbeatInterval: 30000,
      reconnectDelay: 5000,
      ...config
    };
    
    this.ws = null;
    this.heartbeatTimer = null;
    this.actions = new Map();
    this.activeActions = new Map();
    this.isConnected = false;
    this.isAuthenticated = false;
    
    // PTY sessions management
    this.ptySessions = new Map();
    this.sessionCounter = 0;
    
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
          
        case 'error':
          this.handleError(message);
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
          
        case 'system_command':
          this.handleSystemCommand(message);
          break;
          
        case 'pty_start':
          this.handlePtyStart(message);
          break;
          
        case 'pty_input':
          this.handlePtyInput(message);
          break;
          
        case 'pty_resize':
          this.handlePtyResize(message);
          break;
          
        case 'pty_kill':
          this.handlePtyKill(message);
          break;
          
        case 'pty_list':
          this.handlePtyList(message);
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
    // Verificar que tenemos credenciales válidas
    if (!this.config.username || !this.config.apiKey) {
      console.error(`[${this.config.botName}] ❌ Error: Faltan credenciales de autenticación`);
      console.error('💡 Ejecuta: npm run register-bot TuBotName');
      console.error('   Y configura username y apiKey en este archivo');
      process.exit(1);
    }
    
    if (this.config.apiKey.includes('...')) {
      console.error(`[${this.config.botName}] ❌ Error: API key no configurada`);
      console.error('💡 Reemplaza el valor de apiKey con la clave generada');
      process.exit(1);
    }
    
    console.log(`[${this.config.botName}] 🔐 Enviando credenciales de autenticación...`);
    this.send({
      type: 'identify',
      clientType: 'bot',
      username: this.config.username,
      apiKey: this.config.apiKey,
      botName: this.config.botName
    });
  }

  /**
   * Manejador de bienvenida
   */
  handleWelcome(message) {
    console.log(`[${this.config.botName}] ${message.message}`);
    
    if (message.authenticated) {
      console.log(`[${this.config.botName}] ✅ Autenticación exitosa!`);
      this.isAuthenticated = true;
      this.startHeartbeat();
    } else {
      console.log(`[${this.config.botName}] ⚠️  Conexión establecida sin autenticación`);
    }
  }

  /**
   * Manejador de errores
   */
  handleError(message) {
    console.error(`[${this.config.botName}] ❌ Error del servidor: ${message.message}`);
    
    // Manejar errores de autenticación
    if (message.code === 'INVALID_CREDENTIALS' || 
        message.code === 'MISSING_CREDENTIALS' ||
        message.code === 'BOT_NOT_REGISTERED' ||
        message.code === 'BOT_DEACTIVATED') {
      
      console.error(`[${this.config.botName}] 🔑 Error de autenticación: ${message.code}`);
      console.error('💡 Verifica que el bot esté registrado y la API key sea correcta');
      console.error('   Ejecuta: npm run register-bot ' + this.config.username);
      
      // No reintentar para errores de autenticación
      process.exit(1);
    }
  }

  /**
   * Manejador de comandos del sistema
   */
  async handleSystemCommand(message) {
    const { command, requestId } = message;
    
    console.log(`[${this.config.botName}] 🖥️  Ejecutando comando del sistema: ${command}`);
    
    try {
      const { spawn } = require('child_process');
      
      // Determinar shell y argumentos según el sistema operativo
      const isWindows = process.platform === 'win32';
      const shell = isWindows ? 'cmd' : 'bash';
      const shellArgs = isWindows ? ['/c'] : ['-c'];
      
      const childProcess = spawn(shell, [...shellArgs, command], {
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: false
      });
      
      let output = '';
      let errorOutput = '';
      
      childProcess.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      childProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      childProcess.on('close', (code) => {
        // Enviar respuesta de vuelta al servidor
        this.send({
          type: 'system_command_response',
          requestId: requestId,
          command: command,
          success: code === 0,
          output: output || null,
          error: errorOutput || null,
          exitCode: code
        });
        
        if (code === 0) {
          console.log(`[${this.config.botName}] ✅ Comando ejecutado exitosamente`);
        } else {
          console.log(`[${this.config.botName}] ❌ Comando falló con código: ${code}`);
        }
      });
      
      childProcess.on('error', (error) => {
        console.error(`[${this.config.botName}] ❌ Error ejecutando comando:`, error);
        this.send({
          type: 'system_command_response',
          requestId: requestId,
          command: command,
          success: false,
          output: null,
          error: `Error ejecutando comando: ${error.message}`,
          exitCode: -1
        });
      });
      
    } catch (error) {
      console.error(`[${this.config.botName}] ❌ Error en handleSystemCommand:`, error);
      this.send({
        type: 'system_command_response',
        requestId: requestId,
        command: command,
        success: false,
        output: null,
        error: `Error interno: ${error.message}`,
        exitCode: -1
      });
    }
  }

  /**
   * Manejador para iniciar sesión PTY
   */
  async handlePtyStart(message) {
    const { requestId, command, interactive, cols, rows } = message;
    
    try {
      const { spawn } = require('child_process');
      
      // Crear ID único para la sesión
      this.sessionCounter++;
      const sessionId = `pty_${Date.now()}_${this.sessionCounter}`;
      
      console.log(`[${this.config.botName}] 🖥️  Iniciando sesión PTY: ${command || 'shell'} (${sessionId})`);
      
      // Determinar shell y argumentos según el sistema operativo
      const isWindows = process.platform === 'win32';
      let shell, shellArgs;
      
      if (command) {
        shell = isWindows ? 'cmd' : 'bash';
        shellArgs = isWindows ? ['/c', command] : ['-c', command];
      } else {
        // Shell interactivo por defecto
        shell = isWindows ? 'cmd' : 'bash';
        shellArgs = isWindows ? [] : ['--login'];
      }
      
      // Crear proceso hijo
      const childProcess = spawn(shell, shellArgs, {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: false,
        env: {
          ...process.env,
          TERM: 'xterm-256color',
          COLUMNS: cols?.toString() || '80',
          LINES: rows?.toString() || '24'
        }
      });
      
      // Almacenar información de la sesión
      const sessionInfo = {
        sessionId,
        requestId,
        command: command || 'interactive shell',
        process: childProcess,
        createdAt: Date.now(),
        interactive: interactive || false,
        cols: cols || 80,
        rows: rows || 24
      };
      
      this.ptySessions.set(sessionId, sessionInfo);
      
      // Configurar manejadores del proceso
      childProcess.stdout.on('data', (data) => {
        this.send({
          type: 'pty_output',
          sessionId,
          requestId,
          data: data.toString(),
          timestamp: Date.now()
        });
      });
      
      childProcess.stderr.on('data', (data) => {
        this.send({
          type: 'pty_output',
          sessionId,
          requestId,
          data: data.toString(),
          timestamp: Date.now()
        });
      });
      
      childProcess.on('close', (code, signal) => {
        this.send({
          type: 'pty_session_ended',
          sessionId,
          requestId,
          command: sessionInfo.command,
          success: code === 0,
          exitCode: code,
          signal: signal,
          duration: Date.now() - sessionInfo.createdAt
        });
        
        this.ptySessions.delete(sessionId);
        console.log(`[${this.config.botName}] 🔚 Sesión PTY terminada: ${sessionId}`);
      });
      
      childProcess.on('error', (error) => {
        this.send({
          type: 'pty_session_ended',
          sessionId,
          requestId,
          command: sessionInfo.command,
          success: false,
          error: error.message,
          exitCode: -1,
          duration: Date.now() - sessionInfo.createdAt
        });
        
        this.ptySessions.delete(sessionId);
        console.error(`[${this.config.botName}] ❌ Error en sesión PTY ${sessionId}:`, error);
      });
      
      // Confirmar que la sesión se inició exitosamente
      this.send({
        type: 'pty_started',
        requestId,
        sessionId,
        command: sessionInfo.command,
        success: true,
        timestamp: Date.now()
      });
      
    } catch (error) {
      console.error(`[${this.config.botName}] ❌ Error iniciando PTY:`, error);
      this.send({
        type: 'pty_error',
        requestId,
        error: `Error iniciando sesión PTY: ${error.message}`
      });
    }
  }

  /**
   * Manejador para entrada PTY
   */
  handlePtyInput(message) {
    const { sessionId, data } = message;
    const session = this.ptySessions.get(sessionId);
    
    if (session && session.process && !session.process.killed) {
      try {
        session.process.stdin.write(data);
      } catch (error) {
        console.error(`[${this.config.botName}] ❌ Error enviando entrada a PTY ${sessionId}:`, error);
      }
    }
  }

  /**
   * Manejador para redimensionar PTY
   */
  handlePtyResize(message) {
    const { sessionId, cols, rows } = message;
    const session = this.ptySessions.get(sessionId);
    
    if (session) {
      session.cols = cols;
      session.rows = rows;
      
      // Actualizar variables de entorno si es posible
      if (session.process && !session.process.killed) {
        try {
          // En sistemas Unix, podríamos enviar SIGWINCH, pero por simplicidad
          // solo actualizamos las variables de la sesión
          console.log(`[${this.config.botName}] 📏 PTY ${sessionId} redimensionado a ${cols}x${rows}`);
        } catch (error) {
          console.error(`[${this.config.botName}] ❌ Error redimensionando PTY ${sessionId}:`, error);
        }
      }
    }
  }

  /**
   * Manejador para terminar sesión PTY
   */
  handlePtyKill(message) {
    const { sessionId, signal } = message;
    const session = this.ptySessions.get(sessionId);
    
    if (session && session.process && !session.process.killed) {
      try {
        const killSignal = signal || 'SIGTERM';
        session.process.kill(killSignal);
        console.log(`[${this.config.botName}] ⚡ Terminando PTY ${sessionId} con señal ${killSignal}`);
      } catch (error) {
        console.error(`[${this.config.botName}] ❌ Error terminando PTY ${sessionId}:`, error);
      }
    }
  }

  /**
   * Manejador para listar sesiones PTY
   */
  handlePtyList(message) {
    const { requestId } = message;
    
    const sessions = Array.from(this.ptySessions.entries()).map(([sessionId, session]) => ({
      sessionId,
      requestId: session.requestId,
      command: session.command,
      createdAt: session.createdAt,
      uptime: Date.now() - session.createdAt
    }));
    
    this.send({
      type: 'pty_sessions_list',
      sessions,
      total: sessions.length,
      timestamp: Date.now()
    });
    
    console.log(`[${this.config.botName}] 📋 Listando ${sessions.length} sesiones PTY activas`);
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
    
    // Cerrar todas las sesiones PTY activas
    this.ptySessions.forEach((session, sessionId) => {
      if (session.process && !session.process.killed) {
        session.process.kill('SIGTERM');
      }
    });
    this.ptySessions.clear();
    
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

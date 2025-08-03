#!/usr/bin/env node

/**
 * Bot de ejemplo que envía información genérica al servidor Bot Commander
 * Demuestra el uso de mensajes genéricos para logging, monitoreo y datos diversos
 */

import WebSocket from 'ws';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración del bot (cambiar según sea necesario)
const BOT_CONFIG = {
  username: 'data_logger_bot',
  apiKey: '', // Se cargará del archivo bot-keys.json
  botName: 'Data Logger Bot v1.0',
  serverUrl: 'ws://localhost:8080'
};

// Cargar API key desde bot-keys.json
function loadApiKey() {
  try {
    const botKeysPath = path.resolve(__dirname, '../bot-keys.json');
    if (!fs.existsSync(botKeysPath)) {
      console.error('❌ Archivo bot-keys.json no encontrado. Ejecuta "npm run register-bot data_logger_bot" primero.');
      process.exit(1);
    }
    
    const botKeys = JSON.parse(fs.readFileSync(botKeysPath, 'utf8'));
    const botConfig = botKeys[BOT_CONFIG.username];
    
    if (!botConfig) {
      console.error(`❌ Bot "${BOT_CONFIG.username}" no encontrado en bot-keys.json. Regístralo primero.`);
      process.exit(1);
    }
    
    if (!botConfig.isActive) {
      console.error(`❌ Bot "${BOT_CONFIG.username}" está desactivado.`);
      process.exit(1);
    }
    
    BOT_CONFIG.apiKey = botConfig.apiKey;
    console.log(`✅ API Key cargada para bot: ${BOT_CONFIG.username}`);
  } catch (error) {
    console.error('❌ Error cargando configuración del bot:', error.message);
    process.exit(1);
  }
}

class DataLoggerBot {
  constructor() {
    this.ws = null;
    this.authenticated = false;
    this.heartbeatInterval = null;
    this.dataInterval = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  connect() {
    console.log(`🔗 Conectando a ${BOT_CONFIG.serverUrl}...`);
    
    this.ws = new WebSocket(BOT_CONFIG.serverUrl);
    
    this.ws.on('open', () => {
      console.log('✅ Conexión WebSocket establecida');
      this.reconnectAttempts = 0;
    });
    
    this.ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleMessage(message);
      } catch (error) {
        console.error('❌ Error parseando mensaje:', error);
      }
    });
    
    this.ws.on('close', () => {
      console.log('🔌 Conexión cerrada');
      this.authenticated = false;
      this.stopHeartbeat();
      this.stopDataGeneration();
      this.attemptReconnect();
    });
    
    this.ws.on('error', (error) => {
      console.error('❌ Error de WebSocket:', error.message);
    });
  }

  handleMessage(message) {
    switch (message.type) {
      case 'identify_request':
        this.sendIdentification();
        break;
        
      case 'welcome':
        if (message.authenticated) {
          console.log('🎉 Bot autenticado exitosamente');
          this.authenticated = true;
          this.startHeartbeat();
          this.startDataGeneration();
        }
        break;
        
      case 'error':
        console.error('❌ Error del servidor:', message.message);
        if (message.code === 'INVALID_CREDENTIALS') {
          console.error('🔑 Credenciales inválidas. Verifica el usuario y API key.');
          process.exit(1);
        }
        break;
        
      case 'heartbeat_ack':
        // Servidor confirmó heartbeat
        break;
        
      case 'generic_message_response':
        if (message.success) {
          console.log('📤 Información enviada confirmada:', message.requestId);
        } else {
          console.error('❌ Error enviando información:', message.message);
        }
        break;
        
      default:
        console.log('📨 Mensaje recibido:', message.type);
    }
  }

  sendIdentification() {
    const identification = {
      type: 'identify',
      clientType: 'bot',
      username: BOT_CONFIG.username,
      apiKey: BOT_CONFIG.apiKey,
      botName: BOT_CONFIG.botName
    };
    
    this.send(identification);
    console.log(`🤖 Identificación enviada como: ${BOT_CONFIG.botName}`);
  }

  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.authenticated) {
        this.send({
          type: 'heartbeat',
          timestamp: Date.now(),
          status: {
            state: 'working',
            currentAction: 'generating_data',
            actionsQueued: 0,
            systemInfo: {
              cpu: Math.random() * 100,
              memory: Math.random() * 100,
              uptime: Date.now() - this.startTime
            }
          }
        });
      }
    }, 30000); // Cada 30 segundos
    
    this.startTime = Date.now();
    console.log('💓 Heartbeat iniciado');
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      console.log('💓 Heartbeat detenido');
    }
  }

  startDataGeneration() {
    // Enviar diferentes tipos de datos cada 10 segundos
    this.dataInterval = setInterval(() => {
      this.generateAndSendData();
    }, 10000);
    
    console.log('📊 Generación de datos iniciada');
    
    // Enviar datos inmediatamente
    this.generateAndSendData();
  }

  stopDataGeneration() {
    if (this.dataInterval) {
      clearInterval(this.dataInterval);
      this.dataInterval = null;
      console.log('📊 Generación de datos detenida');
    }
  }

  generateAndSendData() {
    const dataTypes = [
      this.generateSystemMetrics,
      this.generateEventLog,
      this.generateProcessInfo,
      this.generateNetworkStats,
      this.generateFileOperations,
      this.generateUserActivity,
      this.generateErrorReport,
      this.generateConfigChange
    ];

    // Seleccionar tipo de dato aleatorio
    const generator = dataTypes[Math.floor(Math.random() * dataTypes.length)];
    const data = generator.call(this);
    
    this.sendGenericMessage(data);
  }

  generateSystemMetrics() {
    return {
      category: 'monitoring',
      priority: 'normal',
      payload: {
        title: 'Métricas del Sistema',
        metrics: {
          cpu_usage: Math.random() * 100,
          memory_usage: Math.random() * 100,
          disk_usage: Math.random() * 100,
          network_in: Math.random() * 1000,
          network_out: Math.random() * 1000,
          load_average: Math.random() * 4,
          active_processes: Math.floor(Math.random() * 500) + 50,
          temperature: Math.random() * 80 + 20
        }
      },
      metadata: {
        source: 'system_monitor',
        collection_method: 'automatic'
      }
    };
  }

  generateEventLog() {
    const events = [
      'User login detected',
      'Service started',
      'Configuration updated',
      'Backup completed',
      'Security scan finished',
      'Update installed',
      'Cache cleared',
      'Database optimized'
    ];

    return {
      category: 'events',
      priority: 'normal',
      payload: {
        title: 'Evento del Sistema',
        event: events[Math.floor(Math.random() * events.length)],
        severity: ['info', 'warning', 'success'][Math.floor(Math.random() * 3)],
        details: {
          timestamp: new Date().toISOString(),
          source: 'system_logger',
          user_id: Math.floor(Math.random() * 1000)
        }
      },
      metadata: {
        source: 'event_logger',
        automated: true
      }
    };
  }

  generateProcessInfo() {
    const processes = [
      'nginx', 'mysql', 'redis', 'node', 'python', 'java', 'apache', 'postgres'
    ];

    return {
      category: 'system',
      priority: 'low',
      payload: {
        title: 'Información de Procesos',
        process_name: processes[Math.floor(Math.random() * processes.length)],
        pid: Math.floor(Math.random() * 32768) + 1000,
        memory_mb: Math.floor(Math.random() * 1024) + 50,
        cpu_percent: Math.random() * 100,
        status: ['running', 'sleeping', 'idle'][Math.floor(Math.random() * 3)],
        uptime_seconds: Math.floor(Math.random() * 86400)
      }
    };
  }

  generateNetworkStats() {
    return {
      category: 'network',
      priority: 'normal',
      payload: {
        title: 'Estadísticas de Red',
        interface: 'eth0',
        bytes_sent: Math.floor(Math.random() * 1000000),
        bytes_received: Math.floor(Math.random() * 1000000),
        packets_sent: Math.floor(Math.random() * 10000),
        packets_received: Math.floor(Math.random() * 10000),
        errors: Math.floor(Math.random() * 10),
        dropped: Math.floor(Math.random() * 5)
      },
      metadata: {
        collection_interval: '10s',
        interface_type: 'ethernet'
      }
    };
  }

  generateFileOperations() {
    const operations = ['create', 'read', 'update', 'delete', 'copy', 'move'];
    const files = [
      '/var/log/app.log',
      '/tmp/cache_file.tmp',
      '/home/user/document.txt',
      '/etc/config.conf',
      '/data/backup.sql'
    ];

    return {
      category: 'file_operations',
      priority: 'low',
      payload: {
        title: 'Operación de Archivo',
        operation: operations[Math.floor(Math.random() * operations.length)],
        file_path: files[Math.floor(Math.random() * files.length)],
        size_bytes: Math.floor(Math.random() * 1048576),
        success: Math.random() > 0.1, // 90% de éxito
        duration_ms: Math.floor(Math.random() * 1000) + 10
      }
    };
  }

  generateUserActivity() {
    const activities = [
      'page_view', 'login', 'logout', 'file_download', 'form_submit', 
      'search_query', 'api_call', 'button_click'
    ];

    return {
      category: 'user_activity',
      priority: 'normal',
      payload: {
        title: 'Actividad de Usuario',
        user_id: Math.floor(Math.random() * 1000) + 1,
        activity: activities[Math.floor(Math.random() * activities.length)],
        session_id: `sess_${Math.random().toString(36).substr(2, 9)}`,
        ip_address: `192.168.1.${Math.floor(Math.random() * 254) + 1}`,
        user_agent: 'Mozilla/5.0 (compatible; DataLoggerBot/1.0)',
        timestamp: new Date().toISOString()
      },
      metadata: {
        privacy_level: 'anonymized',
        retention_days: 30
      }
    };
  }

  generateErrorReport() {
    const errorTypes = [
      'DatabaseConnectionError',
      'FileNotFoundException',
      'PermissionDeniedError',
      'TimeoutError',
      'ValidationError'
    ];

    return {
      category: 'errors',
      priority: 'high',
      payload: {
        title: 'Reporte de Error',
        error_type: errorTypes[Math.floor(Math.random() * errorTypes.length)],
        message: 'Error simulado para demostración',
        stack_trace: 'Error: Simulated error\\n    at generateErrorReport (/app/bot.js:123)',
        severity: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)],
        affected_component: 'data_processor'
      },
      metadata: {
        auto_reported: true,
        requires_attention: Math.random() > 0.7
      }
    };
  }

  generateConfigChange() {
    const configKeys = [
      'max_connections', 'timeout_seconds', 'cache_size', 'log_level', 
      'backup_interval', 'security_policy'
    ];

    return {
      category: 'configuration',
      priority: 'normal',
      payload: {
        title: 'Cambio de Configuración',
        config_key: configKeys[Math.floor(Math.random() * configKeys.length)],
        old_value: Math.floor(Math.random() * 100),
        new_value: Math.floor(Math.random() * 100),
        changed_by: 'system_admin',
        reason: 'Performance optimization'
      },
      metadata: {
        change_type: 'automatic',
        rollback_available: true
      }
    };
  }

  sendGenericMessage(data) {
    const message = {
      type: 'generic_message',
      category: data.category,
      priority: data.priority,
      expectResponse: Math.random() > 0.7, // 30% de las veces esperar respuesta
      requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      payload: data.payload,
      metadata: {
        ...data.metadata,
        botName: BOT_CONFIG.botName,
        generated_at: new Date().toISOString(),
        data_version: '1.0'
      }
    };

    this.send(message);
    console.log(`📊 Enviado: ${data.category} - ${data.payload.title}`);
  }

  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      
      console.log(`🔄 Reintentando conexión en ${delay}ms (intento ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      console.error('❌ Máximo número de reintentos alcanzado. Cerrando bot.');
      process.exit(1);
    }
  }

  disconnect() {
    console.log('🛑 Desconectando bot...');
    this.stopHeartbeat();
    this.stopDataGeneration();
    
    if (this.ws) {
      this.ws.close();
    }
  }
}

// Manejar cierre graceful
process.on('SIGINT', () => {
  console.log('\\n🛑 Recibida señal SIGINT, cerrando bot...');
  if (bot) {
    bot.disconnect();
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\\n🛑 Recibida señal SIGTERM, cerrando bot...');
  if (bot) {
    bot.disconnect();
  }
  process.exit(0);
});

// Inicializar y ejecutar bot
console.log('🤖 Iniciando Data Logger Bot...');
loadApiKey();

const bot = new DataLoggerBot();
bot.connect();

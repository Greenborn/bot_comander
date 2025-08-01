#!/usr/bin/env node
import WebSocket from 'ws';

// Configuración del bot con las credenciales generadas
const BOT_CONFIG = {
  username: 'TestBot01',
  apiKey: 'bot_testbot01_mdsdvcr8_7aef69ee228df10eb568cc582898ddae',
  botName: 'Test Bot v1.0',
  serverUrl: 'ws://localhost:8080',
  heartbeatInterval: 30000
};

class SimpleBot {
  constructor(config) {
    this.config = config;
    this.ws = null;
    this.isAuthenticated = false;
    this.heartbeatTimer = null;
  }

  connect() {
    console.log(`🔌 Conectando a ${this.config.serverUrl}...`);
    
    this.ws = new WebSocket(this.config.serverUrl);
    
    this.ws.on('open', () => {
      console.log('✅ Conexión WebSocket establecida');
    });
    
    this.ws.on('message', (data) => {
      this.handleMessage(JSON.parse(data.toString()));
    });
    
    this.ws.on('close', () => {
      console.log('❌ Conexión cerrada');
      this.stopHeartbeat();
    });
    
    this.ws.on('error', (error) => {
      console.error('❌ Error de WebSocket:', error.message);
    });
  }

  handleMessage(message) {
    console.log('📨 Mensaje recibido:', message.type);
    
    switch (message.type) {
      case 'identify_request':
        this.sendIdentification();
        break;
        
      case 'welcome':
        if (message.authenticated) {
          console.log('🎉 ¡Autenticación exitosa!');
          console.log(`💬 ${message.message}`);
          this.isAuthenticated = true;
          this.startHeartbeat();
        }
        break;
        
      case 'error':
        console.error(`❌ Error del servidor: ${message.message}`);
        if (message.code?.includes('CREDENTIAL')) {
          process.exit(1);
        }
        break;
        
      case 'heartbeat_ack':
        console.log('💓 Heartbeat confirmado');
        break;
    }
  }

  sendIdentification() {
    const identMessage = {
      type: 'identify',
      clientType: 'bot',
      username: this.config.username,
      apiKey: this.config.apiKey,
      botName: this.config.botName
    };
    
    console.log(`🔐 Enviando identificación para: ${this.config.username}`);
    this.send(identMessage);
  }

  startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
    }, this.config.heartbeatInterval);
    
    console.log(`💓 Heartbeat iniciado (cada ${this.config.heartbeatInterval/1000}s)`);
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  sendHeartbeat() {
    if (!this.isAuthenticated) return;
    
    const heartbeat = {
      type: 'heartbeat',
      timestamp: Date.now(),
      status: {
        state: 'idle',
        currentAction: null,
        actionsQueued: 0,
        systemInfo: {
          cpu: Math.random() * 100,
          memory: Math.random() * 100,
          uptime: process.uptime() * 1000
        }
      }
    };
    
    this.send(heartbeat);
  }

  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }
}

console.log('🤖 Bot Commander - Cliente de Prueba');
console.log('===================================');
console.log(`👤 Usuario: ${BOT_CONFIG.username}`);
console.log(`🏷️  Nombre: ${BOT_CONFIG.botName}`);
console.log(`🔗 Servidor: ${BOT_CONFIG.serverUrl}`);
console.log('');

const bot = new SimpleBot(BOT_CONFIG);
bot.connect();

// Manejar CTRL+C
process.on('SIGINT', () => {
  console.log('\n👋 Desconectando...');
  bot.stopHeartbeat();
  if (bot.ws) bot.ws.close();
  process.exit(0);
});

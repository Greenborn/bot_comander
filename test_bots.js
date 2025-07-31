const WebSocket = require('ws');

class TestBot {
  constructor(botName) {
    this.botName = botName;
    this.ws = null;
    this.heartbeatInterval = null;
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
          timestamp: Date.now()
        }));
      }
    }, 30000); // Cada 30 segundos
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

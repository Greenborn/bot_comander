#!/usr/bin/env node
import readline from 'readline';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

// Ruta del archivo de configuración de bots
const BOT_KEYS_FILE = path.join(__dirname, '..', 'bot-keys.json');

// Generar API key único
function generateApiKey(botUsername) {
  const timestamp = Date.now().toString(36);
  const randomPart = crypto.randomBytes(16).toString('hex');
  return `bot_${botUsername.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${timestamp}_${randomPart}`;
}

// Cargar configuración de bots existente
function loadBotKeys() {
  if (!fs.existsSync(BOT_KEYS_FILE)) {
    return {};
  }
  
  try {
    const content = fs.readFileSync(BOT_KEYS_FILE, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error('❌ Error al leer archivo de claves de bots:', error.message);
    return {};
  }
}

// Guardar configuración de bots
function saveBotKeys(botKeys) {
  try {
    const content = JSON.stringify(botKeys, null, 2);
    fs.writeFileSync(BOT_KEYS_FILE, content, 'utf8');
    
    // Establecer permisos restrictivos
    fs.chmodSync(BOT_KEYS_FILE, 0o600);
  } catch (error) {
    console.error('❌ Error al guardar archivo de claves de bots:', error.message);
    throw error;
  }
}

// Registrar nuevo bot o actualizar existente
async function registerBot(botUsername) {
  const botKeys = loadBotKeys();
  const saltRounds = 12;
  
  // Generar nueva API key
  const apiKey = generateApiKey(botUsername);
  const hashedApiKey = await bcrypt.hash(apiKey, saltRounds);
  
  const isExisting = botKeys[botUsername];
  
  if (isExisting) {
    console.log(`⚠️  El bot "${botUsername}" ya existe.`);
    console.log('🔄 Generando nueva API key y actualizando configuración...');
  } else {
    console.log(`✨ Registrando nuevo bot: "${botUsername}"`);
  }
  
  // Actualizar configuración
  botKeys[botUsername] = {
    username: botUsername,
    apiKeyHash: hashedApiKey,
    createdAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    isActive: true
  };
  
  // Guardar archivo
  saveBotKeys(botKeys);
  
  console.log('✅ Bot registrado exitosamente!');
  console.log(`👤 Usuario: ${botUsername}`);
  console.log(`🔑 API Key: ${apiKey}`);
  console.log('📁 Configuración guardada en bot-keys.json');
  console.log('');
  console.log('⚠️  IMPORTANTE: Guarda esta API key de forma segura.');
  console.log('   Esta es la única vez que se mostrará en texto plano.');
  console.log('');
  console.log('💡 Uso en el bot cliente:');
  console.log(`   apiKey: "${apiKey}"`);
  
  return apiKey;
}

// Listar bots registrados
function listBots() {
  const botKeys = loadBotKeys();
  const bots = Object.values(botKeys);
  
  if (bots.length === 0) {
    console.log('📭 No hay bots registrados.');
    return;
  }
  
  console.log('🤖 Bots registrados:');
  console.log('');
  
  bots.forEach((bot, index) => {
    const status = bot.isActive ? '🟢 Activo' : '🔴 Inactivo';
    console.log(`${index + 1}. ${bot.username}`);
    console.log(`   Estado: ${status}`);
    console.log(`   Creado: ${new Date(bot.createdAt).toLocaleString()}`);
    console.log(`   Actualizado: ${new Date(bot.lastUpdated).toLocaleString()}`);
    console.log('');
  });
}

// Desactivar bot
async function deactivateBot(botUsername) {
  const botKeys = loadBotKeys();
  
  if (!botKeys[botUsername]) {
    console.log(`❌ Bot "${botUsername}" no encontrado.`);
    return;
  }
  
  botKeys[botUsername].isActive = false;
  botKeys[botUsername].lastUpdated = new Date().toISOString();
  
  saveBotKeys(botKeys);
  console.log(`✅ Bot "${botUsername}" desactivado exitosamente.`);
}

// Reactivar bot
async function reactivateBot(botUsername) {
  const botKeys = loadBotKeys();
  
  if (!botKeys[botUsername]) {
    console.log(`❌ Bot "${botUsername}" no encontrado.`);
    return;
  }
  
  botKeys[botUsername].isActive = true;
  botKeys[botUsername].lastUpdated = new Date().toISOString();
  
  saveBotKeys(botKeys);
  console.log(`✅ Bot "${botUsername}" reactivado exitosamente.`);
}

// Eliminar bot
async function deleteBot(botUsername) {
  const botKeys = loadBotKeys();
  
  if (!botKeys[botUsername]) {
    console.log(`❌ Bot "${botUsername}" no encontrado.`);
    return;
  }
  
  const confirm = await question(`⚠️  ¿Estás seguro de eliminar el bot "${botUsername}"? (s/N): `);
  
  if (confirm.toLowerCase() !== 's' && confirm.toLowerCase() !== 'si') {
    console.log('❌ Operación cancelada.');
    return;
  }
  
  delete botKeys[botUsername];
  saveBotKeys(botKeys);
  console.log(`✅ Bot "${botUsername}" eliminado exitosamente.`);
}

// Mostrar ayuda
function showHelp() {
  console.log('🤖 Bot Commander - Gestión de API Keys');
  console.log('=====================================');
  console.log('');
  console.log('Uso:');
  console.log('  node scripts/manage-bot-keys.js <comando> [argumentos]');
  console.log('');
  console.log('Comandos disponibles:');
  console.log('  register <username>    - Registrar nuevo bot o generar nueva API key');
  console.log('  list                   - Listar todos los bots registrados');
  console.log('  deactivate <username>  - Desactivar un bot (no podrá conectarse)');
  console.log('  reactivate <username>  - Reactivar un bot desactivado');
  console.log('  delete <username>      - Eliminar un bot permanentemente');
  console.log('  help                   - Mostrar esta ayuda');
  console.log('');
  console.log('Ejemplos:');
  console.log('  node scripts/manage-bot-keys.js register WebCrawler01');
  console.log('  node scripts/manage-bot-keys.js list');
  console.log('  node scripts/manage-bot-keys.js deactivate WebCrawler01');
}

// Función principal
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const username = args[1];
  
  console.log('🔐 Bot Commander - Gestión de API Keys');
  console.log('======================================\n');
  
  try {
    switch (command) {
      case 'register':
        if (!username) {
          console.log('❌ Error: Se requiere especificar el nombre de usuario del bot.');
          console.log('Uso: node scripts/manage-bot-keys.js register <username>');
          process.exit(1);
        }
        
        // Validar nombre de usuario
        if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
          console.log('❌ Error: El nombre de usuario solo puede contener letras, números, guiones y guiones bajos.');
          process.exit(1);
        }
        
        await registerBot(username);
        break;
        
      case 'list':
        listBots();
        break;
        
      case 'deactivate':
        if (!username) {
          console.log('❌ Error: Se requiere especificar el nombre de usuario del bot.');
          console.log('Uso: node scripts/manage-bot-keys.js deactivate <username>');
          process.exit(1);
        }
        await deactivateBot(username);
        break;
        
      case 'reactivate':
        if (!username) {
          console.log('❌ Error: Se requiere especificar el nombre de usuario del bot.');
          console.log('Uso: node scripts/manage-bot-keys.js reactivate <username>');
          process.exit(1);
        }
        await reactivateBot(username);
        break;
        
      case 'delete':
        if (!username) {
          console.log('❌ Error: Se requiere especificar el nombre de usuario del bot.');
          console.log('Uso: node scripts/manage-bot-keys.js delete <username>');
          process.exit(1);
        }
        await deleteBot(username);
        break;
        
      case 'help':
      case '--help':
      case '-h':
        showHelp();
        break;
        
      default:
        console.log('❌ Comando no reconocido.');
        console.log('');
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Error durante la operación:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

main();

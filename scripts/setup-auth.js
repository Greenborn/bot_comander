#!/usr/bin/env node
import readline from 'readline';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ruta del archivo .env en el directorio raíz
const ENV_FILE = path.resolve(__dirname, '../.env');

// Para mode de testing con argumentos de línea de comandos
const args = process.argv.slice(2);
const isTestMode = args.includes('--test');

// Función para leer el archivo .env existente
function readEnvFile() {
  if (!fs.existsSync(ENV_FILE)) {
    console.error('❌ No se encontró el archivo .env en el directorio raíz');
    process.exit(1);
  }
  
  try {
    return fs.readFileSync(ENV_FILE, 'utf8');
  } catch (error) {
    console.error('❌ Error al leer el archivo .env:', error.message);
    process.exit(1);
  }
}

// Función para actualizar o agregar una línea en el contenido del .env
function updateEnvLine(content, key, value) {
  const lines = content.split('\n');
  let found = false;
  let commentedLineIndex = -1;
  
  // Primera pasada: buscar línea activa existente
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith(`${key}=`)) {
      lines[i] = `${key}=${value}`;
      found = true;
      break;
    }
    // Recordar la posición de la línea comentada
    if (line.startsWith(`# ${key}=`) && commentedLineIndex === -1) {
      commentedLineIndex = i;
    }
  }
  
  // Si no se encontró línea activa, pero hay línea comentada, reemplazarla
  if (!found && commentedLineIndex !== -1) {
    lines[commentedLineIndex] = `${key}=${value}`;
    found = true;
  }
  
  // Si no se encontró ninguna línea, agregar nueva
  if (!found) {
    // Buscar la sección de Authentication Configuration
    let insertIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('# Authentication Configuration')) {
        // Encontrar el final de esta sección (línea vacía o nueva sección)
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j].trim() === '' || lines[j].startsWith('# ') && !lines[j].includes('AUTH_')) {
            insertIndex = j;
            break;
          }
        }
        break;
      }
    }
    
    if (insertIndex !== -1) {
      lines.splice(insertIndex, 0, `${key}=${value}`);
    } else {
      // Si no hay sección de autenticación, agregar al final
      lines.push(`${key}=${value}`);
    }
  }
  
  return lines.join('\n');
}

// Función para limpiar duplicados de autenticación
function cleanAuthDuplicates(content) {
  const lines = content.split('\n');
  const authKeys = ['AUTH_USERNAME', 'AUTH_PASSWORD_HASH', 'JWT_SECRET'];
  const cleanedLines = [];
  const seenKeys = new Set();
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    let isAuthLine = false;
    let keyName = null;
    
    // Verificar si es una línea de autenticación
    for (const key of authKeys) {
      if (trimmedLine.startsWith(`${key}=`) || trimmedLine.startsWith(`# ${key}=`)) {
        isAuthLine = true;
        keyName = key;
        break;
      }
    }
    
    if (isAuthLine) {
      // Solo agregar si es una línea activa y no hemos visto esta clave
      if (trimmedLine.startsWith(`${keyName}=`) && !seenKeys.has(keyName)) {
        cleanedLines.push(line);
        seenKeys.add(keyName);
      }
      // Ignorar líneas comentadas y duplicados
    } else {
      // No es línea de autenticación, agregarla normalmente
      cleanedLines.push(line);
    }
  }
  
  return cleanedLines.join('\n');
}

// Función para escribir el archivo .env actualizado
function writeEnvFile(content) {
  try {
    // Limpiar duplicados antes de escribir
    const cleanContent = cleanAuthDuplicates(content);
    fs.writeFileSync(ENV_FILE, cleanContent);
    console.log('✅ Archivo .env actualizado correctamente');
  } catch (error) {
    console.error('❌ Error al escribir el archivo .env:', error.message);
    process.exit(1);
  }
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

function questionHidden(query) {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const stdout = process.stdout;
    
    stdout.write(query);
    
    // Verificar si estamos en un TTY (terminal interactivo)
    if (stdin.isTTY && !isTestMode) {
      stdin.setRawMode(true);
      stdin.resume();
      stdin.setEncoding('utf8');
      
      let password = '';
      
      const onData = (char) => {
        switch (char) {
          case '\n':
          case '\r':
          case '\u0004': // Ctrl-D
            stdin.setRawMode(false);
            stdin.pause();
            stdin.removeListener('data', onData);
            stdout.write('\n');
            resolve(password);
            break;
          case '\u0003': // Ctrl-C
            stdout.write('\n');
            process.exit();
            break;
          case '\b':
          case '\u007f': // Backspace
            if (password.length > 0) {
              password = password.slice(0, -1);
              stdout.write('\b \b');
            }
            break;
          default:
            password += char;
            stdout.write('*');
            break;
        }
      };
      
      stdin.on('data', onData);
    } else {
      // Si no es TTY o estamos en modo test, leer la línea normalmente
      rl.question('', resolve);
    }
  });
}

// Función para configurar la autenticación
async function setupAuth(username, password) {
  try {
    console.log('🔐 Configurando autenticación...');
    
    // Generar hash de la contraseña
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Generar secreto JWT aleatorio
    const jwtSecret = crypto.randomBytes(16).toString('hex');
    
    // Leer el contenido actual del .env
    let envContent = readEnvFile();
    
    // Actualizar las variables de autenticación
    envContent = updateEnvLine(envContent, 'AUTH_USERNAME', username);
    envContent = updateEnvLine(envContent, 'AUTH_PASSWORD_HASH', passwordHash);
    envContent = updateEnvLine(envContent, 'JWT_SECRET', jwtSecret);
    
    // Escribir el archivo actualizado
    writeEnvFile(envContent);
    
    console.log('✅ Autenticación configurada exitosamente');
    console.log(`👤 Usuario: ${username}`);
    console.log('🔑 Contraseña configurada y hasheada');
    console.log('🎟️  JWT secret generado');
    console.log('');
    console.log('💡 Ahora puedes iniciar el servidor y acceder al panel con estas credenciales');
    
  } catch (error) {
    console.error('❌ Error configurando autenticación:', error.message);
    process.exit(1);
  }
}

async function main() {
  console.log('🔐 Configuración de Autenticación - Bot Commander');
  console.log('================================================\n');
  
  try {
    let username, password;
    
    // Si se pasan argumentos, usarlos (para testing)
    if (args.length >= 2) {
      username = args[0];
      password = args[1];
      console.log(`👤 Usuario: ${username}`);
      console.log('🔑 Contraseña: ********');
    } else {
      // Solicitar usuario
      username = await question('👤 Ingrese el nombre de usuario: ');
      
      if (!username || username.trim().length === 0) {
        console.log('❌ El nombre de usuario no puede estar vacío');
        process.exit(1);
      }
      
      // Solicitar contraseña
      password = await questionHidden('🔑 Ingrese la contraseña: ');
      
      if (!password || password.length < 6) {
        console.log('\n❌ La contraseña debe tener al menos 6 caracteres');
        process.exit(1);
      }
      
      // Confirmar contraseña
      const confirmPassword = await questionHidden('🔑 Confirme la contraseña: ');
      
      if (password !== confirmPassword) {
        console.log('\n❌ Las contraseñas no coinciden');
        process.exit(1);
      }
    }
    
    await setupAuth(username.trim(), password);
    
  } catch (error) {
    console.error('\n❌ Error durante la configuración:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

main();

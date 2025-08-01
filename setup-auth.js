#!/usr/bin/env node
import readline from 'readline';
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Para mode de testing con argumentos de línea de comandos
const args = process.argv.slice(2);
const isTestMode = args.includes('--test');

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

async function updateEnvFile(username, hashedPassword) {
  const envPath = path.join(__dirname, '.env');
  let envContent = '';
  
  // Leer el archivo .env existente si existe
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }
  
  // Remover líneas existentes de AUTH_USERNAME y AUTH_PASSWORD_HASH si existen
  const lines = envContent.split('\n').filter(line => 
    !line.startsWith('AUTH_USERNAME=') && 
    !line.startsWith('AUTH_PASSWORD_HASH=') &&
    !line.startsWith('JWT_SECRET=')
  );
  
  // Generar un JWT secret aleatorio
  const jwtSecret = Math.random().toString(36).substring(2, 15) + 
                   Math.random().toString(36).substring(2, 15) + 
                   Math.random().toString(36).substring(2, 15);
  
  // Agregar las nuevas configuraciones
  lines.push('');
  lines.push('# Authentication Configuration');
  lines.push(`AUTH_USERNAME=${username}`);
  lines.push(`AUTH_PASSWORD_HASH=${hashedPassword}`);
  lines.push(`JWT_SECRET=${jwtSecret}`);
  
  // Escribir el archivo .env actualizado
  fs.writeFileSync(envPath, lines.join('\n'));
}

async function main() {
  console.log('🔐 Configuración de Autenticación - Bot Commander');
  console.log('================================================\n');
  
  try {
    let username, password, confirmPassword;
    
    // Si se pasan argumentos, usarlos (para testing)
    if (args.length >= 2) {
      username = args[0];
      password = args[1];
      confirmPassword = args[1]; // Asumir que la confirmación es la misma
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
      confirmPassword = await questionHidden('🔑 Confirme la contraseña: ');
      
      if (password !== confirmPassword) {
        console.log('\n❌ Las contraseñas no coinciden');
        process.exit(1);
      }
    }
    
    console.log('\n🔄 Generando hash de la contraseña...');
    
    // Generar hash de la contraseña
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    console.log('💾 Actualizando archivo .env...');
    
    // Actualizar el archivo .env
    await updateEnvFile(username.trim(), hashedPassword);
    
    console.log('✅ Configuración de autenticación completada exitosamente!');
    console.log(`👤 Usuario: ${username.trim()}`);
    console.log('🔑 Contraseña: ********');
    console.log('📁 Configuración guardada en .env');
    console.log('\n💡 Recuerda reiniciar el servidor para aplicar los cambios.');
    
  } catch (error) {
    console.error('\n❌ Error durante la configuración:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

main();

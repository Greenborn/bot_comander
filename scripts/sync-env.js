// Sincroniza .env raíz con frontend/.env
const fs = require('fs');
const path = require('path');

const rootEnv = path.resolve(__dirname, '../.env');
const frontendEnv = path.resolve(__dirname, '../frontend/.env');

try {
  fs.copyFileSync(rootEnv, frontendEnv);
  console.log('✅ .env sincronizado en frontend/.env');
} catch (err) {
  console.error('❌ Error al sincronizar .env:', err.message);
  process.exit(1);
}

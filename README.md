# Bot Commander

Sistema de control y monitoreo de bots a través de WebSockets en tiempo real.

## Estructura del Proyecto

```
bot_comander/
├── backend/          # Servidor Node.js + Express + WebSocket
├── frontend/         # Cliente Vue.js
├── .env             # Variables de entorno (no en git)
├── .env.example     # Plantilla de variables de entorno
└── ENVIRONMENT.md   # Documentación de variables de entorno
```

## Setup Inicial

### 1. Configurar Variables de Entorno
```bash
cp .env.example .env
```

### 2. Instalar Dependencias
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 3. Ejecutar en Desarrollo
```bash
# Backend (en una terminal)
cd backend
npm run dev

# Frontend (en otra terminal)
cd frontend
npm run dev
```

## Variables de Entorno

El proyecto utiliza las siguientes variables de entorno:

- `API_PORT`: Puerto del servidor backend (default: 3000)
- `VITE_WS_URL`: URL del WebSocket para el frontend (default: ws://localhost:3000)

Ver `ENVIRONMENT.md` para documentación completa.

## Arquitectura

Este servicio utiliza:
- **Backend**: Node.js + Express + WebSocket Server
- **Frontend**: Vue.js + Vite + Bootstrap 5
- **Comunicación**: WebSockets para tiempo real con identificación de tipos de cliente

### Tipos de Clientes

El sistema distingue entre dos tipos de clientes:

1. **Bots**: Clientes automatizados que se conectan para ser monitoreados
   - Se identifican como `type: "bot"`
   - Envían heartbeats periódicos
   - Pueden recibir comandos del panel
   - Aparecen en la sección "Bots Conectados"

2. **Paneles de Control**: Interfaces de usuario para monitoreo
   - Se identifican como `type: "panel"`
   - Reciben actualizaciones de estado en tiempo real
   - Pueden enviar comandos a los bots
   - Aparecen en la sección "Paneles de Control"

### Protocolo WebSocket

Al conectarse, todos los clientes reciben un mensaje `identify_request` y deben responder con:

```json
{
  "type": "identify",
  "clientType": "bot" // o "panel"
  "botName": "NombreBot" // solo para bots
}
```

Ver `arquitectura.md` para detalles técnicos completos.

## Desarrollo

### Scripts Disponibles

**Backend:**
- `npm start`: Ejecutar en producción
- `npm run dev`: Ejecutar con nodemon (desarrollo)

**Frontend:**
- `npm run dev`: Servidor de desarrollo
- `npm run build`: Build para producción
- `npm run dev:all`: Ejecutar backend + frontend simultáneamente

### Testing

Para probar la funcionalidad con bots simulados:

```bash
# En una terminal separada
node test_bots.js
```

Esto conectará 3 bots de prueba que aparecerán en el panel de control.

## Contribución

1. Clona el repositorio
2. Configura las variables de entorno
3. Instala dependencias
4. Ejecuta en modo desarrollo
5. Haz tus cambios y crea un pull request

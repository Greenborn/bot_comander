# Bot Commander

Sistema de control y monitoreo de bots a través de WebSockets en tiempo real.

## Estructura del Proyecto

```
bot_comander/
├── backend/          # Servidor Node.js + Express + WebSocket
├── frontend/         # Cliente Vue.js
├── .env             # Variables de entorno (no en git)
├── .env.example     # Plantilla de variables de entorno
├── ENVIRONMENT.md   # Documentación de variables de entorno
├── PROTOCOL.md      # Especificación completa del protocolo WebSocket
├── arquitectura.md  # Documentación técnica de la arquitectura
└── test_bots.js     # Bots simulados para testing
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

### 3. Configurar Autenticación

Antes de ejecutar el servidor por primera vez, configura las credenciales de acceso:

```bash
cd backend
npm run setup-auth
```

Este script te pedirá un usuario y contraseña para acceder al panel de control. La contraseña se almacenará de forma segura como hash en el archivo `.env`.

### 4. Ejecutar en Desarrollo
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
- `API_HOST`: Host del servidor backend (default: 0.0.0.0)
- `VITE_WS_URL`: URL del WebSocket para el frontend (default: ws://localhost:3000)
- `AUTH_USERNAME`: Usuario para acceso al panel (configurado con setup-auth.js)
- `AUTH_PASSWORD_HASH`: Hash de la contraseña (configurado con setup-auth.js)
- `JWT_SECRET`: Secreto para tokens JWT (generado automáticamente)

Ver `ENVIRONMENT.md` para documentación completa.

## Arquitectura

Este servicio utiliza:
- **Backend**: Node.js + Express + WebSocket Server
- **Frontend**: Vue.js + Vite + Bootstrap 5  
- **Autenticación**: JWT tokens con bcrypt para hash de contraseñas
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

Bot Commander utiliza un protocolo WebSocket completo para la comunicación entre bots y paneles de control.

**📋 Documentación Completa**: Ver [`PROTOCOL.md`](./PROTOCOL.md) para:
- Especificación completa de tipos de mensajes
- Códigos de error estándar y estados de bot
- Ejemplos de implementación para bots y paneles
- Mejores prácticas y guías de desarrollo

#### Flujo Básico de Conexión

1. **Conexión**: Cliente se conecta al WebSocket
2. **Identificación**: Servidor solicita identificación (`identify_request`)
3. **Respuesta**: Cliente responde con tipo (`bot` o `panel`)
4. **Bienvenida**: Servidor confirma conexión (`welcome`)
5. **Operación**: Cliente puede enviar/recibir mensajes según su tipo

#### Tipos de Clientes

- **Bots**: Se identifican con `clientType: "bot"`, envían heartbeats, ejecutan acciones
- **Paneles**: Se identifican con `clientType: "panel"`, reciben actualizaciones, envían comandos

Ver `arquitectura.md` para detalles técnicos completos.
```

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

#### Acciones de Prueba Disponibles

Los bots de prueba implementan el protocolo completo definido en [`PROTOCOL.md`](./PROTOCOL.md) e incluyen:

- **`take_screenshot`**: Simula captura de pantalla (2s)
- **`navigate_to`**: Simula navegación web (3s)  
- **`get_status`**: Estado detallado del bot (inmediato)
- **`wait`**: Espera configurable (variable)

#### Ejemplo de Uso desde Panel

1. Conectar al panel web en `http://localhost:5173`
2. Verificar que aparezcan los 3 bots conectados
3. Los bots implementan el protocolo completo con heartbeat y manejo de acciones
4. Ver [`PROTOCOL.md`](./PROTOCOL.md) para detalles de implementación

## Contribución

1. Clona el repositorio
2. Configura las variables de entorno
3. Instala dependencias
4. Ejecuta en modo desarrollo
5. Haz tus cambios y crea un pull request

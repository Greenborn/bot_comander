# Variables de Entorno - Bot Commander

## Configuración de Variables de Entorno

Este proyecto utiliza variables de entorno para configurar el comportamiento de la aplicación en diferentes entornos (desarrollo, testing, producción).

## Archivos de Configuración

- **`.env`**: Archivo principal con variables reales (NO se incluye en git)
- **`.env.example`**: Archivo de ejemplo con las variables necesarias (SÍ se incluye en git)

## Setup Inicial

1. Copia el archivo de ejemplo:
   ```bash
   cp .env.example .env
   ```

2. Ajusta los valores según tu entorno local

## Variables Actuales

### Backend

| Variable | Descripción | Valor por Defecto | Uso |
|----------|-------------|-------------------|-----|
| `API_PORT` | Puerto donde corre el servidor backend | `8080` | `backend/src/index.js` |
| `API_HOST` | Host donde escucha el servidor | `0.0.0.0` | `backend/src/index.js` |
| `NODE_ENV` | Entorno de ejecución | `development` | General |
| `SERVE_FRONTEND_MODE` | Modo de servir el frontend | `development` | `backend/src/index.js` |

### Frontend

| Variable | Descripción | Valor por Defecto | Uso |
|----------|-------------|-------------------|-----|
| `VITE_WS_URL` | URL del WebSocket para conexión | `ws://localhost:8080` | `frontend/src/App.vue` |

### Autenticación

| Variable | Descripción | Valor por Defecto | Uso |
|----------|-------------|-------------------|-----|
| `AUTH_USERNAME` | Usuario para panel de control | `admin` | `backend/src/index.js` |
| `AUTH_PASSWORD_HASH` | Hash bcrypt de la contraseña | (generado) | `backend/src/index.js` |
| `JWT_SECRET` | Secreto para firmar tokens JWT | (generado) | `backend/src/index.js` |

## Modos de Frontend

### SERVE_FRONTEND_MODE

Esta variable controla cómo se sirve el frontend de la aplicación:

#### `development` (Por Defecto)
- **Comportamiento**: El backend redirige al servidor de desarrollo Vite
- **Ventajas**: Hot reload, debugging mejorado, compilación más rápida
- **Requisito**: El servidor Vite debe estar ejecutándose en puerto 5173
- **Comando**: `npm run dev` (ejecuta frontend y backend en paralelo)

```env
SERVE_FRONTEND_MODE=development
```

#### `production`
- **Comportamiento**: El backend construye y sirve archivos estáticos del frontend
- **Ventajas**: Una sola aplicación, optimizado para producción
- **Requisito**: Se ejecuta `npm run build` automáticamente
- **Comando**: `npm run start:production`

```env
SERVE_FRONTEND_MODE=production
```

## Configuración por Entorno

### Desarrollo Local
```env
API_PORT=8080
API_HOST=0.0.0.0
VITE_WS_URL=ws://localhost:8080
NODE_ENV=development
SERVE_FRONTEND_MODE=development
```

### Producción (ejemplo)
```env
API_PORT=8080
API_HOST=0.0.0.0
VITE_WS_URL=wss://tu-dominio.com
NODE_ENV=production
SERVE_FRONTEND_MODE=production
```

## Comandos Disponibles

### Desarrollo
```bash
# Ejecutar frontend y backend en paralelo (modo development)
npm run dev

# Solo backend en modo development
npm run dev:backend

# Solo frontend (servidor Vite)
npm run dev:frontend
```

### Producción
```bash
# Construir y ejecutar en modo production
npm run start:production

# Solo construir frontend
npm run build
```

## Troubleshooting

### Error de Conexión WebSocket
- Verifica que `VITE_WS_URL` apunte al puerto correcto
- Asegúrate de que el backend esté corriendo en el puerto especificado en `API_PORT`

### Frontend no se conecta
- Confirma que las variables empiecen con `VITE_`
- Reinicia el servidor de desarrollo después de cambiar variables de entorno

### Modo Desarrollo - Frontend no carga
- Verifica que el servidor Vite esté ejecutándose: `npm run dev:frontend`
- Confirma que esté accesible en `http://localhost:5173`
- El backend redirige automáticamente a esta URL

### Modo Producción - Error de Build
- Ejecuta `npm run build` manualmente para ver errores detallados
- Verifica que todas las dependencias estén instaladas en `/frontend`

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
| `API_PORT` | Puerto donde corre el servidor backend | `3000` | `backend/src/index.js` línea 23 |

### Frontend

| Variable | Descripción | Valor por Defecto | Uso |
|----------|-------------|-------------------|-----|
| `VITE_WS_URL` | URL del WebSocket para conexión | `ws://localhost:3000` | `frontend/src/App.vue` línea 19 |

## Notas Importantes

- **Prefijo VITE_**: Las variables del frontend deben empezar con `VITE_` para ser accesibles en el código Vue.js
- **Sincronización de Puertos**: Asegúrate de que `API_PORT` y la URL en `VITE_WS_URL` coincidan
- **Entorno de Desarrollo**: Los valores por defecto están optimizados para desarrollo local

## Configuración por Entorno

### Desarrollo Local
```env
API_PORT=3000
VITE_WS_URL=ws://localhost:3000
```

### Producción (ejemplo)
```env
API_PORT=8080
VITE_WS_URL=wss://tu-dominio.com
```

## Troubleshooting

### Error de Conexión WebSocket
- Verifica que `VITE_WS_URL` apunte al puerto correcto
- Asegúrate de que el backend esté corriendo en el puerto especificado en `API_PORT`

### Frontend no se conecta
- Confirma que las variables empiecen con `VITE_`
- Reinicia el servidor de desarrollo después de cambiar variables de entorno

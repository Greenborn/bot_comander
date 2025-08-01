# Tests - Bot Commander

Este directorio contiene las pruebas del sistema Bot Commander.

## Archivos de Prueba

### test_bots.js
Script de prueba que simula múltiples bots conectándose al servidor para validar:
- Conexiones WebSocket
- Identificación de bots
- Heartbeat y estado
- Descubrimiento de acciones
- Ejecución de comandos
- Manejo de errores

## Ejecutar Pruebas

### Desde la raíz del proyecto:
```bash
# Ejecutar todas las pruebas
npm test

# Ejecutar específicamente las pruebas de bots
npm run test:bots
```

### Directamente:
```bash
# Desde el directorio raíz
node test/test_bots.js

# Desde el directorio test
cd test
node test_bots.js
```

## Requisitos

Antes de ejecutar las pruebas, asegúrate de que:

1. **El servidor esté ejecutándose**:
   ```bash
   cd backend
   npm start
   ```

2. **La autenticación esté configurada**:
   ```bash
   npm run setup-auth
   ```

3. **Los bots de prueba estén registrados** (si las pruebas requieren autenticación):
   ```bash
   npm run register-bot WebCrawler-01
   npm run register-bot DataProcessor-02
   npm run register-bot Monitor-03
   ```

## Estructura de Pruebas

Las pruebas simulan el comportamiento real de los bots:

1. **Conexión**: Establece conexión WebSocket con el servidor
2. **Identificación**: Se identifica como bot con credenciales válidas
3. **Heartbeat**: Envía señales de vida periódicas
4. **Acciones**: Responde a solicitudes de acciones disponibles
5. **Comandos**: Ejecuta comandos recibidos del panel
6. **Desconexión**: Maneja la desconexión correctamente

## Personalización

Para agregar nuevas pruebas:

1. Crea nuevos archivos en este directorio
2. Actualiza el `package.json` con nuevos scripts de prueba
3. Documenta las nuevas pruebas en este README

## Solución de Problemas

### Error de conexión
- Verifica que el servidor esté ejecutándose en el puerto correcto
- Revisa los logs del servidor para errores

### Error de autenticación
- Asegúrate de que los bots estén registrados
- Verifica que las credenciales sean correctas

### Timeouts
- Aumenta los timeouts en las pruebas si el sistema es lento
- Verifica la conectividad de red

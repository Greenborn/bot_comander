# Seguridad - Bot Commander

## Autenticación y Autorización

### Sistema de Login

Bot Commander utiliza un sistema de autenticación basado en JWT (JSON Web Tokens) para proteger el acceso al panel de control.

### Configuración Inicial

1. **Configurar Credenciales**:
   ```bash
   cd backend
   npm run setup-auth
   ```

2. **Proceso de Configuración**:
   - Solicita nombre de usuario
   - Solicita contraseña (mínimo 6 caracteres)
   - Confirma la contraseña
   - Genera hash bcrypt de la contraseña (12 rounds)
   - Genera secreto JWT aleatorio
   - Actualiza el archivo `.env`

### Características de Seguridad

#### Hash de Contraseñas
- Utiliza **bcrypt** con 12 rounds para hash de contraseñas
- Las contraseñas nunca se almacenan en texto plano
- El hash se guarda en la variable `AUTH_PASSWORD_HASH` del `.env`

#### Tokens JWT
- Tiempo de expiración: **24 horas**
- Secreto generado aleatoriamente en `JWT_SECRET`
- Almacenado en localStorage del navegador
- Verificación automática en cada solicitud a la API

#### Rate Limiting
- **Endpoint de Login**: Máximo 5 intentos por IP cada 15 minutos
- Previene ataques de fuerza bruta
- Implementado con `express-rate-limit`

#### Protección de Rutas
- Todas las rutas de la API requieren autenticación
- Middleware `authenticateToken` valida JWT en cada request
- Respuestas de error estándar sin revelar información sensible

### Variables de Entorno de Seguridad

```bash
# Configuradas automáticamente por setup-auth.js
AUTH_USERNAME=admin
AUTH_PASSWORD_HASH=$2b$12$...
JWT_SECRET=randomGeneratedSecret123...
```

### Flujo de Autenticación

1. **Usuario visita el panel**:
   - Si no hay token válido → Muestra formulario de login
   - Si hay token válido → Verifica con backend → Acceso al dashboard

2. **Proceso de Login**:
   ```
   POST /api/login
   {
     "username": "admin",
     "password": "contraseña"
   }
   ```

3. **Respuesta Exitosa**:
   ```json
   {
     "success": true,
     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
     "message": "Login exitoso"
   }
   ```

4. **Uso del Token**:
   ```
   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

### Mejores Prácticas Implementadas

- ✅ Hash seguro de contraseñas (bcrypt)
- ✅ Tokens JWT con expiración
- ✅ Rate limiting en endpoints críticos
- ✅ Validación de entrada
- ✅ Manejo seguro de errores
- ✅ HTTPS recomendado en producción
- ✅ Secrets generados aleatoriamente

### Recomendaciones para Producción

1. **HTTPS**: Siempre usar HTTPS en producción
2. **Secretos Fuertes**: El script genera secretos seguros automáticamente
3. **Monitoreo**: Implementar logs de seguridad
4. **Backups**: Respaldar variables de entorno de forma segura
5. **Rotación**: Rotar JWT_SECRET periódicamente

### Regenerar Credenciales

Para cambiar las credenciales de acceso:

```bash
cd backend
npm run setup-auth
```

El script actualiza automáticamente el `.env` con las nuevas credenciales.

### Solución de Problemas

#### Error: "Autenticación no configurada"
```bash
cd backend
npm run setup-auth
```

#### Error: "Token inválido"
- Borrar localStorage del navegador
- Hacer login nuevamente

#### Error: "Demasiados intentos de login"
- Esperar 15 minutos
- Verificar que las credenciales sean correctas

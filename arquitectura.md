# Arquitectura del Servicio de Control de Bots

## Descripción General
Este servicio está diseñado para controlar y monitorear bots a través de una conexión persistente utilizando WebSockets. El backend está desarrollado en Node.js utilizando el framework Express, proporcionando una API robusta y eficiente para la gestión de conexiones y el registro de clientes.

## Componentes Principales

### 1. Servidor Express
- Provee la base para la aplicación HTTP.

### 2. WebSocket Server
- Utiliza una librería como `ws` o `socket.io` para habilitar la comunicación bidireccional en tiempo real.
- Permite a los bots (clientes) conectarse y mantener una sesión activa.

### 3. Registro de Clientes en Memoria
- Se mantiene un objeto en memoria (por ejemplo, un Map o un objeto simple) que almacena información relevante de cada cliente conectado (ID, estado, timestamp, etc.).
- Permite consultar, agregar y eliminar clientes conforme se conectan o desconectan.

## Flujo de Conexión
1. Un bot cliente se conecta al servidor mediante WebSocket.
2. El servidor registra al cliente en el objeto de clientes en memoria.
3. Se mantiene la comunicación en tiempo real para control, monitoreo y envío de comandos.
4. Al desconectarse, el cliente es removido del registro en memoria.

## Diagrama de Arquitectura

```
+-------------------+         WebSocket         +-------------------+
|   Bot Cliente 1   | <----------------------> |                   |
+-------------------+                          |                   |
                                               |                   |
+-------------------+         WebSocket        |                   |
|   Bot Cliente N   | <--------------------->  |   Servidor Node   |
+-------------------+                          |   (Express + ws)  |
                                               |                   |
                                               |                   |
                                               |  Registro en      |
                                               |  Memoria de       |
                                               |  Clientes         |
                                               +-------------------+
```

## Tecnologías Utilizadas
- **Node.js**: Entorno de ejecución para JavaScript en el servidor.
- **Express**: Framework para la gestión de rutas y middleware HTTP.
- **ws** o **socket.io**: Librerías para la gestión de WebSockets.

## Consideraciones
- El registro de clientes en memoria es volátil: si el servidor se reinicia, se pierde el estado.
- Para alta disponibilidad o persistencia, considerar una base de datos o almacenamiento distribuido.
- Se recomienda implementar mecanismos de autenticación y autorización para los bots.

## Ejemplo de Estructura de Código
```js
const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const clients = {};

wss.on('connection', (ws) => {
  const clientId = generateClientId();
  clients[clientId] = { ws, connectedAt: Date.now() };

  ws.on('close', () => {
    delete clients[clientId];
  });
});

server.listen(3000);
```

## Panel de Control (Frontend)

Se implementa un panel de control usando **Vue.js** (Composition API, sin TypeScript) que se conecta al WebSocket del backend para mostrar y controlar el estado de los bots en tiempo real.

### Características del Panel:
- Visualización de bots conectados y su estado.
- Envío de comandos a bots desde la interfaz.
- Actualización en tiempo real mediante WebSocket.

### Ejemplo de Conexión WebSocket en Vue (Composition API)
```js
<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const bots = ref([]);
let ws;

onMounted(() => {
  ws = new WebSocket(import.meta.env.VITE_WS_URL);
  ws.onmessage = (event) => {
    bots.value = JSON.parse(event.data);
  };
});

onUnmounted(() => {
  if (ws) ws.close();
});
</script>

<template>
  <div>
    <h2>Bots conectados</h2>
    <ul>
      <li v-for="bot in bots" :key="bot.id">
        {{ bot.id }} - {{ bot.estado }}
      </li>
    </ul>
  </div>
</template>
```

## Archivo .env Compartido

Tanto el backend como el frontend deben utilizar un archivo `.env` común para definir variables de entorno como la URL del WebSocket, puertos, etc. Ejemplo:

```env
WS_URL=ws://localhost:3000
API_URL=http://localhost:3000
```

Se recomienda ubicar este archivo en la raíz del proyecto y, durante el build/deploy, copiarlo o referenciarlo tanto en el backend como en el frontend.

---
Este documento describe la arquitectura base para el servicio de control de bots utilizando Node.js, Express y WebSockets, con registro de clientes en memoria, y un panel de control en Vue (Composition API, sin TypeScript) conectado por WebSocket. Incluye el uso de un archivo .env común para ambas aplicaciones.

import { ref, onUnmounted } from 'vue';

let ws = null;
const listeners = new Map();
const isConnected = ref(false);

function connect(url) {
  ws = new WebSocket(url);
  ws.onopen = () => {
    isConnected.value = true;
  };
  ws.onclose = () => {
    isConnected.value = false;
  };
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.requestId && listeners.has(data.requestId)) {
        listeners.get(data.requestId)(data);
        listeners.delete(data.requestId);
      }
    } catch (e) {}
  };
}

function sendMessage(message, callback) {
  if (!ws || ws.readyState !== 1) throw new Error('WebSocket no conectado');
  if (message.requestId && callback) {
    listeners.set(message.requestId, callback);
  }
  ws.send(JSON.stringify(message));
}

onUnmounted(() => {
  if (ws) ws.close();
});

export function useWebSocket(url) {
  if (!ws) connect(url);
  return {
    isConnected,
    sendMessage,
    ws
  };
}

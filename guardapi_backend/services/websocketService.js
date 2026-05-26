const { WebSocketServer } = require('ws');

let wss = null;

function initWebSocket(server) {
  wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    console.log('✅ Client connected');
    ws.on('close', () => console.log('❌ Client disconnected'));
  });

  return wss;
}

function broadcast(data) {
  if (!wss) return;
  
  const message = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === 1) client.send(message);
  });
}

function getWSS() {
  return wss;
}

module.exports = { initWebSocket, broadcast, getWSS };
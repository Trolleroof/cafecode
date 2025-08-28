import WebSocket from 'ws';

// Test WebSocket connection to file-events endpoint
const ws = new WebSocket('ws://localhost:8000/file-events?access_token=test-token', {
  headers: {
    'Origin': 'http://localhost:3000'
  }
});

ws.on('open', () => {
  console.log('✅ WebSocket connection opened successfully');
  console.log('📡 Connected to file-events endpoint');
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data);
    console.log('📨 Received message:', message);
  } catch (error) {
    console.log('📨 Received raw message:', data.toString());
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
});

ws.on('close', (code, reason) => {
  console.log(`🔌 WebSocket closed with code ${code}: ${reason}`);
});

// Close connection after 5 seconds
setTimeout(() => {
  console.log('🕐 Closing connection after 5 seconds...');
  ws.close();
}, 5000);

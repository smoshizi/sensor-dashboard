// mqttService.js
import mqtt from 'mqtt/dist/mqtt'; // important for CRA/browser builds

const url = 'wss://broker.hivemq.com:8884/mqtt'; // TLS WebSocket endpoint
const options = {
  protocol: 'wss',
  reconnectPeriod: 2000,
  clientId: 'web_' + Math.random().toString(16).slice(2),
  clean: true,
  connectTimeout: 4000
  // username/password not needed for public broker
};

const client = mqtt.connect(url, options);
export default client;

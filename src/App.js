import React, { useEffect, useState } from 'react';
import client from './mqttService';
import SensorPlot from './SensorPlot'; // Your existing chart component
import Gauge from './Gauge';           // Your existing gauge component

function App() {
  const [piezo, setPiezo] = useState({ Sensor1: [], Sensor2: [], Sensor3: [], Sensor4: [] });
  const [temp, setTemp] = useState(0);
  const [hum, setHum] = useState(0);

  useEffect(() => {
    const WINDOW_MS = 20000; // 20 seconds

    const handleConnect = () => {
      console.log('MQTT connected!');
      client.subscribe('iot/piezo', (err) => {
        if (err) {
          console.error('Subscribe error for iot/piezo:', err);
        }
      });
      client.subscribe('iot/temp', (err) => {
        if (err) {
          console.error('Subscribe error for iot/temp:', err);
        }
      });
    };

    const handleMessage = (topic, message) => {
      if (topic === 'iot/piezo') {
        try {
          const data = JSON.parse(message.toString());
          setPiezo(old => {
            const updated = { ...old };
            const now = Date.now();
            Object.keys(data).forEach(sensor => {
              const arr = Array.isArray(data[sensor]) ? data[sensor] : [data[sensor]];
              // Append new data points with timestamp, filter for last 20s
              const oldArr = old[sensor] || [];
              const newPoints = arr.map(v => ({ time: now, value: v }));
              const combined = [...oldArr, ...newPoints].filter(d => now - d.time <= WINDOW_MS);
              updated[sensor] = combined;
            });
            return updated;
          });
        } catch (e) {
          console.error('Error parsing piezo:', e);
        }
      }
      if (topic === 'iot/temp') {
        try {
          const data = JSON.parse(message.toString());
          setTemp(Number(data.Temperature) || 0);
          setHum(Number(data.Humidity) || 0);
        } catch (e) {
          console.error('Error parsing temp:', e);
        }
      }
    };

    client.on('connect', handleConnect);
    client.on('message', handleMessage);

    return () => {
      client.removeListener('connect', handleConnect);
      client.removeListener('message', handleMessage);
    };
  }, []);

  return (
    <div style={{ padding: 32 }}>
      <h1>IoT Sensor Dashboard</h1>
      <div style={{ display: 'flex', gap: 30, justifyContent: 'center', flexWrap: 'wrap' }}>
        <SensorPlot title="Sensor 1" data={piezo.Sensor1 || []} />
        <SensorPlot title="Sensor 2" data={piezo.Sensor2 || []} />
        <SensorPlot title="Sensor 3" data={piezo.Sensor3 || []} />
        <SensorPlot title="Sensor 4" data={piezo.Sensor4 || []} />
      </div>
      <div style={{ display: 'flex', gap: 80, justifyContent: 'center', marginTop: 40 }}>
        <Gauge value={temp} label="Temperature (°C)" min={-20} max={60} />
        <Gauge value={hum} label="Humidity (%)" min={0} max={100} />
      </div>
    </div>
  );
}

export default App;
import React, { useEffect, useState, useRef } from 'react';
import client from './mqttService';
import SensorPlot from './SensorPlot'; // Your existing chart component
import Gauge from './Gauge';           // Your existing gauge component

function App() {
  const [piezo, setPiezo] = useState({ Sensor1: [], Sensor2: [], Sensor3: [], Sensor4: [] });
  const [temp, setTemp] = useState(0);
  const [hum, setHum] = useState(0);

  // Keep a running average offset (device time - browser time)
  const offsetRef = useRef(0);
  const offsetSamples = useRef([]);

  useEffect(() => {
    const WINDOW_MS = 20000; // 20 seconds
    const OFFSET_SAMPLE_SIZE = 20; // Number of samples to average for offset

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
      // Log every incoming message for debugging
      // console.log("MQTT message received", topic, message.toString());

      if (topic === 'iot/piezo') {
        try {
          const data = JSON.parse(message.toString());
          const now = Date.now();
          const firstTs = data.Sensor1?.[0]?.ts;

          // --- Offset calculation ---
          if (typeof firstTs === "number") {
            const sampleOffset = firstTs - now;
            offsetSamples.current.push(sampleOffset);
            if (offsetSamples.current.length > OFFSET_SAMPLE_SIZE) {
              offsetSamples.current.shift();
            }
            // Compute average offset
            const avgOffset = offsetSamples.current.reduce((a, b) => a + b, 0) / offsetSamples.current.length;
            offsetRef.current = avgOffset;
            // Uncomment for debugging:
            // console.log("Avg offset (device-browser, ms):", avgOffset);
          }
          // --------------------------

          setPiezo(old => {
            const updated = { ...old };
            const offset = offsetRef.current;
            const browserNow = Date.now();
            Object.keys(data).forEach(sensor => {
              const arr = Array.isArray(data[sensor]) ? data[sensor] : [data[sensor]];
              const oldArr = old[sensor] || [];
              // Shift all incoming data by the running average offset
              const newPoints = arr.map(obj =>
                ({
                  time: typeof obj.ts === "number" ? obj.ts - offset : browserNow,
                  value: obj.v
                })
              );
              // Keep only points within the window (relative to browser time)
              const combined = [...oldArr, ...newPoints].filter(d => browserNow - d.time <= WINDOW_MS);
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
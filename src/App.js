import React, { useEffect, useState, useRef } from 'react';
import client from './mqttService';
import SensorPlot from './SensorPlot'; // existing chart component
import Gauge from './Gauge';           // existing gauge component
import './App.css';

const SENSOR_COUNT = 8;
const SENSOR_KEYS = Array.from({ length: SENSOR_COUNT }, (_, i) => `Sensor${i + 1}`);
const makeEmptyState = () => Object.fromEntries(SENSOR_KEYS.map(k => [k, []]));

function App() {
  const [piezo, setPiezo] = useState(makeEmptyState());
  const [temp, setTemp] = useState(0);
  const [hum, setHum] = useState(0);

  // Running average offset (device time - browser time)
  const offsetRef = useRef(0);
  const offsetSamples = useRef([]);

  useEffect(() => {
    const WINDOW_MS = 20000;        // 20 seconds
    const OFFSET_SAMPLE_SIZE = 20;  // samples for running offset avg

    const handleConnect = () => {
      console.log('MQTT connected!');
      client.subscribe('iot/piezo', err => { if (err) console.error('Subscribe error iot/piezo:', err); });
      client.subscribe('iot/temp',  err => { if (err) console.error('Subscribe error iot/temp:', err);  });
    };

    const handleMessage = (topic, message) => {
      if (topic === 'iot/piezo') {
        try {
          const data = JSON.parse(message.toString());
          const now = Date.now();

          // Use the earliest timestamp from any present sensor in this batch
          let firstTs;
          for (const key of SENSOR_KEYS) {
            const item = data[key];
            if (!item) continue;
            if (Array.isArray(item) && item.length && typeof item[0].ts === 'number') {
              firstTs = typeof firstTs === 'number' ? Math.min(firstTs, item[0].ts) : item[0].ts;
            } else if (!Array.isArray(item) && typeof item.ts === 'number') {
              firstTs = typeof firstTs === 'number' ? Math.min(firstTs, item.ts) : item.ts;
            }
          }
          if (typeof firstTs === 'number') {
            const sampleOffset = firstTs - now;
            offsetSamples.current.push(sampleOffset);
            if (offsetSamples.current.length > OFFSET_SAMPLE_SIZE) offsetSamples.current.shift();
            offsetRef.current =
              offsetSamples.current.reduce((a, b) => a + b, 0) / offsetSamples.current.length;
          }

          setPiezo(prev => {
            const updated = { ...prev };
            const offset = offsetRef.current;
            const browserNow = Date.now();

            for (const key of SENSOR_KEYS) {
              const raw = data[key];
              const oldArr = prev[key] || [];
              const arr = Array.isArray(raw) ? raw : (raw ? [raw] : []);
              const newPoints = arr.map(obj => ({
                time: typeof obj.ts === 'number' ? obj.ts - offset : browserNow,
                value: Number(obj.v) || 0
              }));
              // Keep only points within the window (relative to browser time)
              const combined = [...oldArr, ...newPoints].filter(d => browserNow - d.time <= WINDOW_MS);
              updated[key] = combined;
            }
            return updated;
          });
        } catch (e) {
          console.error('Error parsing piezo:', e);
        }
      } else if (topic === 'iot/temp') {
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

	{/* 8 sensor plots in a 4×2 grid */}
	<div className="plots-grid">
	  {SENSOR_KEYS.map((key, idx) => (
		<SensorPlot key={key} title={`Sensor ${idx + 1}`} data={piezo[key] || []} />
	  ))}
	</div>

      <div style={{ display: 'flex', gap: 80, justifyContent: 'center', marginTop: 40, flexWrap: 'wrap' }}>
        <Gauge value={temp} label="Temperature (°C)" min={-20} max={60} />
        <Gauge value={hum} label="Humidity (%)" min={0} max={100} />
      </div>
    </div>
  );
}

export default App;

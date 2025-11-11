import React, { useEffect, useState, useRef } from 'react';
import client from './mqttService';
import SensorPlot from './SensorPlot';
import Gauge from './Gauge';
import './App.css';

const SENSOR_KEYS = [
  // piezo1 -> Sensor1:A1, Sensor2:B1, Sensor3:C1, Sensor4:A2
  'A1', 'B1', 'C1', 'A2',
  // piezo2 -> Sensor1:B2, Sensor2:C2, Sensor3:D1, Sensor4:E1
  'B2', 'C2', 'D1', 'E1',
  // piezo3 -> Sensor1:A3, Sensor2:B3, Sensor3:C3, Sensor4:A4
  'A3', 'B3', 'C3', 'A4',
  // piezo4 -> Sensor1:B4, Sensor2:C4, Sensor3:D2, Sensor4:E2
  'B4', 'C4', 'D2', 'E2'
];

const makeEmptyState = () => Object.fromEntries(SENSOR_KEYS.map(k => [k, []]));

function App() {
  const [piezo, setPiezo] = useState(makeEmptyState());
  const [temp1, setTemp1] = useState(0);
  const [hum1, setHum1] = useState(0);
  const [temp2, setTemp2] = useState(0);
  const [hum2, setHum2] = useState(0);

  // Running average offset (device time - browser time)
  const offsetRef = useRef(0);
  const offsetSamples = useRef([]);

  useEffect(() => {
    const WINDOW_MS = 20000;        // 20 seconds
    const OFFSET_SAMPLE_SIZE = 20;  // samples for running offset avg

    const TOPIC_MAP = {
      'iot/piezo1': ['A1', 'B1', 'C1', 'A2'],
      'iot/piezo2': ['B2', 'C2', 'D1', 'E1'],
      'iot/piezo3': ['A3', 'B3', 'C3', 'A4'],
      'iot/piezo4': ['B4', 'C4', 'D2', 'E2']
    };

    const subscribeTopics = [
      'iot/piezo1',
      'iot/piezo2',
      'iot/piezo3',
      'iot/piezo4',
      'iot/temp1',
      'iot/temp2'
    ];

    const handleConnect = () => {
      console.log('MQTT connected!');
      for (const t of subscribeTopics) {
        client.subscribe(t, err => {
          if (err) console.error('Subscribe error', t, err);
        });
      }
    };

    const handleMessage = (topic, message) => {
      const browserNow = Date.now();

      if (topic in TOPIC_MAP) {
        try {
          const data = JSON.parse(message.toString());

          // update offset running average if device timestamps exist
          for (let i = 0; i < 4; i++) {
            const d = data[`Sensor${i + 1}`];
            const sample = Array.isArray(d) ? d[0] : d;
            if (sample && typeof sample.ts === 'number') {
              const offsetSample = sample.ts - browserNow;
              offsetSamples.current.push(offsetSample);
              if (offsetSamples.current.length > OFFSET_SAMPLE_SIZE) {
                offsetSamples.current.shift();
              }
              const avg = offsetSamples.current.reduce((a, b) => a + b, 0) / offsetSamples.current.length;
              offsetRef.current = avg;
              break;
            }
          }

          const mapping = TOPIC_MAP[topic];
          setPiezo(prev => {
            const updated = { ...prev };
            const offset = offsetRef.current;
            const now = Date.now();

            for (let i = 0; i < mapping.length; i++) {
              const mappedKey = mapping[i];
              const raw = data[`Sensor${i + 1}`];
              const oldArr = prev[mappedKey] || [];
              const arr = Array.isArray(raw) ? raw : (raw ? [raw] : []);
              const newPoints = arr.map(obj => ({
                time: typeof obj.ts === 'number' ? (obj.ts - offset) : now,
                value: Number(obj.v) || 0
              }));
              const combined = [...oldArr, ...newPoints].filter(d => now - d.time <= WINDOW_MS);
              updated[mappedKey] = combined;
            }
            return updated;
          });
        } catch (e) {
          console.error('Error parsing piezo message for', topic, e);
        }
      } else if (topic === 'iot/temp1' || topic === 'iot/temp2') {
        try {
          const data = JSON.parse(message.toString());
          if (topic === 'iot/temp1') {
            setTemp1(Number(data.Temperature) || 0);
            setHum1(Number(data.Humidity) || 0);
          } else {
            setTemp2(Number(data.Temperature) || 0);
            setHum2(Number(data.Humidity) || 0);
          }
        } catch (e) {
          console.error('Error parsing temp message for', topic, e);
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

      {/* 16 sensor plots in a 4×4 grid */}
      <div className="plots-grid">
        {SENSOR_KEYS.map((key) => (
          <SensorPlot key={key} title={key} data={piezo[key] || []} />
        ))}
      </div>

      {/* single-row gauges under plots */}
      <div className="gauges-grid" role="region" aria-label="Gauges">
        <div className="gauge-card">
          <h3>Temperature 1</h3>
          {/* hideLabel so we don't render the label again under the dial */}
          <Gauge value={temp1} label="Temperature 1" min={-40} max={60} hideLabel />
        </div>
        <div className="gauge-card">
          <h3>Humidity 1</h3>
          <Gauge value={hum1} label="Humidity 1" min={0} max={100} hideLabel />
        </div>
        <div className="gauge-card">
          <h3>Temperature 2</h3>
          <Gauge value={temp2} label="Temperature 2" min={-40} max={60} hideLabel />
        </div>
        <div className="gauge-card">
          <h3>Humidity 2</h3>
          <Gauge value={hum2} label="Humidity 2" min={0} max={100} hideLabel />
        </div>
      </div>
    </div>
  );
}

export default App;
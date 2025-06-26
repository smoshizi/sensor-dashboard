import React, { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Label
} from 'recharts';

function formatTime(ms) {
  const date = new Date(ms);
  return date.toLocaleTimeString('en-US', { hour12: false }); // "21:04:15"
}

function SensorPlot({ title, data }) {
  const [now, setNow] = useState(Date.now());

  // Update "now" every second to keep the window sliding
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 10);
    return () => clearInterval(interval);
  }, []);

  // Filter data for the last 20 seconds
  const WINDOW_MS = 20000;
  const minTime = now - WINDOW_MS;
  const chartData = (data || []).filter(d => d.time >= minTime && d.time <= now);

  return (
    <div style={{
      width: 480,
      height: 300,
      background: '#fff',
      padding: 18,
      borderRadius: 12,
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      margin: 8
    }}>
      <h3 style={{ textAlign: 'center', margin: 0, marginBottom: 8 }}>{title}</h3>
      <ResponsiveContainer width="100%" height={230}>
        <LineChart
          data={chartData}
          margin={{ top: 10, right: 5, left: 0, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="time"
            type="number"
            domain={[minTime, now]}
            tickFormatter={formatTime}
            interval="preserveStartEnd"
            tick={{ fontSize: 14 }}
          >
            <Label
              value="Time (hh:mm:ss)"
              offset={-10}
              position="insideBottom"
              style={{ textAnchor: 'middle', fontSize: 16, fill: '#333', fontWeight: 'bold' }}
            />
          </XAxis>
          <YAxis
            tick={{ fontSize: 14 }}
          >
            <Label
              value="Sensor output (mV)"
              angle={-90}
              position="insideLeft"
              style={{ textAnchor: 'middle', fontSize: 16, fill: '#333', fontWeight: 'bold' }}
            />
          </YAxis>
          <Tooltip labelFormatter={formatTime} />
          <Line type="monotone" dataKey="value" stroke="#0000ff" dot={false} isAnimationActive={false} strokeWidth={2.5} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default SensorPlot;
import React, { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Label
} from 'recharts';

function formatTime(ms) {
  const date = new Date(ms);
  return date.toLocaleTimeString('en-US', { hour12: false });
}

function SensorPlot({ title, data }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 10);
    return () => clearInterval(interval);
  }, []);

  const WINDOW_MS = 20000;
  const minTime = now - WINDOW_MS;
  const chartData = (data || []).filter(d => d.time >= minTime && d.time <= now);

  // Y-axis range (0.5 mV steps)
  let minY = 0, maxY = 10;
  if (chartData.length > 0) {
    minY = Math.floor(Math.min(...chartData.map(d => d.value)) * 2) / 2;
    maxY = Math.ceil(Math.max(...chartData.map(d => d.value)) * 2) / 2;
    if (minY === maxY) { minY -= 0.5; maxY += 0.5; }
  }
  const ticks = [];
  for (let t = minY; t <= maxY + 1e-9; t += 0.5) ticks.push(Number(t.toFixed(2)));

  return (
    <div style={{
      width: '100%',             // fill grid cell
      height: 300,
      background: '#fff',
      padding: 18,
      borderRadius: 12,
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
    }}>
      <h3 style={{ textAlign: 'center', margin: 0, marginBottom: 8 }}>{title}</h3>

      <ResponsiveContainer width="100%" height={230}>
        <LineChart
          data={chartData}
          margin={{ top: 10, right: 12, left: 90, bottom: 18 }}  // more room left for label
        >
          <CartesianGrid strokeDasharray="3 3" />

          <XAxis
            dataKey="time"
            type="number"
            domain={[minTime, now]}
            tickFormatter={formatTime}
            interval="preserveStartEnd"
            tick={{ fontSize: 14 }}
            tickMargin={8}
          >
            <Label
              value="Time (hh:mm:ss)"
              offset={-8}
              position="insideBottom"
              style={{ textAnchor: 'middle', fontSize: 16, fill: '#333', fontWeight: 'bold' }}
            />
          </XAxis>

          <YAxis
            domain={[minY, maxY]}
            ticks={ticks}
            tickFormatter={v => v.toFixed(2)}
            tick={{ fontSize: 14 }}
            tickMargin={10}                 // gap between ticks and axis line
          >
            <Label
              value="Sensor output (mV)"
              angle={-90}
              position="left"               // place title outside the chart
              offset={12}                    // gap between title and tick labels
              style={{ textAnchor: 'middle', fontSize: 16, fill: '#333', fontWeight: 'bold' }}
            />
          </YAxis>

          <Tooltip labelFormatter={formatTime} formatter={v => Number(v).toFixed(2)} />

          <Line
            type="monotone"
            dataKey="value"
            stroke="#0000ff"
            dot={false}
            isAnimationActive={false}
            strokeWidth={2.5}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default SensorPlot;

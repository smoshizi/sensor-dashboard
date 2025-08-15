import React, { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Label
} from 'recharts';

function formatTime(ms) {
  const d = new Date(ms);
  return d.toLocaleTimeString('en-US', { hour12: false });
}

function SensorPlot({ title, data }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 10);
    return () => clearInterval(t);
  }, []);

  const WINDOW_MS = 20000;
  const minTime = now - WINDOW_MS;
  const chartData = (data || []).filter(d => d.time >= minTime && d.time <= now);

  // y-range
  let minY = 0, maxY = 10;
  if (chartData.length) {
    minY = Math.floor(Math.min(...chartData.map(d => d.value)) * 2) / 2;
    maxY = Math.ceil (Math.max(...chartData.map(d => d.value)) * 2) / 2;
    if (minY === maxY) { minY -= 0.5; maxY += 0.5; }
  }
  const ticks = [];
  for (let t = minY; t <= maxY + 1e-9; t += 0.5) ticks.push(Number(t.toFixed(2)));

  // --- Layout constants to make the chart fill the card ---
  const CARD_H   = 300;         // total card height
  const PAD      = 8;          // card padding
  const TITLE_H  = 28;          // approx h3 height
  const CHART_H  = CARD_H - PAD*2 - TITLE_H; // remaining space for chart

  return (
    <div style={{
      width: '100%',
      height: CARD_H,
      background: '#fff',
      padding: PAD,
      borderRadius: 12,
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
    }}>
      {/* keep title close to top margin */}
      <h3 style={{ margin: '0 0 6px 0', textAlign: 'center' }}>{title}</h3>

      {/* stretch chart to fill the card */}
      <ResponsiveContainer width="100%" height={CHART_H}>
        <LineChart
          data={chartData}
          margin={{ top: 4, right: 8, left: 56, bottom: 24 }}  // tighter margins
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
              position="insideBottom"
              offset={-6}
              style={{ textAnchor: 'middle', fontSize: 16, fill: '#333', fontWeight: 'bold' }}
            />
          </XAxis>

          <YAxis
            domain={[minY, maxY]}
            ticks={ticks}
            tickFormatter={v => v.toFixed(2)}
            tick={{ fontSize: 14 }}
            tickMargin={10}                 // space between ticks and axis line
          >
            {/* Put title inside the plot, but push it LEFT to create a gap from tick values */}
            <Label
              value="Sensor output (mV)"
              angle={-90}
              position="insideLeft"
              offset={-12}                   // negative = move title left (more gap from ticks)
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
            strokeWidth={2.2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default SensorPlot;

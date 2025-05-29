import React from 'react';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';

function Gauge({ value, label, min, max }) {
  const percentage = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ width: 200, textAlign: 'center' }}>
      <CircularProgressbar
        value={percentage}
        text={`${value.toFixed(2)}`}
        styles={buildStyles({
          textColor: "#000",
          pathColor: "#007bff",
          trailColor: "#eee"
        })}
      />
      <div>
        <b>{label}</b>
      </div>
    </div>
  );
}

export default Gauge;
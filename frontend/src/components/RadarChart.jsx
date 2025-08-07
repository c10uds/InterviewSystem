import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { Radar } from 'react-chartjs-2';
import { Chart, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from 'chart.js';
Chart.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const RadarChart = ({ abilities }) => {
  if (!abilities) return null;
  const labels = Object.keys(abilities);
  const data = {
    labels,
    datasets: [
      {
        label: '能力分数',
        data: Object.values(abilities),
        backgroundColor: 'rgba(25, 118, 210, 0.2)',
        borderColor: '#1976d2',
        borderWidth: 2,
        pointBackgroundColor: '#1976d2',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#1976d2',
      }
    ]
  };
  const options = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true }
    },
    scales: {
      r: {
        min: 0,
        max: 100,
        ticks: { stepSize: 20, color: '#888' },
        pointLabels: { color: '#1976d2', font: { size: 14, weight: 'bold' } },
        grid: { color: '#e3f0ff' }
      }
    }
  };
  return <Radar data={data} options={options} style={{ maxWidth: 400, maxHeight: 320 }} />;
};

export default RadarChart; 
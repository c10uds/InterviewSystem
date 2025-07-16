import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

const RadarChart = ({ data }) => {
  const chartRef = useRef(null);

  useEffect(() => {
    if (!data) return;
    const chart = echarts.init(chartRef.current);
    const indicator = Object.keys(data).map(key => ({ name: key, max: 100 }));
    const option = {
      tooltip: {},
      radar: {
        indicator,
        radius: 80
      },
      series: [{
        type: 'radar',
        data: [
          {
            value: Object.values(data),
            name: '能力评测'
          }
        ]
      }]
    };
    chart.setOption(option);
    return () => chart.dispose();
  }, [data]);

  return <div ref={chartRef} style={{ width: '100%', height: 300 }} />;
};

export default RadarChart; 
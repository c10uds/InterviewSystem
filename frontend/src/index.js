import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import 'antd/dist/reset.css';

// 全局样式，防止水平滚动
const globalStyle = document.createElement('style');
globalStyle.textContent = `
  html, body {
    overflow-x: hidden !important;
    max-width: 100vw !important;
    box-sizing: border-box;
  }
  *, *::before, *::after {
    box-sizing: border-box;
  }
  #root {
    overflow-x: hidden !important;
    max-width: 100vw !important;
  }
`;
document.head.appendChild(globalStyle);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />); 
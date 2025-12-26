import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';
import 'animate.css';
// eslint-disable-next-line import/no-unresolved
import { registerSW } from 'virtual:pwa-register';

registerSW({ immediate: true });

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

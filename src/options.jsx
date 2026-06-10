import React from 'react';
import { createRoot } from 'react-dom/client';
import { DashboardPanel } from './ui/DashboardPanel.jsx';
import './styles/app.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <DashboardPanel />
  </React.StrictMode>
);

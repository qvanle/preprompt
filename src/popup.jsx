import React from 'react';
import { createRoot } from 'react-dom/client';
import { PopupPanel } from './ui/PopupPanel.jsx';
import './styles/app.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PopupPanel />
  </React.StrictMode>
);

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
// Baris ini sudah diaktifkan untuk memuat Tailwind CSS:
import './index.css'; 

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
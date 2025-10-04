import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
// Jika Anda memiliki file CSS utama yang mengimpor Tailwind, Anda dapat mengaktifkan ini.
// import './index.css'; 

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

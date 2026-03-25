import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HeroUIProvider } from '@heroui/react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import App from './App.jsx';
import { AuthProvider } from './state/auth.jsx';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <HeroUIProvider>
        <BrowserRouter>
          <App />
          <ToastContainer
            position="top-center"
            autoClose={3200}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            pauseOnHover
            draggable
            theme="light"
          />
        </BrowserRouter>
      </HeroUIProvider>
    </AuthProvider>
  </React.StrictMode>
);

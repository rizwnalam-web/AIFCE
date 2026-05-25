import React from 'react';
import ReactDOM from 'react-dom/client';
import Auth from './components/auth/Auth';
import { AppContextProvider } from './contexts/AppContext';
import { ToastProvider } from './contexts/ToastContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AppContextProvider>
      <ToastProvider>
        <Auth />
      </ToastProvider>
    </AppContextProvider>
  </React.StrictMode>
);
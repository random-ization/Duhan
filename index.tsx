import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AppProvider } from './contexts/AppContext';
import './utils/i18next-config'; // Initialize i18n
import './src/index.css';
import { ConvexProvider, ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <ConvexProvider client={convex}>
        <AppProvider>
          <App />
        </AppProvider>
      </ConvexProvider>
    </BrowserRouter>
  </React.StrictMode>
);

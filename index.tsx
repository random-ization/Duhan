import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AppProvider } from './contexts/AppContext';
import './utils/i18next-config'; // Initialize i18n
import './src/index.css';
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { getConvexUrl } from "./utils/convexConfig";

const convexUrl = getConvexUrl();
const convex = new ConvexReactClient(convexUrl);

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

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import App from './App';
import { AppProvider } from './contexts/AppContext';
import { ThemeProvider } from './contexts/ThemeContext';
import './utils/i18next-config'; // Initialize i18n
import './index.css';
import { ConvexReactClient } from 'convex/react';
import { ConvexAuthProvider } from '@convex-dev/auth/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { getConvexUrl } from './utils/convexConfig';
import { registerServiceWorker } from './pwa/registerServiceWorker';
import { initSentry } from './utils/sentry';
import { isStaleChunkError, recoverFromStaleChunk } from './utils/staleChunkRecovery';

if (typeof globalThis.window !== 'undefined') {
  globalThis.window.addEventListener('vite:preloadError', event => {
    event.preventDefault();
    recoverFromStaleChunk('vite:preloadError');
  });

  globalThis.window.addEventListener('unhandledrejection', event => {
    if (!isStaleChunkError(event.reason)) return;
    event.preventDefault();
    recoverFromStaleChunk('dynamic-import');
  });

  globalThis.window.addEventListener('error', event => {
    if (!isStaleChunkError(event.error || event.message)) return;
    event.preventDefault();
    recoverFromStaleChunk('window-error');
  });
}

const convexUrl = getConvexUrl();
const convex = new ConvexReactClient(convexUrl);
initSentry();
registerServiceWorker();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ThemeProvider defaultTheme="system" storageKey="duhan-theme">
      <BrowserRouter>
        <ConvexAuthProvider client={convex}>
          <AppProvider>
            <App />
            <SpeedInsights />
          </AppProvider>
        </ConvexAuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);

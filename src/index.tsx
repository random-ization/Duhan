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
import { getConvexUrl } from './utils/convexConfig';
import { registerServiceWorker } from './pwa/registerServiceWorker';

const CHUNK_RELOAD_GUARD_KEY = 'duhan:chunk-reload-attempted';

function reloadOnStaleChunk(reason: string) {
  if (typeof globalThis.window === 'undefined') return;
  const alreadyTried = globalThis.window.sessionStorage.getItem(CHUNK_RELOAD_GUARD_KEY) === '1';
  if (alreadyTried) {
    // Avoid infinite reload loops when deployment/caching is still inconsistent.
    console.error(`[runtime] stale chunk recovery skipped (${reason}): already reloaded once`);
    return;
  }

  globalThis.window.sessionStorage.setItem(CHUNK_RELOAD_GUARD_KEY, '1');
  globalThis.window.location.reload();
}

if (typeof globalThis.window !== 'undefined') {
  globalThis.window.addEventListener('vite:preloadError', event => {
    event.preventDefault();
    reloadOnStaleChunk('vite:preloadError');
  });

  globalThis.window.addEventListener('unhandledrejection', event => {
    const message = String(event.reason?.message || event.reason || '');
    if (!message.includes('Failed to fetch dynamically imported module')) return;
    event.preventDefault();
    reloadOnStaleChunk('dynamic-import');
  });
}

const convexUrl = getConvexUrl();
const convex = new ConvexReactClient(convexUrl);
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
          </AppProvider>
        </ConvexAuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);

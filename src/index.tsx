import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import App from './App';
import { AppProvider } from './contexts/AppContext';
import { ThemeProvider } from './contexts/ThemeContext';
import './utils/i18next-config'; // Initialize i18n
import './index.css';
// Vercel Analytics + SpeedInsights are mounted via a small wrapper that
// idle-defers their React.lazy imports, so their modules (~4 kB gz combined
// in the entry chunk) now ship in a separate post-idle chunk that doesn't
// compete with first paint on any pre-auth page.
import DeferredAnalytics from './components/common/DeferredAnalytics';
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

if (import.meta.env.PROD && typeof globalThis.window !== 'undefined') {
  const idleWindow = globalThis.window as Window & {
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  };

  if (idleWindow.requestIdleCallback) {
    idleWindow.requestIdleCallback(
      () => {
        void initSentry();
      },
      { timeout: 4000 }
    );
  } else {
    globalThis.window.setTimeout(() => {
      void initSentry();
    }, 1800);
  }
}

registerServiceWorker();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

// Note: the Convex React client and <ConvexAuthProvider> used to be
// mounted HERE at the root of the tree. They have moved into
// `src/contexts/AuthedAppProviders.tsx`, which is only imported (via
// React.lazy) when a user lands on an authed route. That's how we keep
// `vendor-convex` (~25 kB gz) out of every pre-auth page's preload set
// and avoid opening a Convex WebSocket for signed-out visitors.
const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ThemeProvider defaultTheme="system" storageKey="duhan-theme">
      <BrowserRouter>
        <AppProvider>
          <App />
          <DeferredAnalytics />
        </AppProvider>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);

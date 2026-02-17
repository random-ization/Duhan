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

const convexUrl = getConvexUrl();
const convex = new ConvexReactClient(convexUrl);

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

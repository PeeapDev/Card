import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import App from './App';
import '@/styles/index.css';

// Initialize Convex client
const convexUrl = import.meta.env.VITE_CONVEX_URL;
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

// Register service worker for offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
      })
      .catch((error) => {
      });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {convex ? (
      <ConvexProvider client={convex}>
        <App />
      </ConvexProvider>
    ) : (
      <App />
    )}
  </React.StrictMode>
);

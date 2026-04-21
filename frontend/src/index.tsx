import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './i18n';            // initialize i18n exactly once, at app entry
import './styles/rtl.css';  // optional: global RTL helpers
import App from './App';
import './index.css';
import reportWebVitals from './reportWebVitals';

// Suppress webpack-dev-server SSE errors in development mode
if (process.env.NODE_ENV === 'development') {
  const originalConsoleError = console.error;
  console.error = (...args: Parameters<typeof console.error>) => {
    // Convert args to string safely, handling Error objects
    const errorMessage = args.map(arg => {
      if (arg instanceof Error) return arg.message;
      if (typeof arg === 'string') return arg;
      try { return String(arg); } catch { return ''; }
    }).join(' ');
    
    // Filter out SSE-related errors from webpack-dev-server
    if (
      errorMessage.includes('sseError') ||
      errorMessage.includes('func sseError not found') ||
      errorMessage.includes('__webpack_dev_server_client__') ||
      errorMessage.includes('Failed to fetch dynamically imported module') ||
      errorMessage.includes('net::ERR_') ||
      errorMessage.includes('AbortError')
    ) {
      return; // Suppress these non-critical development errors
    }
    originalConsoleError.apply(console, args);
  };

  // Handle uncaught errors related to SSE
  window.addEventListener('error', (event) => {
    const message = event.message || '';
    if (
      message.includes('sseError') ||
      message.includes('func sseError not found') ||
      message.includes('Failed to fetch dynamically imported module') ||
      message.includes('net::ERR_')
    ) {
      event.preventDefault();
    }
  }, true);

  // Handle unhandled promise rejections related to SSE
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const message = reason instanceof Error ? reason.message : String(reason || '');
    if (
      message.includes('sseError') ||
      message.includes('func sseError not found') ||
      message.includes('Failed to fetch dynamically imported module') ||
      message.includes('AbortError') ||
      message.includes('net::ERR_')
    ) {
      event.preventDefault();
    }
  });
}

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('#root element not found');

const root = createRoot(rootEl);

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

reportWebVitals();

// Register Service Worker for Notifications
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('✅ ServiceWorker registered');
      })
      .catch(err => {
        console.error('❌ ServiceWorker registration failed: ', err);
      });
  });
}
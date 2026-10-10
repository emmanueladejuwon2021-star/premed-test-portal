import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import 'katex/dist/katex.min.css';
import { registerSW } from 'virtual:pwa-register';

// During development, clean any service worker registrations to prevent stale caching & blank screens
// @ts-ignore
if (import.meta.env?.DEV) {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister().then((success) => {
          if (success) {
            console.log('Stale service worker unregistered successfully.');
          }
        });
      }
    });
  }
} else {
  try {
    registerSW({ immediate: true });
  } catch (swError) {
    console.warn('Service Worker registration skipped:', swError);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

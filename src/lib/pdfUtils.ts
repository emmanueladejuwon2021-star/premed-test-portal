/**
 * Dynamic script loader utilities to avoid global "Script error." on page load,
 * providing clean fallback when third-party assets are slow or blocked.
 */

export const loadHtml2Pdf = (): Promise<any> => {
  return new Promise((resolve) => {
    if ((window as any).html2pdf) {
      resolve((window as any).html2pdf);
      return;
    }
    const existing = document.querySelector('script[src*="html2pdf"]');
    if (existing) {
      existing.addEventListener('load', () => resolve((window as any).html2pdf));
      existing.addEventListener('error', () => resolve(null));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.onload = () => resolve((window as any).html2pdf);
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
};

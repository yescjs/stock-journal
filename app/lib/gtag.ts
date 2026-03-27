declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '';

export function gtagEvent(action: string, params?: Record<string, string | number | boolean>) {
  if (typeof window === 'undefined' || !GA_MEASUREMENT_ID) return;
  window.gtag?.('event', action, params);
}

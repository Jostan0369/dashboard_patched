// hooks/useSSE.ts
import { useEffect, useRef } from 'react';

export function useSSE(timeframe: string, onCandle: (data: any) => void) {
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const url = `/api/stream?timeframe=${encodeURIComponent(timeframe)}`;
    const es = new EventSource(url);
    esRef.current = es;

    es.addEventListener('candle', (ev: any) => {
      try {
        const data = JSON.parse(ev.data);
        onCandle(data);
      } catch (err) {
        // ignore
      }
    });

    es.onerror = (err) => {
      // EventSource auto-reconnects, but you can inspect errors here
      console.warn('SSE error', err);
    };

    return () => {
      try { es.close(); } catch (e) {}
      esRef.current = null;
    };
  }, [timeframe, onCandle]);
}

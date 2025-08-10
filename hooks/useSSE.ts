// hooks/useSSE.ts
import { useEffect, useRef } from 'react';

export function useSSE(timeframe: string, onCandle: (payload: any) => void) {
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const url = `/api/stream?timeframe=${encodeURIComponent(timeframe)}`;
    const es = new EventSource(url);
    esRef.current = es;

    es.addEventListener('candle', (ev: any) => {
      try {
        const data = JSON.parse(ev.data);
        onCandle(data);
      } catch (err) {}
    });

    es.onerror = (err) => {
      console.warn('SSE error', err);
      // EventSource auto-reconnects; we let it handle reconnection.
    };

    return () => {
      try { es.close(); } catch {}
      esRef.current = null;
    };
  }, [timeframe, onCandle]);
}

// components/CryptoTable.tsx
'use client'
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSSE } from '@/hooks/useSSE';

type Row = {
  symbol: string;
  open?: number | null;
  high?: number | null;
  low?: number | null;
  close?: number | null;
  volume?: number | null;
  ema12?: number | null;
  ema26?: number | null;
  ema50?: number | null;
  ema100?: number | null;
  ema200?: number | null;
  macd?: number | null;
  macdSignal?: number | null;
  macdHist?: number | null;
  rsi14?: number | null;
  finalSignal?: string;
  ts?: number;
};

interface Props {
  timeframe: string;
  limit?: number;
}

function formatNum(v?: number | null, digits = 4) {
  if (v === undefined || v === null || Number.isNaN(v)) return '-';
  if (Math.abs(v) >= 1000) return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return v.toFixed(digits);
}

export default function CryptoTable({ timeframe = '1h', limit = 200 }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const indexRef = useRef<Record<string, number>>({});

  const buildIndex = useCallback((arr: Row[]) => {
    const map: Record<string, number> = {};
    arr.forEach((r, i) => (map[r.symbol] = i));
    indexRef.current = map;
  }, []);

  // initial load
  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await fetch(`/api/crypto?timeframe=${encodeURIComponent(timeframe)}&limit=${limit}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as Row[];
        if (!mounted) return;
        setRows(data);
        buildIndex(data);
      } catch (err) {
        console.error('Initial load failed', err);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [timeframe, limit, buildIndex]);

  // patch row helper
  const patchRow = useCallback((payload: Partial<Row> & { symbol: string }) => {
    setRows(prev => {
      const idx = indexRef.current[payload.symbol];
      if (idx === undefined) {
        const next = [...prev, { ...(payload as Row), ts: Date.now() }];
        buildIndex(next);
        return next;
      }
      const next = [...prev];
      next[idx] = { ...next[idx], ...payload, ts: Date.now() };
      return next;
    });
  }, [buildIndex]);

  // SSE subscription per timeframe
  useSSE(timeframe, (payload: any) => {
    // payload contains symbol, open, high, low, close, volume, ema12, ..., rsi14
    if (!payload || !payload.symbol) return;
    patchRow(payload);
  });

  return (
    <div className="p-4 overflow-x-auto">
      <h2 className="text-xl font-semibold mb-4">Timeframe: {timeframe}</h2>
      <table className="w-full table-auto border-collapse rounded-lg shadow-md">
        <thead>
          <tr className="bg-gray-800 text-white text-xs">
            <th className="p-2">Symbol</th>
            <th className="p-2">Open</th>
            <th className="p-2">High</th>
            <th className="p-2">Low</th>
            <th className="p-2">Close</th>
            <th className="p-2">RSI</th>
            <th className="p-2">EMA12</th>
            <th className="p-2">EMA26</th>
            <th className="p-2">MACD</th>
            <th className="p-2">EMA50</th>
            <th className="p-2">EMA100</th>
            <th className="p-2">EMA200</th>
            <th className="p-2">Volume</th>
            <th className="p-2">Final</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.symbol} className="text-xs text-center border-b hover:bg-gray-100">
              <td className="p-2 font-semibold">{r.symbol}</td>
              <td className="p-2">{formatNum(r.open)}</td>
              <td className="p-2">{formatNum(r.high)}</td>
              <td className="p-2">{formatNum(r.low)}</td>
              <td className="p-2">{formatNum(r.close)}</td>
              <td className="p-2">{r.rsi14 != null ? r.rsi14.toFixed(2) : '-'}</td>
              <td className="p-2">{r.ema12 != null ? r.ema12.toFixed(4) : '-'}</td>
              <td className="p-2">{r.ema26 != null ? r.ema26.toFixed(4) : '-'}</td>
              <td className="p-2">{r.macd != null ? r.macd.toFixed(4) : '-'}</td>
              <td className="p-2">{r.ema50 != null ? r.ema50.toFixed(4) : '-'}</td>
              <td className="p-2">{r.ema100 != null ? r.ema100.toFixed(4) : '-'}</td>
              <td className="p-2">{r.ema200 != null ? r.ema200.toFixed(4) : '-'}</td>
              <td className="p-2">{r.volume ? (r.volume / 1e6).toFixed(2) + 'M' : '-'}</td>
              <td className={`p-2 font-bold ${r.finalSignal === 'BUY' ? 'text-green-600' : r.finalSignal === 'SELL' ? 'text-red-600' : 'text-gray-500'}`}>
                {r.finalSignal ?? '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

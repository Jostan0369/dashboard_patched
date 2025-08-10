// components/CryptoTable.tsx
'use client'

import React, { useEffect, useRef, useState } from 'react'

type Timeframe = '15m' | '1h' | '4h' | '1d' | '1D'

interface RowData {
  symbol: string
  open: number | null
  high: number | null
  low: number | null
  close: number | null
  volume: number | null
  rsi14?: number | null
  ema12?: number | null
  ema26?: number | null
  ema50?: number | null
  ema100?: number | null
  ema200?: number | null
  macd?: number | null
  macdSignal?: number | null
  macdHist?: number | null
  // legacy / other signals (kept for compatibility)
  emaCross?: string
  tmvSignal?: string
  miSignal?: string
  trendSignal?: string
  viSignal?: string
  volumeIn?: number | null
  finalSignal?: string
  ts?: number
}

interface CryptoTableProps {
  timeframe: Timeframe
  limit?: number // optional limit for testing
}

function formatNum(v: number | null | undefined, digits = 4) {
  if (v === null || v === undefined || Number.isNaN(v)) return '-'
  // handle very large/small values gracefully
  if (Math.abs(v) >= 1000) return v.toLocaleString(undefined, { maximumFractionDigits: 0 })
  return v.toFixed(digits)
}

const CryptoTable: React.FC<CryptoTableProps> = ({ timeframe, limit = 200 }) => {
  const [rows, setRows] = useState<RowData[]>([])
  const [loading, setLoading] = useState(true)
  const symbolIndexRef = useRef<Record<string, number>>({})
  const esRef = useRef<EventSource | null>(null)
  const pollingRef = useRef<number | null>(null)

  // helper: build index map from rows
  const buildIndex = (r: RowData[]) => {
    const map: Record<string, number> = {}
    for (let i = 0; i < r.length; i++) map[r[i].symbol] = i
    symbolIndexRef.current = map
  }

  // fetch initial data from API (expects API that returns computed indicators)
  const fetchInitial = async () => {
    try {
      setLoading(true)
      const resp = await fetch(`/api/crypto?timeframe=${encodeURIComponent(timeframe)}&limit=${limit}`)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const data: RowData[] = await resp.json()
      setRows(data)
      buildIndex(data)
    } catch (err) {
      console.error('Failed to load initial data', err)
    } finally {
      setLoading(false)
    }
  }

  // patch a single row when update arrives
  const patchRow = (payload: Partial<RowData> & { symbol: string }) => {
    setRows((prev) => {
      // shallow copy
      const idx = symbolIndexRef.current[payload.symbol]
      if (idx === undefined) {
        // symbol not found — append it at the end (and update index)
        const next = [...prev, payload as RowData]
        buildIndex(next)
        return next
      }
      const next = [...prev]
      const existing = next[idx]
      next[idx] = { ...existing, ...payload, ts: Date.now() }
      return next
    })
  }

  // Setup SSE connection (preferred) and fallback polling
  useEffect(() => {
    let isMounted = true
    esRef.current = null
    if (pollingRef.current) {
      window.clearInterval(pollingRef.current)
      pollingRef.current = null
    }

    // first load
    fetchInitial()

    // try SSE
    try {
      const url = `/api/stream?timeframe=${encodeURIComponent(timeframe)}`
      const es = new EventSource(url)
      esRef.current = es

      es.addEventListener('candle', (ev: MessageEvent) => {
        try {
          // payload should match the server: { symbol, open, high, low, close, volume, ema12, ... }
          const payload = JSON.parse(ev.data)
          if (!payload || !payload.symbol) return
          patchRow(payload)
        } catch (err) {
          // ignore malformed messages
          console.warn('Malformed SSE candle message', err)
        }
      })

      es.onopen = () => {
        console.log('SSE connected for timeframe', timeframe)
        // if previously polling, stop it
        if (pollingRef.current) {
          clearInterval(pollingRef.current)
          pollingRef.current = null
        }
      }

      es.onerror = (err) => {
        console.warn('SSE error, falling back to polling for timeframe', timeframe, err)
        try {
          es.close()
        } catch (e) {}
        esRef.current = null
        // fallback: poll the API every 10s
        pollingRef.current = window.setInterval(() => {
          if (!isMounted) return
          fetchInitial()
        }, 10_000)
      }
    } catch (err) {
      console.warn('EventSource not available, using polling', err)
      pollingRef.current = window.setInterval(() => {
        if (!isMounted) return
        fetchInitial()
      }, 10_000)
    }

    return () => {
      isMounted = false
      if (esRef.current) {
        try {
          esRef.current.close()
        } catch (e) {}
        esRef.current = null
      }
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
    // re-run when timeframe changes
  }, [timeframe, limit])

  return (
    <div className="p-4 overflow-x-auto">
      <h2 className="text-xl font-semibold mb-4">Timeframe: {timeframe}</h2>

      {loading ? (
        <div className="text-center py-6">Loading...</div>
      ) : (
        <table className="w-full table-auto border-collapse rounded-lg shadow-md">
          <thead>
            <tr className="bg-gray-800 text-white text-xs">
              <th className="p-2">Symbol</th>
              <th className="p-2">Open</th>
              <th className="p-2">High</th>
              <th className="p-2">Low</th>
              <th className="p-2">Close</th>
              <th className="p-2">RSI(14)</th>
              <th className="p-2">EMA12</th>
              <th className="p-2">EMA26</th>
              <th className="p-2">MACD</th>
              <th className="p-2">EMA50</th>
              <th className="p-2">EMA100</th>
              <th className="p-2">EMA200</th>
              <th className="p-2">Volume</th>
              <th className="p-2">EMA Cross</th>
              <th className="p-2">TMV</th>
              <th className="p-2">MI</th>
              <th className="p-2">Trend</th>
              <th className="p-2">VI</th>
              <th className="p-2">Volume In</th>
              <th className="p-2">Final Signal</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr key={row.symbol} className="text-xs text-center border-b hover:bg-gray-100">
                <td className="p-2 font-semibold">{row.symbol}</td>
                <td className="p-2">{formatNum(row.open, 4)}</td>
                <td className="p-2">{formatNum(row.high, 4)}</td>
                <td className="p-2">{formatNum(row.low, 4)}</td>
                <td className="p-2">{formatNum(row.close, 4)}</td>
                <td className="p-2">{row.rsi14 ? row.rsi14.toFixed(2) : '-'}</td>
                <td className="p-2">{row.ema12 ? row.ema12.toFixed(4) : '-'}</td>
                <td className="p-2">{row.ema26 ? row.ema26.toFixed(4) : '-'}</td>
                <td className="p-2">{row.macd ? row.macd.toFixed(4) : '-'}</td>
                <td className="p-2">{row.ema50 ? row.ema50.toFixed(4) : '-'}</td>
                <td className="p-2">{row.ema100 ? row.ema100.toFixed(4) : '-'}</td>
                <td className="p-2">{row.ema200 ? row.ema200.toFixed(4) : '-'}</td>
                <td className="p-2">{row.volume ? (row.volume / 1e6).toFixed(2) + 'M' : '-'}</td>
                <td className="p-2">{row.emaCross ?? '-'}</td>
                <td className="p-2">{row.tmvSignal ?? '-'}</td>
                <td className="p-2">{row.miSignal ?? '-'}</td>
                <td className="p-2">{row.trendSignal ?? '-'}</td>
                <td className="p-2">{row.viSignal ?? '-'}</td>
                <td className="p-2">{row.volumeIn ? (row.volumeIn / 1e6).toFixed(2) + 'M' : '-'}</td>
                <td
                  className={`p-2 font-bold ${
                    row.finalSignal === 'BUY'
                      ? 'text-green-600'
                      : row.finalSignal === 'SELL'
                      ? 'text-red-600'
                      : 'text-gray-500'
                  }`}
                >
                  {row.finalSignal ?? '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default CryptoTable

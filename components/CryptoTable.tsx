// components/CryptoTable.tsx
'use client'

import React, { useEffect, useRef, useState } from 'react'

interface RowData {
  symbol: string
  open?: number | null
  high?: number | null
  low?: number | null
  close?: number | null
  volume?: number | null
  rsi14?: number | null
  ema12?: number | null
  ema26?: number | null
  ema50?: number | null
  ema100?: number | null
  ema200?: number | null
  macd?: number | null
  macdSignal?: number | null
  macdHist?: number | null
  // Optional legacy fields
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
  timeframe: string // keep flexible to avoid union type mismatch
  limit?: number
}

function formatNum(v: number | null | undefined, digits = 4) {
  if (v === null || v === undefined || Number.isNaN(v)) return '-'
  if (Math.abs(v) >= 1000) return v.toLocaleString(undefined, { maximumFractionDigits: 0 })
  return v.toFixed(digits)
}

const CryptoTable: React.FC<CryptoTableProps> = ({ timeframe = '1h', limit = 200 }) => {
  const [rows, setRows] = useState<RowData[]>([])
  const [loading, setLoading] = useState(true)
  const symbolIndexRef = useRef<Record<string, number>>({})
  const esRef = useRef<any>(null)
  const pollRef = useRef<number | null>(null)

  const buildIndex = (r: RowData[]) => {
    const map: Record<string, number> = {}
    for (let i = 0; i < r.length; i++) map[r[i].symbol] = i
    symbolIndexRef.current = map
  }

  // Initial load
  const fetchInitial = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/crypto?timeframe=${encodeURIComponent(timeframe)}&limit=${limit}`)
      if (!res.ok) throw new Error(`Initial data HTTP ${res.status}`)
      const data = (await res.json()) as RowData[]
      setRows(data)
      buildIndex(data)
    } catch (err) {
      console.error('fetchInitial error', err)
    } finally {
      setLoading(false)
    }
  }

  // patch a single incoming payload into rows state
  const patchRow = (payload: Partial<RowData> & { symbol: string }) => {
    setRows(prev => {
      const idx = symbolIndexRef.current[payload.symbol]
      if (idx === undefined) {
        const next = [...prev, payload as RowData]
        buildIndex(next)
        return next
      }
      const next = [...prev]
      next[idx] = { ...next[idx], ...payload, ts: Date.now() }
      return next
    })
  }

  useEffect(() => {
    let mounted = true
    // cleanup any previous SSE/poll
    if (esRef.current) {
      try { esRef.current.close() } catch {}
      esRef.current = null
    }
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }

    fetchInitial()

    // Safe EventSource factory (avoids TS DOM-lib errors)
    const EventSourceClass =
      typeof window !== 'undefined' && (window as any).EventSource ? (window as any).EventSource : null

    if (EventSourceClass) {
      try {
        const url = `/api/stream?timeframe=${encodeURIComponent(timeframe)}`
        const es = new EventSourceClass(url)
        esRef.current = es

        const onCandle = (ev: MessageEvent) => {
          try {
            const payload = JSON.parse(ev.data)
            if (!payload || !payload.symbol) return
            patchRow(payload)
          } catch (e) {
            console.warn('Malformed SSE payload', e)
          }
        }

        es.addEventListener('candle', onCandle)
        es.onopen = () => {
          // console.log('SSE opened', timeframe)
          if (pollRef.current) {
            clearInterval(pollRef.current)
            pollRef.current = null
          }
        }
        es.onerror = (err: any) => {
          console.warn('SSE error, falling back to polling', err)
          try { es.close() } catch {}
          esRef.current = null
          // fallback to polling initial endpoint every 10s
          pollRef.current = window.setInterval(() => {
            if (!mounted) return
            fetchInitial()
          }, 10_000)
        }
      } catch (err) {
        console.warn('EventSource creation failed, using polling', err)
        pollRef.current = window.setInterval(() => {
          if (!mounted) return
          fetchInitial()
        }, 10_000)
      }
    } else {
      // no EventSource available (very rare) -> poll
      pollRef.current = window.setInterval(() => {
        if (!mounted) return
        fetchInitial()
      }, 10_000)
    }

    return () => {
      mounted = false
      if (esRef.current) {
        try { esRef.current.close() } catch {}
        esRef.current = null
      }
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
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

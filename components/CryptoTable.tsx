'use client'

import React, { useEffect, useState } from 'react'

interface SymbolData {
  symbol: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  rsi: number
  ema12: number
  ema26: number
  ema50: number
  ema100: number
  ema200: number
  macd: number
  emaCross: string
  tmvSignal: string
  miSignal: string
  trendSignal: string
  viSignal: string
  volumeIn: number
  finalSignal: string
}

type Timeframe = '15m' | '1h' | '4h' | '1D'

interface CryptoTableProps {
  timeframe: Timeframe
}

// --- simple helpers ---
function calcEMA(prices: number[], length: number): number {
  if (prices.length < length) return 0
  const k = 2 / (length + 1)
  return prices.reduce((prev, curr, idx) => {
    if (idx === 0) return curr
    return curr * k + prev * (1 - k)
  })
}

function calcRSI(prices: number[], period = 14): number {
  if (prices.length < period) return 0
  let gains = 0
  let losses = 0
  for (let i = 1; i < period; i++) {
    const diff = prices[i] - prices[i - 1]
    if (diff > 0) gains += diff
    else losses -= diff
  }
  const rs = gains / (losses || 1)
  return 100 - 100 / (1 + rs)
}

const CryptoTable: React.FC<CryptoTableProps> = ({ timeframe }) => {
  const [data, setData] = useState<SymbolData[]>([])
  const [priceHistory, setPriceHistory] = useState<Record<string, number[]>>({})

  useEffect(() => {
    const ws = new WebSocket('wss://stream.binance.com:9443/ws/!ticker@arr')

    ws.onmessage = (event) => {
      const updates = JSON.parse(event.data)
      const filtered = updates.filter((t: any) => t.s.endsWith('USDT'))

      const newData: SymbolData[] = filtered.map((t: any) => {
        const symbol = t.s
        const close = parseFloat(t.c)
        const open = parseFloat(t.o)
        const high = parseFloat(t.h)
        const low = parseFloat(t.l)
        const volume = parseFloat(t.v)

        // update price history
        setPriceHistory((prev) => {
          const arr = prev[symbol] ? [...prev[symbol], close].slice(-200) : [close]
          return { ...prev, [symbol]: arr }
        })

        const history = priceHistory[symbol] || [close]
        const ema12 = calcEMA(history, 12)
        const ema26 = calcEMA(history, 26)
        const ema50 = calcEMA(history, 50)
        const ema100 = calcEMA(history, 100)
        const ema200 = calcEMA(history, 200)
        const rsi = calcRSI(history, 14)
        const macd = ema12 - ema26

        const emaCross = ema12 > ema26 ? 'BULL' : 'BEAR'
        const tmvSignal = macd > 0 ? 'BUY' : 'SELL'
        const miSignal = rsi > 50 ? 'UP' : 'DOWN'
        const trendSignal = ema50 > ema200 ? 'UPTREND' : 'DOWNTREND'
        const viSignal = volume > 0 ? 'ACTIVE' : '-'
        const finalSignal =
          emaCross === 'BULL' && macd > 0 && rsi > 50 ? 'BUY' : 'HOLD'

        return {
          symbol,
          open,
          high,
          low,
          close,
          volume,
          rsi,
          ema12,
          ema26,
          ema50,
          ema100,
          ema200,
          macd,
          emaCross,
          tmvSignal,
          miSignal,
          trendSignal,
          viSignal,
          volumeIn: volume,
          finalSignal,
        }
      })

      setData(newData)
    }

    ws.onerror = (err) => console.error('WebSocket error:', err)
    ws.onclose = () => console.warn('WebSocket closed')

    return () => ws.close()
  }, [timeframe, priceHistory])

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
          {data.map((row) => (
            <tr key={row.symbol} className="text-xs text-center border-b hover:bg-gray-100">
              <td className="p-2 font-semibold">{row.symbol}</td>
              <td className="p-2">{row.open.toFixed(4)}</td>
              <td className="p-2">{row.high.toFixed(4)}</td>
              <td className="p-2">{row.low.toFixed(4)}</td>
              <td className="p-2">{row.close.toFixed(4)}</td>
              <td className="p-2">{row.rsi.toFixed(2)}</td>
              <td className="p-2">{row.ema12.toFixed(4)}</td>
              <td className="p-2">{row.ema26.toFixed(4)}</td>
              <td className="p-2">{row.macd.toFixed(4)}</td>
              <td className="p-2">{row.ema50.toFixed(4)}</td>
              <td className="p-2">{row.ema100.toFixed(4)}</td>
              <td className="p-2">{row.ema200.toFixed(4)}</td>
              <td className="p-2">{(row.volume / 1e6).toFixed(2)}M</td>
              <td className="p-2">{row.emaCross}</td>
              <td className="p-2">{row.tmvSignal}</td>
              <td className="p-2">{row.miSignal}</td>
              <td className="p-2">{row.trendSignal}</td>
              <td className="p-2">{row.viSignal}</td>
              <td className="p-2">{(row.volumeIn / 1e6).toFixed(2)}M</td>
              <td
                className={`p-2 font-bold ${
                  row.finalSignal === 'BUY'
                    ? 'text-green-600'
                    : row.finalSignal === 'SELL'
                    ? 'text-red-600'
                    : 'text-gray-500'
                }`}
              >
                {row.finalSignal}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default CryptoTable

import type { NextApiRequest, NextApiResponse } from 'next';
import { getFuturesSymbols, getKlines } from '@/lib/binance';
import { ema, macd, rsi } from '@/lib/indicators';

type IndicatorPayload = {
  symbol: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  ema12?: number;
  ema26?: number;
  ema50?: number;
  ema100?: number;
  ema200?: number;
  macd?: number;
  macdSignal?: number;
  macdHist?: number;
  rsi14?: number;
  ts: number;
};

const VALID = ['15m', '1h', '4h', '1d'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const timeframe = (req.query.timeframe as string) || '1h';
    if (!VALID.includes(timeframe)) {
      return res.status(400).json({ error: 'Invalid timeframe. Use one of 15m,1h,4h,1d' });
    }

    // fetch futures symbols
    const symbols = await getFuturesSymbols();
    // optional: limit for testing
    const limitSymbols = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : symbols.length;
    const selected = symbols.slice(0, Math.min(limitSymbols, symbols.length));

    const results: IndicatorPayload[] = [];

    // For each symbol, fetch klines and compute indicators
    for (const symbol of selected) {
      try {
        const klines = await getKlines(symbol, timeframe, 500);
        if (!klines || klines.length === 0) continue;
        const closes = klines.map(k => k.close);
        const last = klines[klines.length - 1];

        // compute EMA series
        const ema12Series = ema(closes, 12);
        const ema26Series = ema(closes, 26);
        const ema50Series = ema(closes, 50);
        const ema100Series = ema(closes, 100);
        const ema200Series = ema(closes, 200);

        const macdRes = macd(closes, 12, 26, 9);
        const rsiRes = rsi(closes, 14);

        const payload: IndicatorPayload = {
          symbol,
          open: last.open,
          high: last.high,
          low: last.low,
          close: last.close,
          volume: last.volume,
          ema12: ema12Series[ema12Series.length - 1] ?? null,
          ema26: ema26Series[ema26Series.length - 1] ?? null,
          ema50: ema50Series[ema50Series.length - 1] ?? null,
          ema100: ema100Series[ema100Series.length - 1] ?? null,
          ema200: ema200Series[ema200Series.length - 1] ?? null,
          macd: macdRes.macdLine[macdRes.macdLine.length - 1] ?? null,
          macdSignal: macdRes.signalLine[macdRes.signalLine.length - 1] ?? null,
          macdHist: macdRes.histogram[macdRes.histogram.length - 1] ?? null,
          rsi14: rsiRes[rsiRes.length - 1] ?? null,
          ts: Date.now(),
        };
        results.push(payload);
      } catch (err) {
        console.error('Error processing symbol', symbol, err);
      }
    }

    // Return all payloads
    return res.status(200).json(results);
  } catch (err) {
    console.error('Unexpected error in crypto API', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

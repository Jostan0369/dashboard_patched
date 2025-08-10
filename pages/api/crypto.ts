
import type { NextApiRequest, NextApiResponse } from 'next';
import { pusher } from '@/lib/pusher';
import { getFromBinance, getUSDTSymbols, getKlines } from '@/lib/binance';
import { macd, ema, rsi } from '@/lib/indicators';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { timeframe = '1h', limit = '200' } = req.query;
    const valid = ['1m','5m','15m','30m','1h','4h','1d','1w','1M'];
    if (typeof timeframe !== 'string' || !valid.includes(timeframe)) {
      return res.status(400).json({ error: 'Invalid timeframe' });
    }
    const maxSymbols = Math.min(1000, parseInt(String(limit) || '200', 10) || 200);

    // discover all USDT symbols from Binance
    const allSymbols = await getUSDTSymbols();
    // optionally sort by symbol and limit
    const selected = allSymbols.slice(0, maxSymbols);

    const promises = selected.map(async (symbol) => {
      try {
        const klines = await getKlines(symbol, timeframe, 500);
        if (!klines || klines.length===0) return null;
        const closes = klines.map(k=>k.close);
        const latest = klines[klines.length-1];
        // indicators
        const ema12 = ema(closes,12).slice(-1)[0] ?? null;
        const ema26 = ema(closes,26).slice(-1)[0] ?? null;
        const ema50 = ema(closes,50).slice(-1)[0] ?? null;
        const ema100 = ema(closes,100).slice(-1)[0] ?? null;
        const ema200 = ema(closes,200).slice(-1)[0] ?? null;
        const mac = macd(closes,12,26,9);
        const macdVal = mac.macd.slice(-1)[0] ?? null;
        const macdSignal = mac.signal.slice(-1)[0] ?? null;
        const macdHist = mac.hist.slice(-1)[0] ?? null;
        const rsi14 = rsi(closes,14).slice(-1)[0] ?? null;

        const payload = {
          symbol,
          open: latest.open,
          high: latest.high,
          low: latest.low,
          close: latest.close,
          volume: latest.volume,
          ema12,
          ema26,
          ema50,
          ema100,
          ema200,
          macd: macdVal,
          macdSignal,
          macdHist,
          rsi14,
          ts: Date.now()
        };
        // optionally push via pusher for realtime
        try {
          await pusher.trigger('crypto-channel', 'price-update', payload);
        } catch(e){
          // ignore
        }
        return payload;
      } catch (err) {
        return null;
      }
    });

    const result = (await Promise.all(promises)).filter(Boolean);
    return res.status(200).json(result);
  } catch (err:any) {
    console.error('crypto api error', err?.stack||err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

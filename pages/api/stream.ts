// pages/api/stream.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { BinanceWsManager } from '@/lib/binanceWs';
import { getFuturesSymbols } from '@/lib/binance';

let managerInstances: Map<string, BinanceWsManager> = new Map(); // keyed by timeframe

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const timeframe = (req.query.timeframe as string) || '1m';
  const valid = ['1m', '15m', '1h', '4h', '1d'];
  if (!valid.includes(timeframe)) {
    res.write(`event: error\ndata: ${JSON.stringify({ error: 'Invalid timeframe' })}\n\n`);
    res.end();
    return;
  }

  // create or get manager for timeframe
  let manager = managerInstances.get(timeframe);
  if (!manager) {
    // fetch futures symbols (perpetual USDT)
    const symbols = await getFuturesSymbols();
    manager = new BinanceWsManager(symbols, timeframe);
    managerInstances.set(timeframe, manager);
    manager.init().catch(err => console.error('Manager init failed', err));
  }

  // Individual connection: subscribe to manager events and forward
  const onCandle = (payload: any) => {
    // send JSON diff (client receives and updates UI)
    const data = JSON.stringify(payload);
    res.write(`event: candle\ndata: ${data}\n\n`);
  };

  manager.on('candle', onCandle);

  // Keep connection alive by sending a comment ping every 30s
  const keepAlive = setInterval(() => res.write(': ping\n\n'), 30_000);

  // On client disconnect
  req.on('close', () => {
    clearInterval(keepAlive);
    manager!.off('candle', onCandle);
    // Optionally: stop manager if no listeners remain (left as improvement)
  });
}

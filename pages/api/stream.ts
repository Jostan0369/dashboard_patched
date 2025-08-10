// pages/api/stream.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import WebSocket from 'ws';
import { pusher } from '@/lib/pusher';

let binanceSocket: WebSocket | null = null;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (binanceSocket) {
    res.status(200).json({ message: '🔄 Already connected to Binance stream' });
    return;
  }

  console.log('🔌 Connecting to Binance miniTicker stream...');

  binanceSocket = new WebSocket('wss://stream.binance.com:9443/ws/!miniTicker@arr');

  binanceSocket.onmessage = async (event) => {
    try {
      const dataString = typeof event.data === 'string' ? event.data : event.data.toString();
      const data = JSON.parse(dataString);

      if (!Array.isArray(data)) return;

      const usdtPairs = data.filter((d: any) => d.s?.endsWith('USDT'));

      const priceMap: Record<string, number> = {};
      for (const pair of usdtPairs) {
        const symbol = pair.s;
        const close = parseFloat(pair.c);
        if (!isNaN(close)) {
          priceMap[symbol] = close;
        }
      }

      // Trigger Pusher event with updated prices
      await pusher.trigger('crypto-channel', 'price-update', priceMap);
    } catch (err) {
      console.error('❌ WebSocket parse error:', err);
    }
  };

  binanceSocket.onerror = (err) => {
    console.error('❌ Binance WebSocket error:', err);
  };

  binanceSocket.onclose = () => {
    console.log('🔌 Binance WebSocket closed');
    binanceSocket = null;
  };

  res.status(200).json({ message: '✅ Binance stream connected and Pusher active' });
}

// lib/binanceWs.ts
import WebSocket from 'ws';
import axios from 'axios';
import EventEmitter from 'events';
import { ema, macd, rsi } from './indicators';

type KlineObj = {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
  isFinal: boolean;
};

const BINANCE_FUTURES_BASE = 'wss://fstream.binance.com/stream?streams=';

export class BinanceWsManager extends EventEmitter {
  private batches: string[][] = [];
  private sockets: Map<number, WebSocket> = new Map();
  private backoffs: Map<number, number> = new Map();
  private cache: Map<string, number[]> = new Map(); // symbol -> close series (recent)
  private klinesNeeded = 500; // store last N closes
  private batchSize = 60; // number of streams per combined connection
  private timerPingMs = 60_000 * 2; // 2 minutes ping (binance may not require but helps)
  private symbols: string[] = [];
  private timeframe: string; // e.g., '1m', '15m', '1h'

  constructor(symbols: string[], timeframe = '1m') {
    super();
    this.symbols = symbols;
    this.timeframe = timeframe;
    this.makeBatches();
  }

  private makeBatches() {
    this.batches = [];
    for (let i = 0; i < this.symbols.length; i += this.batchSize) {
      const chunk = this.symbols.slice(i, i + this.batchSize).map(s => `${s.toLowerCase()}@kline_${this.timeframe}`);
      this.batches.push(chunk);
    }
  }

  async init() {
    // Pre-load historical close series for all symbols (one-time)
    await Promise.all(this.symbols.map(s => this.fetchInitialKlines(s)));
    // Connect all batches
    this.batches.forEach((b, idx) => this.connectBatch(b, idx));
  }

  private async fetchInitialKlines(symbol: string) {
    try {
      const url = `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${this.timeframe}&limit=${this.klinesNeeded}`;
      const { data } = await axios.get(url, { timeout: 15000 });
      const closes = data.map((k: any[]) => parseFloat(k[4]));
      this.cache.set(symbol, closes);
    } catch (err) {
      console.warn('Failed to fetch initial klines for', symbol, err?.message || err);
      this.cache.set(symbol, []); // fallback
    }
  }

  private connectBatch(streams: string[], batchIndex: number) {
    if (!streams || streams.length === 0) return;
    const url = BINANCE_FUTURES_BASE + streams.join('/');
    const ws = new WebSocket(url, { handshakeTimeout: 20000 });

    this.sockets.set(batchIndex, ws);
    this.backoffs.set(batchIndex, 1000);

    let pingTimer: NodeJS.Timeout | null = null;

    ws.on('open', () => {
      this.backoffs.set(batchIndex, 1000);
      // optional ping
      if (pingTimer) clearInterval(pingTimer);
      pingTimer = setInterval(() => {
        try {
          ws.ping();
        } catch (e) {}
      }, this.timerPingMs);
      console.log(`Binance WS batch ${batchIndex} opened (${streams.length} streams)`);
    });

    ws.on('message', (msg) => {
      try {
        const parsed = JSON.parse(msg.toString());
        // combined stream format: { stream: 'btcusdt@kline_1m', data: { ... } }
        if (!parsed || !parsed.data) return;
        const data = parsed.data;
        if (data.e === 'kline') {
          const k = this.parseKline(data.k);
          const symbol = data.s; // e.g. BTCUSDT
          this.handleKline(symbol, k);
        }
      } catch (err) {
        // ignore parse errors
      }
    });

    ws.on('close', (code, reason) => {
      if (pingTimer) clearInterval(pingTimer);
      console.warn(`Binance WS batch ${batchIndex} closed:`, code, reason?.toString?.() || reason);
      this.sockets.delete(batchIndex);
      this.scheduleReconnect(streams, batchIndex);
    });

    ws.on('error', (err) => {
      console.error('Binance WS error:', err?.message || err);
      // socket 'close' will also be emitted; ensure closed
      try { ws.terminate(); } catch (e) {}
    });
  }

  private scheduleReconnect(streams: string[], batchIndex: number) {
    const prev = this.backoffs.get(batchIndex) ?? 1000;
    const next = Math.min(prev * 2, 60000); // exponential backoff up to 60s
    this.backoffs.set(batchIndex, next);
    setTimeout(() => this.connectBatch(streams, batchIndex), next);
  }

  private parseKline(k: any): KlineObj {
    return {
      openTime: k.t,
      open: parseFloat(k.o),
      high: parseFloat(k.h),
      low: parseFloat(k.l),
      close: parseFloat(k.c),
      volume: parseFloat(k.v),
      closeTime: k.T,
      isFinal: !!k.x,
    };
  }

  private handleKline(symbol: string, k: KlineObj) {
    // update cache
    const existing = this.cache.get(symbol) || [];
    // keep length limited
    existing.push(k.close);
    if (existing.length > this.klinesNeeded) existing.splice(0, existing.length - this.klinesNeeded);
    this.cache.set(symbol, existing);

    // compute indicators on the latest series when the kline closed (isFinal === true)
    // but you may also want intra-candle updates -> remove isFinal check if needed
    if (!k.isFinal) {
      // optionally still emit live partials — we'll only compute on final for accuracy
      return;
    }

    const closes = this.cache.get(symbol) || [];
    if (closes.length < 2) return;

    const ema12Series = ema(closes, 12);
    const ema26Series = ema(closes, 26);
    const ema50Series = ema(closes, 50);
    const ema100Series = ema(closes, 100);
    const ema200Series = ema(closes, 200);
    const macdRes = macd(closes, 12, 26, 9);
    const rsiRes = rsi(closes, 14);

    const payload = {
      symbol,
      open: k.open,
      high: k.high,
      low: k.low,
      close: k.close,
      volume: k.volume,
      ema12: lastOrNull(ema12Series),
      ema26: lastOrNull(ema26Series),
      ema50: lastOrNull(ema50Series),
      ema100: lastOrNull(ema100Series),
      ema200: lastOrNull(ema200Series),
      macd: lastOrNull(macdRes.macdLine),
      macdSignal: lastOrNull(macdRes.signalLine),
      macdHist: lastOrNull(macdRes.histogram),
      rsi14: lastOrNull(rsiRes),
      ts: Date.now(),
    };

    // emit event for consumers (SSE endpoint will listen)
    this.emit('candle', payload);
  }

  // utility to return last element or null
  public getCachedCloses(symbol: string) {
    return this.cache.get(symbol) || [];
  }
}

function lastOrNull(arr: any[]) {
  if (!arr || arr.length === 0) return null;
  const v = arr[arr.length - 1];
  if (v === undefined || Number.isNaN(v)) return null;
  return v;
}

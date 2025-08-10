// lib/binance.ts - Futures-only helper for Binance USDT perpetual futures
import axios from 'axios';

export interface Kline {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
}

export async function getFuturesSymbols(): Promise<string[]> {
  // Fetch futures exchange info (USDT-margined futures)
  const url = 'https://fapi.binance.com/fapi/v1/exchangeInfo';
  const { data } = await axios.get(url);
  if (!data || !data.symbols) return [];
  const symbols = data.symbols
    .filter((s: any) => s.quoteAsset === 'USDT' && s.contractType === 'PERPETUAL' && s.status === 'TRADING')
    .map((s: any) => s.symbol)
    .sort();
  return symbols;
}

export async function getKlines(symbol: string, interval = '1h', limit = 500): Promise<Kline[]> {
  const url = `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  const { data } = await axios.get(url);
  // data is array of arrays
  const mapped: Kline[] = data.map((k: any[]) => ({
    openTime: k[0],
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
    volume: parseFloat(k[5]),
    closeTime: k[6],
  }));
  return mapped;
}

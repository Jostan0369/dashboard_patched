import axios from 'axios';
import { CryptoData } from '@/types';

/*
 Extended binance helper functions:
 - getFromBinance (existing)
 - getUSDTSymbols()
 - getKlines(symbol, interval, limit)
*/

export async function getFromBinance(symbol: string): Promise<CryptoData> {
  const url = `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`;
  const { data } = await axios.get(url);

  return {
    symbol,
    price: parseFloat(data.lastPrice),
    volume: parseFloat(data.volume),
    lastClose: parseFloat(data.lastPrice), // assuming this for consistency
    source: 'Binance'
  };
}

export async function getUSDTSymbols(): Promise<string[]> {
  // fetch exchange info and filter symbols with quoteAsset === 'USDT' and status 'TRADING'
  const url = 'https://api.binance.com/api/v3/exchangeInfo';
  const { data } = await axios.get(url);
  if (!data || !data.symbols) return [];
  const syms = data.symbols
    .filter((s: any) => s.quoteAsset === 'USDT' && s.status === 'TRADING')
    .map((s: any) => s.symbol);
  // remove leveraged tokens like BTCUP etc by basic heuristic (symbols longer than 12 char are rare)
  return Array.from(new Set(syms)).sort();
}

export async function getKlines(symbol: string, interval='1h', limit=500) {
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  const { data } = await axios.get(url);
  // each kline: [openTime, open, high, low, close, volume, closeTime, ...]
  return data.map((k: any) => ({
    openTime: k[0],
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
    volume: parseFloat(k[5]),
    closeTime: k[6],
  }));
}

// components/CryptoTable.tsx
import React, { useEffect, useState } from "react";

interface CryptoData {
  symbol: string;
  open: number;
  high: number;
  low: number;
  close: number;
  rsi: number;
  ema12: number;
  ema26: number;
  macd: number;
  ema: number;
}

const CryptoTable: React.FC = () => {
  const [data, setData] = useState<CryptoData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // ✅ Binance Futures USDT pairs
        const res = await fetch("https://api.binance.com/api/v3/ticker/24hr");
        const allData = await res.json();

        // Filter only USDT pairs
        const filtered = allData.filter((item: any) => item.symbol.endsWith("USDT"));

        // Format data (placeholder RSI, EMA, MACD values)
        const formatted: CryptoData[] = filtered.map((item: any) => ({
          symbol: item.symbol,
          open: parseFloat(item.openPrice),
          high: parseFloat(item.highPrice),
          low: parseFloat(item.lowPrice),
          close: parseFloat(item.lastPrice),
          rsi: Math.random() * 100, // Replace with real calculation later
          ema12: parseFloat(item.lastPrice), // Placeholder
          ema26: parseFloat(item.lastPrice), // Placeholder
          macd: 0, // Placeholder
          ema: parseFloat(item.lastPrice), // Placeholder
        }));

        setData(formatted);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data", error);
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60000); // Auto-refresh every 1 min
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="text-center py-4">Loading...</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border border-gray-300">
        <thead className="bg-gray-100">
          <tr>
            <th className="border px-4 py-2">Symbol</th>
            <th className="border px-4 py-2">Open</th>
            <th className="border px-4 py-2">High</th>
            <th className="border px-4 py-2">Low</th>
            <th className="border px-4 py-2">Close</th>
            <th className="border px-4 py-2">RSI</th>
            <th className="border px-4 py-2">EMA12</th>
            <th className="border px-4 py-2">EMA26</th>
            <th className="border px-4 py-2">MACD</th>
            <th className="border px-4 py-2">EMA</th>
          </tr>
        </thead>
        <tbody>
          {data.map((coin, index) => (
            <tr key={index} className="text-center">
              <td className="border px-4 py-2">{coin.symbol}</td>
              <td className="border px-4 py-2">{coin.open.toFixed(4)}</td>
              <td className="border px-4 py-2">{coin.high.toFixed(4)}</td>
              <td className="border px-4 py-2">{coin.low.toFixed(4)}</td>
              <td className="border px-4 py-2">{coin.close.toFixed(4)}</td>
              <td className="border px-4 py-2">{coin.rsi.toFixed(2)}</td>
              <td className="border px-4 py-2">{coin.ema12.toFixed(4)}</td>
              <td className="border px-4 py-2">{coin.ema26.toFixed(4)}</td>
              <td className="border px-4 py-2">{coin.macd.toFixed(4)}</td>
              <td className="border px-4 py-2">{coin.ema.toFixed(4)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CryptoTable;

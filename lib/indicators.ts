// lib/indicators.ts - basic indicator implementations
export function ema(series: number[], period: number): number[] {
  if (!series || series.length === 0) return [];
  const k = 2 / (period + 1);
  const out: number[] = [];
  // Start with first value as seed (caller can ignore initial values)
  let prev = series[0];
  out[0] = prev;
  for (let i = 1; i < series.length; i++) {
    const val = series[i] * k + prev * (1 - k);
    out[i] = val;
    prev = val;
  }
  return out;
}

export function sma(series: number[], period: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < series.length; i++) {
    if (i + 1 < period) {
      out.push(NaN);
      continue;
    }
    const slice = series.slice(i + 1 - period, i + 1);
    const sum = slice.reduce((a, b) => a + b, 0);
    out.push(sum / period);
  }
  return out;
}

export function macd(series: number[], fast = 12, slow = 26, signal = 9) {
  if (!series || series.length === 0) return { macdLine: [], signalLine: [], histogram: [] };
  const emaFast = ema(series, fast);
  const emaSlow = ema(series, slow);
  const macdLine = series.map((_, i) => {
    const a = emaFast[i];
    const b = emaSlow[i];
    if (a === undefined || b === undefined) return NaN;
    return a - b;
  });
  const signalLine = ema(macdLine.map(v => isNaN(v) ? 0 : v), signal);
  const histogram = macdLine.map((v, i) => {
    const s = signalLine[i];
    if (s === undefined) return NaN;
    return v - s;
  });
  return { macdLine, signalLine, histogram };
}

export function rsi(series: number[], period = 14) {
  const out: number[] = [];
  if (!series || series.length === 0) return out;
  let gains = 0;
  let losses = 0;
  for (let i = 0; i < series.length; i++) {
    if (i === 0) {
      out.push(NaN);
      continue;
    }
    const change = series[i] - series[i - 1];
    const gain = Math.max(0, change);
    const loss = Math.max(0, -change);
    if (i <= period) {
      gains += gain;
      losses += loss;
      if (i === period) {
        const avgGain = gains / period;
        const avgLoss = losses / period;
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        out.push(100 - 100 / (1 + rs));
      } else {
        out.push(NaN);
      }
    } else {
      // Wilder's smoothing
      gains = (gains * (period - 1) + gain) / period;
      losses = (losses * (period - 1) + loss) / period;
      const rs = losses === 0 ? 100 : gains / losses;
      out.push(100 - 100 / (1 + rs));
    }
  }
  return out;
}

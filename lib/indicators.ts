// lib/indicators.ts
export function sma(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (values.length < period) return out;
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

export function ema(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (values.length < period) return out;
  // seed with SMA of first period
  const smaArr = sma(values, period);
  let prev = smaArr[period - 1] as number;
  out[period - 1] = prev;
  const k = 2 / (period + 1);
  for (let i = period; i < values.length; i++) {
    const cur = values[i] * k + prev * (1 - k);
    out[i] = cur;
    prev = cur;
  }
  return out;
}

export function macd(values: number[], fast = 12, slow = 26, signal = 9) {
  const fastEma = ema(values, fast); // array with null where undefined
  const slowEma = ema(values, slow);
  const macdLine: (number | null)[] = new Array(values.length).fill(null);
  for (let i = 0; i < values.length; i++) {
    if (fastEma[i] != null && slowEma[i] != null) {
      macdLine[i] = (fastEma[i] as number) - (slowEma[i] as number);
    }
  }
  // compute signal as ema over macdLine values (skip nulls in initial)
  // we'll build a compact array for macd numbers and map back
  const macdNums: number[] = [];
  const macdIndexMap: number[] = []; // maps macdNums index -> original index
  for (let i = 0; i < macdLine.length; i++) {
    if (macdLine[i] != null) {
      macdIndexMap.push(i);
      macdNums.push(macdLine[i] as number);
    }
  }
  const signalArrCompact = ema(macdNums, signal); // returns null for indices before signal start
  const signalLine: (number | null)[] = new Array(values.length).fill(null);
  for (let j = 0; j < signalArrCompact.length; j++) {
    const origIdx = macdIndexMap[j];
    signalLine[origIdx] = signalArrCompact[j];
  }
  const histogram: (number | null)[] = new Array(values.length).fill(null);
  for (let i = 0; i < values.length; i++) {
    if (macdLine[i] != null && signalLine[i] != null) {
      histogram[i] = (macdLine[i] as number) - (signalLine[i] as number);
    }
  }
  return { macdLine, signalLine, histogram, fastEma, slowEma };
}

export function rsi(values: number[], period = 14): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (values.length < period + 1) return out;

  // initial average gain/loss
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = values[i] - values[i - 1];
    if (diff > 0) gain += diff;
    else loss += -diff;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < values.length; i++) {
    const diff = values[i] - values[i - 1];
    const g = diff > 0 ? diff : 0;
    const l = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + g) / period;
    avgLoss = (avgLoss * (period - 1) + l) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

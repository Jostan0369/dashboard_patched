
// lib/indicators.ts
// Lightweight technical indicators: EMA, MACD, RSI
export function ema(series: number[], length: number): number[] {
  const result: number[] = [];
  if (series.length === 0 || length <= 0) return result;
  const k = 2 / (length + 1);
  let prev = series.slice(0, length).reduce((a,b)=>a+b,0)/Math.max(1,length);
  // start at first value
  for (let i=0;i<series.length;i++) {
    const price = series[i];
    if (i===0) {
      prev = price;
    } else {
      prev = price * k + prev * (1 - k);
    }
    result.push(prev);
  }
  return result;
}

export function macd(series: number[], fast=12, slow=26, signal=9) {
  if (series.length===0) return {macd:[], signal:[], hist:[]};
  const emaFast = ema(series, fast);
  const emaSlow = ema(series, slow);
  const macdLine = emaFast.map((v,i)=> v - (emaSlow[i] ?? v));
  const signalLine = ema(macdLine, signal);
  const hist = macdLine.map((v,i)=> v - (signalLine[i] ?? 0));
  return { macd: macdLine, signal: signalLine, hist };
}

export function rsi(series: number[], length=14) {
  const out: number[] = [];
  if (series.length < 2) return out;
  let gains=0, losses=0;
  for (let i=1;i<series.length;i++) {
    const change = series[i]-series[i-1];
    if (i<=length) {
      if (change>0) gains+=change; else losses+= Math.abs(change);
      if (i===length) {
        let avgGain = gains/length;
        let avgLoss = losses/length;
        let rs = avgLoss===0? 100 : avgGain/avgLoss;
        out[length] = 100 - (100/(1+rs));
      }
      out.push(NaN);
    } else {
      // steadily compute using Wilder smoothing
      // fallback simple
      // compute over previous length
      const slice = series.slice(i-length, i+1);
      let g=0,l=0;
      for (let j=1;j<slice.length;j++){
        const c = slice[j]-slice[j-1];
        if (c>0) g+=c; else l+=Math.abs(c);
      }
      const avgGain = g/length;
      const avgLoss = l/length;
      const rs = avgLoss===0? 100 : avgGain/avgLoss;
      out.push(100 - (100/(1+rs)));
    }
  }
  // pad to match length
  while(out.length<series.length) out.unshift(NaN);
  return out;
}

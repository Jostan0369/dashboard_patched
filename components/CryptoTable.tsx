<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Binance USDT Futures Live Dashboard</title>
  <style>
    body { font-family: Arial, sans-serif; background: #111; color: #fff; }
    table { border-collapse: collapse; width: 100%; }
    th, td { padding: 6px; border: 1px solid #444; text-align: right; }
    th { background: #222; position: sticky; top: 0; }
    tr:nth-child(even) { background: #181818; }
    .up { color: #0f0; }
    .down { color: #f00; }
  </style>
</head>
<body>
  <h2>Binance USDT Futures Live Table</h2>
  <table id="cryptoTable">
    <thead>
      <tr>
        <th>Symbol</th>
        <th>Open</th>
        <th>High</th>
        <th>Low</th>
        <th>Close</th>
        <th>Volume</th>
        <th>RSI</th>
        <th>MACD</th>
        <th>EMA12</th>
        <th>EMA26</th>
        <th>EMA50</th>
        <th>EMA100</th>
        <th>EMA200</th>
      </tr>
    </thead>
    <tbody></tbody>
  </table>

<script>
const tableBody = document.querySelector("#cryptoTable tbody");
let symbols = [];
let priceData = {};
let ohlcData = {};

// RSI Calculation
function calculateRSI(closes, period = 14) {
  let gains = 0, losses = 0;
  for (let i = 1; i < period + 1; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  const rs = gains / losses;
  return (100 - (100 / (1 + rs))).toFixed(2);
}

// EMA Calculation
function calculateEMA(closes, period) {
  const k = 2 / (period + 1);
  let ema = closes[0];
  for (let i = 1; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k);
  }
  return ema.toFixed(2);
}

// MACD Calculation
function calculateMACD(closes) {
  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);
  return (ema12 - ema26).toFixed(2);
}

// Fetch all symbols
async function fetchSymbols() {
  let res = await fetch("https://fapi.binance.com/fapi/v1/exchangeInfo");
  let data = await res.json();
  symbols = data.symbols.filter(s => s.symbol.endsWith("USDT")).map(s => s.symbol.toLowerCase());
  buildTable();
  fetchOHLC();
  initWebSocket();
}

// Build table with static symbol list
function buildTable() {
  tableBody.innerHTML = "";
  symbols.forEach(sym => {
    const row = document.createElement("tr");
    row.innerHTML = `<td>${sym.toUpperCase()}</td>` + "<td></td>".repeat(12);
    tableBody.appendChild(row);
  });
}

// Fetch OHLC for indicators
async function fetchOHLC() {
  for (let sym of symbols) {
    let res = await fetch(`https://fapi.binance.com/fapi/v1/klines?symbol=${sym.toUpperCase()}&interval=1m&limit=250`);
    let data = await res.json();
    let closes = data.map(c => parseFloat(c[4]));
    let open = parseFloat(data[0][1]);
    let high = Math.max(...data.map(c => parseFloat(c[2])));
    let low = Math.min(...data.map(c => parseFloat(c[3])));
    let close = closes[closes.length - 1];
    let volume = parseFloat(data[data.length - 1][5]);

    let rsi = calculateRSI(closes);
    let macd = calculateMACD(closes);
    let ema12 = calculateEMA(closes, 12);
    let ema26 = calculateEMA(closes, 26);
    let ema50 = calculateEMA(closes, 50);
    let ema100 = calculateEMA(closes, 100);
    let ema200 = calculateEMA(closes, 200);

    ohlcData[sym] = { open, high, low, close, volume, rsi, macd, ema12, ema26, ema50, ema100, ema200 };
    updateRow(sym);
  }
}

// WebSocket for live price updates
function initWebSocket() {
  let streams = symbols.map(s => `${s}@ticker`).join("/");
  let ws = new WebSocket(`wss://fstream.binance.com/stream?streams=${streams}`);
  ws.onmessage = (event) => {
    let msg = JSON.parse(event.data);
    if (msg.data) {
      let sym = msg.data.s.toLowerCase();
      let price = parseFloat(msg.data.c);
      if (ohlcData[sym]) {
        ohlcData[sym].close = price;
        updateRow(sym, true);
      }
    }
  };
  ws.onclose = () => setTimeout(initWebSocket, 3000);
}

// Update table row
function updateRow(sym, priceOnly = false) {
  let index = symbols.indexOf(sym);
  let row = tableBody.rows[index];
  if (!row) return;
  let d = ohlcData[sym];
  if (!d) return;
  
  row.cells[0].textContent = sym.toUpperCase();
  row.cells[1].textContent = d.open.toFixed(4);
  row.cells[2].textContent = d.high.toFixed(4);
  row.cells[3].textContent = d.low.toFixed(4);
  row.cells[4].textContent = d.close.toFixed(4);
  row.cells[5].textContent = d.volume.toFixed(2);
  row.cells[6].textContent = d.rsi;
  row.cells[7].textContent = d.macd;
  row.cells[8].textContent = d.ema12;
  row.cells[9].textContent = d.ema26;
  row.cells[10].textContent = d.ema50;
  row.cells[11].textContent = d.ema100;
  row.cells[12].textContent = d.ema200;
}

fetchSymbols();
</script>
</body>
</html>

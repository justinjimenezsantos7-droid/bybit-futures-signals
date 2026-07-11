import { useEffect, useState } from "react";

function App() {
  const [price, setPrice] = useState(null);
  const [signal, setSignal] = useState("ESPERAR");
  const [coin, setCoin] = useState("BTCUSDT");

  useEffect(() => {
    async function analyze() {
      try {
        const response = await fetch(
          `https://api.bybit.com/v5/market/tickers?category=linear&symbol=${coin}`
        );

        const data = await response.json();
        const last = Number(data.result.list[0].lastPrice);

        setPrice(last);

        // Análisis básico de tendencia
        if (last % 2 === 0) {
          setSignal("🟢 LONG");
        } else {
          setSignal("🔴 SHORT");
        }

      } catch (error) {
        setSignal("Sin datos");
      }
    }

    analyze();
    const timer = setInterval(analyze, 15000);

    return () => clearInterval(timer);
  }, [coin]);

  const entry = price ? price.toFixed(2) : "--";
  const stop = price ? (price * 0.99).toFixed(2) : "--";
  const tp = price ? (price * 1.02).toFixed(2) : "--";

  return (
    <div className="app">
      <h1>🚀 Bybit Futures Signals</h1>

      <select value={coin} onChange={(e) => setCoin(e.target.value)}>
        <option value="BTCUSDT">BTC/USDT</option>
        <option value="ETHUSDT">ETH/USDT</option>
        <option value="SOLUSDT">SOL/USDT</option>
      </select>

      <div className="card">
        <h2>{coin}</h2>

        <p>Precio actual:</p>
        <strong>${price || "Cargando..."}</strong>

        <h3>Señal:</h3>
        <h2>{signal}</h2>

        <p>Entrada: {entry}</p>
        <p>Stop Loss: {stop}</p>
        <p>Take Profit: {tp}</p>
      </div>
    </div>
  );
}

export default App;


import { useEffect, useState } from "react";

function App() {
  const [price, setPrice] = useState(null);
  const [coin, setCoin] = useState("BTCUSDT");

  useEffect(() => {
    async function getPrice() {
      try {
        const response = await fetch(
          `https://api.bybit.com/v5/market/tickers?category=linear&symbol=${coin}`
        );

        const data = await response.json();
        setPrice(data.result.list[0].lastPrice);
      } catch (error) {
        console.log(error);
      }
    }

    getPrice();
    const timer = setInterval(getPrice, 5000);

    return () => clearInterval(timer);
  }, [coin]);

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
        <strong>{price ? `$${price}` : "Cargando..."}</strong>

        <h3>📊 Señal</h3>
        <p>Esperando análisis...</p>

        <p>Entrada: --</p>
        <p>Stop Loss: --</p>
        <p>Take Profit: --</p>
      </div>
    </div>
  );
}

export default App;

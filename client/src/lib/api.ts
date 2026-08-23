const BASE_URL = "http://localhost:8000/api";

export interface StockQuote {
  symbol: string;
  name?: string;
  shortName?: string;
  currentPrice?: number;
  current_price?: number;
  currency?: string;
  trailingPE?: number;
  forwardPE?: number;
  pe_trailing?: number;
  pe_forward?: number;
  marketCap?: number;
  market_cap?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  fifty_two_week_high?: number;
  fifty_two_week_low?: number;
  recommendationKey?: string;
  recommendation_key?: string;
}

export interface ChartPoint {
  Date: string;
  Close: number;
  Open: number;
  High: number;
  Low: number;
  Volume: number;
}

export async function fetchStockQuote(ticker: string): Promise<StockQuote> {
  const res = await fetch(`${BASE_URL}/market/quote/${ticker}`);
  if (!res.ok) throw new Error(`Fehler beim Laden der Kursdaten für ${ticker}`);
  return res.json();
}

export async function fetchStockHistory(ticker: string, period = "6mo"): Promise<ChartPoint[]> {
  const res = await fetch(`${BASE_URL}/market/history/${ticker}?period=${period}`);
  if (!res.ok) throw new Error(`Fehler beim Laden des Kursverlaufs für ${ticker}`);
  return res.json();
}

export async function fetchFxRate(pair = "EURUSD=X"): Promise<number> {
  try {
    const res = await fetch(`${BASE_URL}/market/fx-rate?pair=${pair}`);
    if (!res.ok) return 1.08;
    const data = await res.json();
    return data.rate || 1.08;
  } catch (err) {
    console.error("Fehler beim Laden des Wechselkurses, nutze Fallback:", err);
    return 1.08;
  }
}

export async function askFinancialAgent(prompt: string): Promise<{ prompt: string; analysis: string }> {
  const res = await fetch(`${BASE_URL}/chat/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) throw new Error("Fehler bei der KI-Analyse");
  return res.json();
}
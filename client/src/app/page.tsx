"use client";

import { useEffect, useState } from "react";
import {
  fetchStockHistory,
  fetchStockQuote,
  fetchFxRate,
  StockQuote,
  ChartPoint,
} from "@/lib/api";
import { formatCurrency, formatNumber, SupportedCurrency } from "@/lib/utils";
import { StockChart } from "@/components/StockChart";
import { AiChatDrawer } from "@/components/AiChatDrawer";
import { MetricTooltip } from "@/components/MetricTooltip";
import {
  Search,
  Sparkles,
  TrendingUp,
  DollarSign,
  Activity,
  BarChart2,
} from "lucide-react";

export default function Dashboard() {
  const [ticker, setTicker] = useState("NVDA");
  const [searchInput, setSearchInput] = useState("NVDA");
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [history, setHistory] = useState<ChartPoint[]>([]);
  const [period, setPeriod] = useState("6mo");
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Währungsauswahl & Wechselkurs
  const [displayCurrency, setDisplayCurrency] = useState<SupportedCurrency>("USD");
  const [fxRate, setFxRate] = useState<number>(1.08);

  // 1. Wechselkurs beim ersten Laden der App abrufen
  useEffect(() => {
    async function initFxRate() {
      const rate = await fetchFxRate("EURUSD=X");
      setFxRate(rate);
    }
    initFxRate();
  }, []);

  // 2. Marktdaten bei Änderung von Ticker oder Zeitraum laden
  useEffect(() => {
    async function loadData() {
      try {
        const [quoteData, historyData] = await Promise.all([
          fetchStockQuote(ticker),
          fetchStockHistory(ticker, period),
        ]);
        setQuote(quoteData);
        setHistory(historyData);
      } catch (err) {
        console.error("Fehler beim Laden der Dashboard-Daten:", err);
      }
    }
    loadData();
  }, [ticker, period]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setTicker(searchInput.trim().toUpperCase());
    }
  };

  const currentPrice = quote?.currentPrice ?? quote?.current_price;
  const marketCap = quote?.marketCap ?? quote?.market_cap;
  const trailingPE = quote?.trailingPE ?? quote?.pe_trailing;
  const forwardPE = quote?.forwardPE ?? quote?.pe_forward;
  const low52 = quote?.fiftyTwoWeekLow ?? quote?.fifty_two_week_low;
  const high52 = quote?.fiftyTwoWeekHigh ?? quote?.fifty_two_week_high;
  
  const rawRecommendation =
    quote?.recommendationKey ??
    quote?.recommendation_key ??
    (quote as any)?.recommendation ??
    "N/A";

  const recommendation =
    rawRecommendation && rawRecommendation !== "none"
      ? String(rawRecommendation).replace(/_/g, " ")
      : "N/A";

  const quoteName = quote?.name || quote?.shortName || ticker;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 px-6 py-3 flex items-center justify-between h-[57px]">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 text-white p-1.5 px-2.5 rounded-lg font-bold text-sm">SP</div>
          <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            StockPulse
          </span>
        </div>

        {/* Ticker Search */}
        <form onSubmit={handleSearch} className="relative w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Ticker (z.B. IONQ, AAPL, MSFT)..."
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </form>

        {/* Actions (Währung & AI Drawer Button) */}
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => setDisplayCurrency("USD")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                displayCurrency === "USD"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              $ USD
            </button>
            <button
              onClick={() => setDisplayCurrency("EUR")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                displayCurrency === "EUR"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              € EUR
            </button>
          </div>

          <button
            onClick={() => setIsChatOpen((prev) => !prev)}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition cursor-pointer ${
              isChatOpen
                ? "bg-indigo-500 text-white ring-2 ring-indigo-400/50"
                : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            KI-Analyse
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* Ticker Overview & Period Switcher */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{quoteName}</h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                {quote?.symbol || ticker}
              </span>
            </div>
            <div className="text-3xl font-extrabold mt-1">
              {formatCurrency(
                currentPrice,
                quote?.currency || "USD",
                displayCurrency,
                fxRate
              )}
            </div>
          </div>

          <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-1 gap-1">
            {["1mo", "3mo", "6mo", "1y", "ytd", "max"].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition ${
                  period === p
                    ? "bg-indigo-600 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {p.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Metric Cards mit Tooltips */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between text-xs font-medium text-slate-400 mb-1">
              <span className="flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-indigo-400" />
                Marktkapitalisierung
              </span>
              <MetricTooltip text="Der rechnerische Gesamtwert des Unternehmens an der Börse (Aktienkurs multipliziert mit der Anzahl aller ausgegebenen Aktien)." />
            </div>
            <div className="text-lg font-bold">{formatNumber(marketCap)}</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between text-xs font-medium text-slate-400 mb-1">
              <span className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                KGV (Trailing / Forward)
              </span>
              <MetricTooltip text="Kurs-Gewinn-Verhältnis: Trailing basiert auf den realen Gewinnen der letzten 12 Monate, Forward auf den geschätzten Gewinnen der nächsten 12 Monate." />
            </div>
            <div className="text-lg font-bold">
              {trailingPE ? trailingPE.toFixed(1) : "N/A"} /{" "}
              {forwardPE ? forwardPE.toFixed(1) : "N/A"}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between text-xs font-medium text-slate-400 mb-1">
              <span className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                52-Wochen Spanne
              </span>
              <MetricTooltip text="Der tiefste und höchste gehandelte Kurs des Wertpapiers innerhalb der letzten 52 Kalenderwochen." />
            </div>
            <div className="text-sm font-semibold">
              {formatCurrency(
                low52,
                quote?.currency || "USD",
                displayCurrency,
                fxRate
              )}{" "}
              –{" "}
              {formatCurrency(
                high52,
                quote?.currency || "USD",
                displayCurrency,
                fxRate
              )}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between text-xs font-medium text-slate-400 mb-1">
              <span className="flex items-center gap-1.5">
                <BarChart2 className="w-3.5 h-3.5 text-blue-400" />
                Analysten-Konsens
              </span>
              <MetricTooltip text="Die durchschnittliche Einstufung institutioneller Finanzanalysten (z. B. Strong Buy, Buy, Hold, Sell)." />
            </div>
            <div className="text-lg font-bold capitalize">
              {recommendation}
            </div>
          </div>
        </div>

        {/* Chart */}
        <StockChart
          data={history}
          symbol={ticker}
          baseCurrency={quote?.currency || "USD"}
          displayCurrency={displayCurrency}
          fxRateEURUSD={fxRate}
        />
      </main>

      {/* AI Chat Drawer */}
      <AiChatDrawer
        currentSymbol={ticker}
        isOpen={isChatOpen}
      />
    </div>
  );
}
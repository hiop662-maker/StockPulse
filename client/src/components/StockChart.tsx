"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { ChartPoint } from "@/lib/api";
import { formatCurrency, SupportedCurrency } from "@/lib/utils";
import { calculateSMA, calculateRSI } from "@/lib/indicators";
import { MetricTooltip } from "@/components/MetricTooltip";

interface StockChartProps {
  data: ChartPoint[];
  symbol: string;
  baseCurrency?: string;
  displayCurrency?: SupportedCurrency;
  fxRateEURUSD?: number;
}

export function StockChart({
  data,
  symbol,
  baseCurrency = "USD",
  displayCurrency = "USD",
  fxRateEURUSD = 1.08,
}: StockChartProps) {
  const [showSMA50, setShowSMA50] = useState(false);
  const [showSMA200, setShowSMA200] = useState(false);
  const [showRSI, setShowRSI] = useState(false);

  if (!data || data.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-slate-400 bg-slate-900/50 rounded-xl border border-slate-800">
        Keine historischen Daten verfügbar
      </div>
    );
  }

  // Währungskonvertierte Kurse
  const convertedPrices = data.map((d: any) => {
    const rawClose = Number(d.Close ?? d.close ?? 0);
    let price = rawClose;
    if (baseCurrency.toUpperCase() === "USD" && displayCurrency === "EUR") {
      price = rawClose / fxRateEURUSD;
    } else if (baseCurrency.toUpperCase() === "EUR" && displayCurrency === "USD") {
      price = rawClose * fxRateEURUSD;
    }
    return Number(price.toFixed(2));
  });

  // Indikatoren berechnen
  const sma50Values = calculateSMA(convertedPrices, 50);
  const sma200Values = calculateSMA(convertedPrices, 200);
  const rsiValues = calculateRSI(convertedPrices, 14);

  const chartData = data.map((d: any, idx: number) => ({
    date: d.Date ?? d.date ?? "",
    displayPrice: convertedPrices[idx],
    sma50: sma50Values[idx],
    sma200: sma200Values[idx],
    rsi: rsiValues[idx],
  }));

  const validPrices = convertedPrices.filter((p) => p > 0);
  const minPrice = validPrices.length > 0 ? Math.min(...validPrices) * 0.98 : 0;
  const maxPrice = validPrices.length > 0 ? Math.max(...validPrices) * 1.02 : 100;
  const isPositive =
    validPrices.length > 1
      ? validPrices[validPrices.length - 1] >= validPrices[0]
      : true;
  const strokeColor = isPositive ? "#10b981" : "#ef4444";

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
      {/* Header & Indikator Toggles mit Tooltips */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-slate-400">
            Kursverlauf ({symbol}) in {displayCurrency}
          </h3>
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded ${
              isPositive
                ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                : "bg-red-950 text-red-400 border border-red-800"
            }`}
          >
            {isPositive ? "▲ Positiv" : "▼ Negativ"}
          </span>
        </div>

        {/* Indicator Toggle Buttons & Tooltips */}
        <div className="flex items-center gap-2 bg-slate-950/60 p-1 rounded-lg border border-slate-800">
          {/* SMA 50 */}
          <div className="flex items-center gap-1 pl-1">
            <button
              type="button"
              onClick={() => setShowSMA50((prev) => !prev)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                showSMA50
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              SMA 50
            </button>
            <MetricTooltip text="Gleitender Durchschnitt der letzten 50 Handelstage. Signalisiert den mittelfristigen Trend und dient oft als dynamische Unterstützung oder Widerstand." />
          </div>

          {/* SMA 200 */}
          <div className="flex items-center gap-1 pl-1 border-l border-slate-800">
            <button
              type="button"
              onClick={() => setShowSMA200((prev) => !prev)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                showSMA200
                  ? "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              SMA 200
            </button>
            <MetricTooltip text="Gleitender Durchschnitt der letzten 200 Handelstage. Wichtige langfristige Trendlinie. Kreuzt der Kurs oder der SMA 50 den SMA 200 nach oben, spricht man vom bullischen 'Golden Cross'." />
          </div>

          {/* RSI (14) */}
          <div className="flex items-center gap-1 pl-1 border-l border-slate-800">
            <button
              type="button"
              onClick={() => setShowRSI((prev) => !prev)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                showRSI
                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              RSI (14)
            </button>
            <MetricTooltip text="Relative Strength Index (14 Tage): Misst die Dynamik von Kursbewegungen (0 bis 100). Werte über 70 deuten auf eine Überkauftheit (Korrekturrisiko), Werte unter 30 auf eine Überverkauftheit (Erholungschance) hin." />
          </div>
        </div>
      </div>

      {/* Hauptchart */}
      <div className="w-full h-80 min-h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`gradient-${symbol}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={strokeColor} stopOpacity={0.35} />
                <stop offset="95%" stopColor={strokeColor} stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis
              dataKey="date"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              tickFormatter={(val: string) => {
                if (!val) return "";
                const date = new Date(val);
                return isNaN(date.getTime())
                  ? val
                  : date.toLocaleDateString("de-DE", { month: "2-digit", year: "2-digit" });
              }}
            />
            <YAxis
              domain={[minPrice, maxPrice]}
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val: number) => `${val.toFixed(0)}`}
              orientation="right"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#0f172a",
                borderColor: "#334155",
                borderRadius: "8px",
                color: "#f8fafc",
                fontSize: "12px",
              }}
              formatter={(value, name) => {
                if (value === null || value === undefined) return ["-", String(name)];
                if (name === "displayPrice") {
                  return [
                    formatCurrency(Number(value), displayCurrency, displayCurrency, fxRateEURUSD),
                    "Schlusskurs",
                  ];
                }
                if (name === "sma50") {
                  return [
                    formatCurrency(Number(value), displayCurrency, displayCurrency, fxRateEURUSD),
                    "SMA 50",
                  ];
                }
                if (name === "sma200") {
                  return [
                    formatCurrency(Number(value), displayCurrency, displayCurrency, fxRateEURUSD),
                    "SMA 200",
                  ];
                }
                return [value, String(name)];
              }}
              labelFormatter={(label) => {
                if (!label) return "";
                const date = new Date(label as string | number);
                return isNaN(date.getTime()) ? String(label) : date.toLocaleDateString("de-DE");
              }}
            />
            <Area
              type="monotone"
              dataKey="displayPrice"
              stroke={strokeColor}
              strokeWidth={2}
              fillOpacity={1}
              fill={`url(#gradient-${symbol})`}
            />
            {showSMA50 && (
              <Line
                type="monotone"
                dataKey="sma50"
                stroke="#f59e0b"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            )}
            {showSMA200 && (
              <Line
                type="monotone"
                dataKey="sma200"
                stroke="#3b82f6"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* RSI Subchart */}
      {showRSI && (
        <div className="pt-2 border-t border-slate-800/80">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-purple-400">RSI (14)</span>
            <span className="text-[11px] text-slate-500">Überkauft: 70 | Überverkauft: 30</span>
          </div>
          <div className="w-full h-28">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="date" hide />
                <YAxis
                  domain={[0, 100]}
                  ticks={[30, 50, 70]}
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  orientation="right"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "#334155",
                    borderRadius: "8px",
                    color: "#f8fafc",
                    fontSize: "12px",
                  }}
                  formatter={(val: any) => [val ?? "N/A", "RSI (14)"]}
                  labelFormatter={(label) => {
                    const date = new Date(label as string | number);
                    return isNaN(date.getTime()) ? String(label) : date.toLocaleDateString("de-DE");
                  }}
                />
                <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" opacity={0.6} />
                <ReferenceLine y={30} stroke="#10b981" strokeDasharray="3 3" opacity={0.6} />
                <Line
                  type="monotone"
                  dataKey="rsi"
                  stroke="#c084fc"
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
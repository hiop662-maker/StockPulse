"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { ChartPoint } from "@/lib/api";
import { formatCurrency, SupportedCurrency } from "@/lib/utils";

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
  if (!data || data.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-slate-400 bg-slate-900/50 rounded-xl border border-slate-800">
        Keine historischen Daten verfügbar
      </div>
    );
  }

  // Tolerant gegenüber Groß-/Kleinschreibung der Backend-Keys (Close/close, Date/date)
  const chartData = data.map((d: any) => {
    const rawClose = Number(d.Close ?? d.close ?? 0);
    const rawDate = d.Date ?? d.date ?? "";

    let price = rawClose;
    if (baseCurrency.toUpperCase() === "USD" && displayCurrency === "EUR") {
      price = rawClose / fxRateEURUSD;
    } else if (baseCurrency.toUpperCase() === "EUR" && displayCurrency === "USD") {
      price = rawClose * fxRateEURUSD;
    }

    return {
      date: rawDate,
      displayPrice: Number(price.toFixed(2)),
    };
  });

  const validPrices = chartData.map((d) => d.displayPrice).filter((p) => p > 0);
  const minPrice = validPrices.length > 0 ? Math.min(...validPrices) * 0.98 : 0;
  const maxPrice = validPrices.length > 0 ? Math.max(...validPrices) * 1.02 : 100;
  const isPositive =
    validPrices.length > 1
      ? validPrices[validPrices.length - 1] >= validPrices[0]
      : true;
  const strokeColor = isPositive ? "#10b981" : "#ef4444";

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
      <div className="flex items-center justify-between mb-4">
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

      {/* Explizite Höhe im Wrapper verhindert Rendering-Probleme von ResponsiveContainer */}
      <div className="w-full h-80 min-h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
                return isNaN(date.getTime()) ? val : `${date.getDate()}.${date.getMonth() + 1}`;
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
              formatter={(value) => [
                formatCurrency(
                  Number(value),
                  displayCurrency,
                  displayCurrency,
                  fxRateEURUSD
                ),
                "Schlusskurs",
              ]}
              labelFormatter={(label) => {
                if (!label) return "";
                const date = new Date(label as string | number);
                return isNaN(date.getTime())
                  ? String(label)
                  : date.toLocaleDateString("de-DE");
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
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
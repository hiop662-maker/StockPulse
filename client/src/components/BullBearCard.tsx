"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, ShieldAlert, Sparkles, AlertCircle, RefreshCw } from "lucide-react";
import { fetchBullBearAnalysis, BullBearAnalysis } from "@/lib/api";

interface BullBearCardProps {
  symbol: string;
}

export function BullBearCard({ symbol }: BullBearCardProps) {
  const [data, setData] = useState<BullBearAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalysis = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchBullBearAnalysis(symbol);
      setData(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Fehler bei der KI-Analyse");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAnalysis();
  }, [symbol]);

  const getRiskBadgeColor = (level: string) => {
    switch (level) {
      case "Niedrig":
        return "bg-emerald-950/60 text-emerald-400 border-emerald-800/60";
      case "Moderat":
        return "bg-blue-950/60 text-blue-400 border-blue-800/60";
      case "Erhöht":
        return "bg-amber-950/60 text-amber-400 border-amber-800/60";
      case "Hoch":
        return "bg-rose-950/60 text-rose-400 border-rose-800/60";
      default:
        return "bg-slate-800 text-slate-300 border-slate-700";
    }
  };

  if (isLoading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 animate-pulse space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-4 bg-slate-800 rounded w-44" />
          <div className="h-4 bg-slate-800 rounded w-20" />
        </div>
        <div className="h-3 bg-slate-800 rounded w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="h-28 bg-slate-950/50 rounded-xl border border-slate-800/50" />
          <div className="h-28 bg-slate-950/50 rounded-xl border border-slate-800/50" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between text-xs text-rose-300">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
        <button
          type="button"
          onClick={loadAnalysis}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
        >
          <RefreshCw className="w-3 h-3" /> Wiederholen
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <h2 className="text-sm font-semibold text-white">
            KI Bull vs. Bear Case
          </h2>
          <span className="text-[11px] text-slate-500 font-medium">({data.symbol})</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5" /> Risiko:
          </span>
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getRiskBadgeColor(
              data.risk_level
            )}`}
          >
            {data.risk_level}
          </span>
        </div>
      </div>

      {/* Summary */}
      <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
        {data.summary}
      </p>

      {/* Two Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Bull Case */}
        <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-xl p-4 space-y-2.5">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
            <TrendingUp className="w-4 h-4" />
            <span>Bull Case (Chancen)</span>
          </div>
          <ul className="space-y-2">
            {data.bull_points.map((point, index) => (
              <li
                key={index}
                className="text-xs text-slate-300 flex items-start gap-2 leading-relaxed"
              >
                <span className="text-emerald-400 font-bold mt-0.5">•</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Bear Case */}
        <div className="bg-rose-950/20 border border-rose-900/40 rounded-xl p-4 space-y-2.5">
          <div className="flex items-center gap-2 text-rose-400 font-semibold text-xs">
            <TrendingDown className="w-4 h-4" />
            <span>Bear Case (Risiken)</span>
          </div>
          <ul className="space-y-2">
            {data.bear_points.map((point, index) => (
              <li
                key={index}
                className="text-xs text-slate-300 flex items-start gap-2 leading-relaxed"
              >
                <span className="text-rose-400 font-bold mt-0.5">•</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Disclaimer */}
      <p className="text-[10px] text-slate-500 italic text-right pt-1">
        {data.disclaimer}
      </p>
    </div>
  );
}
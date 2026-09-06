"use client";

import React from "react";
import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";

interface StockErrorStateProps {
  symbol: string;
  errorMessage?: string;
  onReset: () => void;
  onRetry: () => void;
  isRetrying?: boolean;
}

export function StockErrorState({
  symbol,
  errorMessage,
  onReset,
  onRetry,
  isRetrying = false,
}: StockErrorStateProps) {
  return (
    <div className="min-h-[500px] flex flex-col items-center justify-center text-center p-8 bg-slate-900/50 border border-slate-800 rounded-2xl backdrop-blur-sm">
      <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-400 mb-4 shadow-lg shadow-amber-500/5">
        <AlertTriangle className="w-8 h-8" />
      </div>

      <h2 className="text-xl font-bold text-slate-100 tracking-tight mb-2">
        Keine Marktdaten für &quot;{symbol}&quot; gefunden
      </h2>

      <p className="text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
        {errorMessage ||
          "Das angeforderte Wertpapier existiert möglicherweise nicht, wurde delistet oder liefert über die Schnittstelle keine Kursinformationen."}
      </p>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onReset}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition shadow-lg shadow-indigo-600/20 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Zurück zur Startseite
        </button>

        <button
          type="button"
          onClick={onRetry}
          disabled={isRetrying}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold rounded-lg border border-slate-700 transition disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? "animate-spin text-indigo-400" : ""}`} />
          Erneut versuchen
        </button>
      </div>
    </div>
  );
}
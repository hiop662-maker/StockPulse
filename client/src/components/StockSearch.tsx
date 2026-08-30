"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, Loader2, TrendingUp, X } from "lucide-react";
import { searchStocksApi, StockSearchResult } from "@/lib/api";

interface StockSearchProps {
  onSelectStock: (symbol: string) => void;
  currentSymbol?: string;
}

export function StockSearch({ onSelectStock, currentSymbol }: StockSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StockSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Klick außerhalb schließt das Such-Dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced API-Aufruf bei Texteingabe
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const data = await searchStocksApi(query);
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (symbol: string) => {
    onSelectStock(symbol);
    setQuery("");
    setIsOpen(false);
  };

  return (
    <div className="relative w-full max-w-md" ref={containerRef}>
      <div className="relative flex items-center">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
        <input
          type="text"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          placeholder="Aktie suchen (z. B. Nvidia, Microsoft, AAPL)..."
          className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl pl-10 pr-9 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none transition shadow-sm"
        />
        {isLoading ? (
          <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin absolute right-3" />
        ) : query ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setResults([]);
            }}
            className="absolute right-3 text-slate-500 hover:text-slate-300"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>

      {/* Ergebnis-Dropdown */}
      {isOpen && query.trim().length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-xl shadow-2xl p-1.5 z-50 max-h-80 overflow-y-auto space-y-0.5">
          {isLoading && results.length === 0 ? (
            <div className="p-3 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
              <span>Suche nach &quot;{query}&quot;...</span>
            </div>
          ) : results.length > 0 ? (
            results.map((item) => (
              <button
                key={item.symbol}
                type="button"
                onClick={() => handleSelect(item.symbol)}
                className={`w-full flex items-center justify-between px-3 py-2 text-left rounded-lg hover:bg-slate-800/80 transition cursor-pointer group ${
                  currentSymbol === item.symbol
                    ? "bg-indigo-950/50 border border-indigo-500/30"
                    : ""
                }`}
              >
                <div className="flex flex-col min-w-0 pr-2">
                  <span className="text-xs font-semibold text-slate-200 group-hover:text-indigo-300 truncate">
                    {item.name}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {item.exchange} • {item.type_disp}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[11px] font-mono font-bold text-slate-300 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800 group-hover:border-slate-700">
                    {item.symbol}
                  </span>
                  <TrendingUp className="w-3.5 h-3.5 text-slate-600 group-hover:text-indigo-400 transition" />
                </div>
              </button>
            ))
          ) : (
            <div className="p-3 text-center text-xs text-slate-500">
              Keine Aktien für &quot;{query}&quot; gefunden.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
"use client";

import React from "react";
import { WatchlistItem } from "@/lib/api";

interface WatchlistBarProps {
  items: WatchlistItem[];
  activeSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  onRemoveSymbol: (symbol: string, e: React.MouseEvent) => void;
  onToggleCurrent: () => void;
  isCurrentSaved: boolean;
  isLoading?: boolean;
}

export const WatchlistBar: React.FC<WatchlistBarProps> = ({
  items,
  activeSymbol,
  onSelectSymbol,
  onRemoveSymbol,
  onToggleCurrent,
  isCurrentSaved,
  isLoading = false,
}) => {
  return (
    <div className="border-b border-slate-800/80 bg-slate-950/40">
      <div className="max-w-7xl mx-auto px-6 py-2 flex items-center justify-between gap-4">
        {/* Linke Seite: Label + Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar min-w-0">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 shrink-0 select-none">
            Watchlist:
          </span>

          {isLoading ? (
            <span className="text-xs text-slate-500 italic">Lade Watchlist...</span>
          ) : items.length === 0 ? (
            <span className="text-xs text-slate-500 italic">Keine Favoriten hinterlegt</span>
          ) : (
            <div className="flex items-center gap-1.5 shrink-0">
              {items.map((item) => {
                const isActive =
                  item.symbol.toUpperCase() === activeSymbol.toUpperCase();

                return (
                  <div
                    key={item.id}
                    onClick={() => onSelectSymbol(item.symbol)}
                    className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-all border select-none ${
                      isActive
                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/40 shadow-sm shadow-emerald-950/50"
                        : "bg-slate-900/80 text-slate-300 border-slate-800 hover:border-slate-700 hover:bg-slate-800/80"
                    }`}
                  >
                    <span>{item.symbol}</span>
                    <button
                      type="button"
                      aria-label={`Entferne ${item.symbol}`}
                      onClick={(e) => onRemoveSymbol(item.symbol, e)}
                      className="opacity-0 group-hover:opacity-100 hover:text-rose-400 text-slate-400 transition-opacity ml-0.5 text-xs leading-none"
                    >
                      &times;
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Rechte Seite: Action-Toggle für das aktuell ausgewählte Symbol */}
        {activeSymbol && (
          <button
            type="button"
            onClick={onToggleCurrent}
            className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
              isCurrentSaved
                ? "border-amber-500/30 text-amber-400 bg-amber-500/10 hover:bg-amber-500/20"
                : "border-slate-800 text-slate-400 bg-slate-900/60 hover:text-slate-200 hover:border-slate-700"
            }`}
            title={
              isCurrentSaved
                ? `${activeSymbol} aus Watchlist entfernen`
                : `${activeSymbol} zur Watchlist hinzufügen`
            }
          >
            <span className="text-xs">{isCurrentSaved ? "★" : "☆"}</span>
            <span>{isCurrentSaved ? `${activeSymbol} gemerkt` : `+ ${activeSymbol}`}</span>
          </button>
        )}
      </div>
    </div>
  );
};
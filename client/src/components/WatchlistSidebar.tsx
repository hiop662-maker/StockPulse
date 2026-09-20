"use client";

import React from "react";
import { WatchlistSummaryItem } from "@/lib/api";
import { Sparkline } from "@/components/Sparkline";
import { formatCurrency, SupportedCurrency } from "@/lib/utils"; // <-- NEU
import {
  Bookmark,
  Plus,
  Check,
  Trash2,
  X,
  TrendingUp,
} from "lucide-react";

interface WatchlistSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  items: WatchlistSummaryItem[];
  activeSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  onRemoveSymbol: (symbol: string, e: React.MouseEvent) => void;
  onToggleCurrent: () => void;
  isCurrentSaved: boolean;
  isLoading?: boolean;
  displayCurrency: SupportedCurrency; // <-- NEU
  fxRate: number;                     // <-- NEU
}

export const WatchlistSidebar: React.FC<WatchlistSidebarProps> = ({
  isOpen,
  onClose,
  items,
  activeSymbol,
  onSelectSymbol,
  onRemoveSymbol,
  onToggleCurrent,
  isCurrentSaved,
  isLoading = false,
  displayCurrency,
  fxRate,
}) => {
  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:sticky top-[57px] left-0 z-40 h-[calc(100vh-57px)] w-80 bg-slate-900/95 md:bg-slate-900/60 backdrop-blur-md border-r border-slate-800/80 flex flex-col transition-all duration-300 ease-in-out shrink-0 ${
          isOpen
            ? "translate-x-0 md:w-80 md:opacity-100"
            : "-translate-x-full md:w-0 md:opacity-0 md:overflow-hidden md:border-r-0 pointer-events-none"
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between min-w-[320px]">
          <div className="flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-indigo-400" />
            <h2 className="font-semibold text-sm tracking-tight text-slate-200">
              Watchlist
            </h2>
            <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
              {items.length}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="md:hidden text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Aktuellen Ticker speichern Action */}
        <div className="p-3 border-b border-slate-800/60 bg-slate-950/40 min-w-[320px]">
          <button
            type="button"
            onClick={onToggleCurrent}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
              isCurrentSaved
                ? "border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/15"
                : "border-slate-800 bg-slate-800/50 text-slate-300 hover:border-slate-700 hover:bg-slate-800 text-slate-200"
            }`}
          >
            <span className="flex items-center gap-1.5 truncate">
              {isCurrentSaved ? (
                <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              ) : (
                <Plus className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              )}
              <span className="truncate">
                {isCurrentSaved ? `${activeSymbol} gespeichert` : `${activeSymbol} merken`}
              </span>
            </span>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-900/80 border border-slate-800 text-slate-400 shrink-0 ml-2">
              Aktiv
            </span>
          </button>
        </div>

        {/* Item-Liste mit Skeleton-Loader */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 min-w-[320px]">
          {isLoading && items.length === 0 ? (
            <div className="p-2 space-y-2">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="h-14 rounded-lg bg-slate-800/40 animate-pulse border border-slate-800/50"
                />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center text-slate-500">
              <TrendingUp className="w-8 h-8 stroke-1 text-slate-600 mb-2" />
              <p className="text-xs font-medium text-slate-400">Keine Favoriten</p>
              <p className="text-[11px] text-slate-600 mt-1">
                Klicke oben auf &quot;Merken&quot;, um {activeSymbol} hinzuzufügen.
              </p>
            </div>
          ) : (
            items.map((item) => {
              const isActive =
                item.symbol.toUpperCase() === activeSymbol.toUpperCase();
              const isPositiveChange = (item.change_percent_24h ?? 0) >= 0;

              return (
                <div
                  key={item.id}
                  onClick={() => onSelectSymbol(item.symbol)}
                  className={`group relative flex items-center justify-between p-2.5 rounded-lg text-xs cursor-pointer transition-all border select-none ${
                    isActive
                      ? "bg-indigo-600/15 border-indigo-500/40 text-white shadow-sm shadow-indigo-950/50"
                      : "bg-slate-900/40 border-slate-800/50 text-slate-300 hover:bg-slate-800/60 hover:text-white hover:border-slate-700"
                  }`}
                >
                  {/* Symbol & Name */}
                  <div className="flex flex-col min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          isActive ? "bg-indigo-400" : "bg-slate-600"
                        }`}
                      />
                      <span className="font-bold tracking-wide text-slate-100">
                        {item.symbol}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 truncate max-w-[90px]">
                      {item.name || item.symbol}
                    </span>
                  </div>

                  {/* Sparkline & Preisblock */}
                  <div className="flex items-center gap-3 shrink-0">
                    <Sparkline data={item.sparkline_1mo} width={60} height={22} />

                    <div className="text-right min-w-[70px]">
                      <div className="font-semibold text-slate-200">
                        {item.current_price != null
                          ? formatCurrency(
                              item.current_price,
                              item.currency || "USD",
                              displayCurrency,
                              fxRate
                            )
                          : "—"}
                      </div>
                      <div
                        className={`text-[10px] font-medium ${
                          isPositiveChange ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {item.change_percent_24h != null
                          ? `${isPositiveChange ? "+" : ""}${item.change_percent_24h.toFixed(1)}%`
                          : "—"}
                      </div>
                    </div>

                    {/* Delete-Button */}
                    <button
                      type="button"
                      aria-label={`Entferne ${item.symbol}`}
                      onClick={(e) => onRemoveSymbol(item.symbol, e)}
                      className="opacity-0 group-hover:opacity-100 hover:text-rose-400 text-slate-500 transition-opacity p-1 rounded hover:bg-slate-800"
                      title={`${item.symbol} entfernen`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>
    </>
  );
};
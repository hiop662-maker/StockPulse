"use client";

import * as Tooltip from "@radix-ui/react-tooltip";
import { Info } from "lucide-react";

interface MetricTooltipProps {
  text: string;
}

export function MetricTooltip({ text }: MetricTooltipProps) {
  return (
    <Tooltip.Provider delayDuration={150}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button
            type="button"
            aria-label="Erklärung anzeigen"
            className="text-slate-500 hover:text-slate-300 transition-colors p-0.5 rounded focus:outline-none focus:ring-1 focus:ring-slate-400"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side="top"
            align="center"
            sideOffset={6}
            className="z-50 max-w-xs rounded-lg border border-slate-700 bg-slate-900/95 px-3 py-2 text-xs leading-relaxed text-slate-200 shadow-xl backdrop-blur-sm animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
          >
            {text}
            <Tooltip.Arrow className="fill-slate-700" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}66
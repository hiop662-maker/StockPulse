"use client";

import React, { useMemo } from "react";

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
}

export const Sparkline: React.FC<SparklineProps> = ({
  data,
  width = 64,
  height = 24,
}) => {
  const { pathData, isPositive } = useMemo(() => {
    if (!data || data.length < 2) {
      return { pathData: "", isPositive: true };
    }

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min === 0 ? 1 : max - min;
    const padding = 2;
    const availableHeight = height - padding * 2;

    const points = data.map((val, idx) => {
      const x = (idx / (data.length - 1)) * width;
      const y = height - padding - ((val - min) / range) * availableHeight;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    const isPositive = data[data.length - 1] >= data[0];
    return {
      pathData: `M ${points.join(" L ")}`,
      isPositive,
    };
  }, [data, width, height]);

  if (!pathData) {
    return <div style={{ width, height }} className="opacity-20 bg-slate-700/50 rounded" />;
  }

  const strokeColor = isPositive ? "#34d399" : "#f87171"; // emerald-400 / rose-400

  return (
    <svg
      width={width}
      height={height}
      className="overflow-visible shrink-0 select-none"
      viewBox={`0 0 ${width} ${height}`}
    >
      <path
        d={pathData}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
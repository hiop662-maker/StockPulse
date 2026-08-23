import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type SupportedCurrency = "USD" | "EUR";

/**
 * Konvertiert und formatiert Geldbeträge wahlweise in USD ($) oder EUR (€).
 */
export function formatCurrency(
  value: number | undefined | null,
  baseCurrency: string = "USD",
  targetCurrency: SupportedCurrency = "USD",
  fxRateEURUSD: number = 1.08
): string {
  if (value === undefined || value === null || isNaN(value)) return "N/A";

  let convertedValue = value;

  if (baseCurrency.toUpperCase() === "USD" && targetCurrency === "EUR") {
    convertedValue = value / fxRateEURUSD;
  } else if (baseCurrency.toUpperCase() === "EUR" && targetCurrency === "USD") {
    convertedValue = value * fxRateEURUSD;
  }

  const locale = targetCurrency === "EUR" ? "de-DE" : "en-US";

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: targetCurrency,
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(convertedValue);
}

/**
 * Formatiert große Zahlen lesbar (z. B. 1.5B, 250M, 1.2T)
 */
export function formatNumber(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) return "N/A";
  if (Math.abs(value) >= 1e12) return (value / 1e12).toFixed(2) + "T";
  if (Math.abs(value) >= 1e9) return (value / 1e9).toFixed(2) + "B";
  if (Math.abs(value) >= 1e6) return (value / 1e6).toFixed(2) + "M";
  return value.toLocaleString();
}

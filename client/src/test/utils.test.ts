import { describe, it, expect } from "vitest";
import { formatCurrency, formatNumber } from "@/lib/utils";

describe("Utils: formatCurrency", () => {
  it("formats USD currency correctly without conversion", () => {
    const formatted = formatCurrency(150.5, "USD", "USD", 1.08);
    expect(formatted).toContain("150.50");
    expect(formatted).toContain("$");
  });

  it("converts USD to EUR using fxRate correctly", () => {
    // 108 USD / 1.08 = 100 EUR
    const formatted = formatCurrency(108, "USD", "EUR", 1.08);
    expect(formatted).toContain("100");
    expect(formatted).toContain("€");
  });

  it("converts EUR to USD using fxRate correctly", () => {
    // 100 EUR * 1.08 = 108 USD
    const formatted = formatCurrency(100, "EUR", "USD", 1.08);
    expect(formatted).toContain("108.00");
    expect(formatted).toContain("$");
  });

  it("returns fallback for null or undefined values", () => {
    expect(formatCurrency(null, "USD", "USD")).toBe("N/A");
    expect(formatCurrency(undefined, "USD", "USD")).toBe("N/A");
  });
});

describe("Utils: formatNumber", () => {
  it("formats billions and trillions correctly", () => {
    expect(formatNumber(1_500_000_000)).toBe("1.50B");
    expect(formatNumber(2_800_000_000_000)).toBe("2.80T");
    expect(formatNumber(450_000_000)).toBe("450.00M");
  });

  it("returns N/A for invalid numbers", () => {
    expect(formatNumber(null)).toBe("N/A");
    expect(formatNumber(undefined)).toBe("N/A");
  });
});
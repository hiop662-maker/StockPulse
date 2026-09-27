import { render, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { StockSearch } from "@/components/StockSearch";

describe("StockSearch Component", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          {
            symbol: "AAPL",
            name: "Apple Inc.",
            type: "EQUITY",
            region: "US",
            currency: "USD",
          },
        ],
      })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders input field with placeholder", () => {
    const { getByPlaceholderText } = render(
      <StockSearch onSelectStock={vi.fn()} currentSymbol="NVDA" />
    );
    expect(getByPlaceholderText(/Aktie suchen/i)).toBeInTheDocument();
  });

  it("opens dropdown and triggers selection when clicking result", async () => {
    const handleSelect = vi.fn();
    const { getByPlaceholderText, findByText } = render(
      <StockSearch onSelectStock={handleSelect} currentSymbol="NVDA" />
    );

    const input = getByPlaceholderText(/Aktie suchen/i);
    fireEvent.change(input, { target: { value: "Apple" } });

    const appleOption = await findByText(/Apple Inc./i);
    expect(appleOption).toBeInTheDocument();

    appleOption.click();
    expect(handleSelect).toHaveBeenCalledWith("AAPL");
  });
});
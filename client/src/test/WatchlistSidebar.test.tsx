import { render } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { WatchlistSidebar } from "@/components/WatchlistSidebar";
import { WatchlistSummaryItem } from "@/lib/api";

const mockItems: WatchlistSummaryItem[] = [
  {
    id: 1,
    symbol: "NVDA",
    name: "NVIDIA Corporation",
    currency: "USD",
    current_price: 120.5,
    change_percent_24h: 2.5,
    sparkline_1mo: [115, 118, 120.5],
  },
  {
    id: 2,
    symbol: "AAPL",
    name: "Apple Inc.",
    currency: "USD",
    current_price: 180.0,
    change_percent_24h: -1.2,
    sparkline_1mo: [185, 182, 180],
  },
];

describe("WatchlistSidebar Component", () => {
  it("renders watchlist items with symbols and names", () => {
    const { getByText } = render(
      <WatchlistSidebar
        isOpen={true}
        onClose={vi.fn()}
        items={mockItems}
        activeSymbol="NVDA"
        onSelectSymbol={vi.fn()}
        onRemoveSymbol={vi.fn()}
        onToggleCurrent={vi.fn()}
        isCurrentSaved={true}
        displayCurrency="USD"
        fxRate={1.0}
      />
    );

    expect(getByText("NVDA")).toBeInTheDocument();
    expect(getByText("Apple Inc.")).toBeInTheDocument();
  });

  it("calls onSelectSymbol when clicking an item", () => {
    const handleSelect = vi.fn();
    const { getByText } = render(
      <WatchlistSidebar
        isOpen={true}
        onClose={vi.fn()}
        items={mockItems}
        activeSymbol="NVDA"
        onSelectSymbol={handleSelect}
        onRemoveSymbol={vi.fn()}
        onToggleCurrent={vi.fn()}
        isCurrentSaved={true}
        displayCurrency="USD"
        fxRate={1.0}
      />
    );

    // Natives DOM click event
    getByText("Apple Inc.").click();
    expect(handleSelect).toHaveBeenCalledWith("AAPL");
  });
});
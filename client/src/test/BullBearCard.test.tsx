import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BullBearCard } from "../components/BullBearCard";
import * as api from "../lib/api";

vi.mock("../lib/api", () => ({
  fetchBullBearAnalysis: vi.fn(),
}));

const mockData: api.BullBearAnalysis = {
  symbol: "MSFT",
  company_name: "Microsoft Corporation",
  summary: "Cloud-Wachstum bleibt der primäre Treiber.",
  risk_level: "Moderat",
  bull_points: [
    "Starkes Azure-Wachstum",
    "Führende Position bei generativer KI",
    "Diversifizierte Einnahmen",
  ],
  bear_points: [
    "Hohe Investitionsausgaben (CapEx)",
    "Intensiver Wettbewerb im Cloud-Bereich",
    "Makro-Gegenwinde",
  ],
  disclaimer: "Keine Anlageberatung. Dient ausschließlich Informations- und Analysezwecken.",
};

describe("BullBearCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rendert den Ladezustand (Skeleton) zu Beginn", () => {
    vi.mocked(api.fetchBullBearAnalysis).mockImplementation(() => new Promise(() => {}));
    const { container } = render(<BullBearCard symbol="MSFT" />);

    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("rendert Daten nach erfolgreichem Laden korrekt", async () => {
    vi.mocked(api.fetchBullBearAnalysis).mockResolvedValueOnce(mockData);
    render(<BullBearCard symbol="MSFT" />);

    await waitFor(() => {
      expect(screen.getByText("KI Bull vs. Bear Case")).toBeInTheDocument();
      expect(screen.getByText("(MSFT)")).toBeInTheDocument();
      expect(screen.getByText("Moderat")).toBeInTheDocument();
      expect(screen.getByText("Cloud-Wachstum bleibt der primäre Treiber.")).toBeInTheDocument();
      expect(screen.getByText("Starkes Azure-Wachstum")).toBeInTheDocument();
      expect(screen.getByText("Hohe Investitionsausgaben (CapEx)")).toBeInTheDocument();
    });
  });

  it("zeigt Fehlermeldung und Wiederholen-Button bei Fehler an", async () => {
    vi.mocked(api.fetchBullBearAnalysis).mockRejectedValueOnce(
      new Error("API Limit erreicht")
    );
    render(<BullBearCard symbol="MSFT" />);

    await waitFor(() => {
      expect(screen.getByText("API Limit erreicht")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Wiederholen/i })).toBeInTheDocument();
    });
  });
});
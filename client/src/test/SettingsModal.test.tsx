import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SettingsModal } from "@/components/SettingsModal";
import * as AuthContextModule from "@/context/AuthContext";

describe("SettingsModal - AI Features Toggle", () => {
  const mockUpdateAiFeatures = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rendert den Toggle mit Initialzustand true und ruft updateAiFeatures mit false auf", async () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: {
        id: 1,
        email: "test@example.com",
        username: "Tester",
        ai_features_enabled: true,
      },
      token: "mock-token",
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      updateAiFeatures: mockUpdateAiFeatures,
    });

    render(<SettingsModal isOpen={true} onClose={() => {}} />);

    // Suche nach dem AI Toggle Switch
    const switchButton = screen.getByRole("switch");
    expect(switchButton).toBeDefined();
    expect(switchButton.getAttribute("aria-checked")).toBe("true");

    // Klick auf den Switch zum Deaktivieren
    fireEvent.click(switchButton);

    await waitFor(() => {
      expect(mockUpdateAiFeatures).toHaveBeenCalledWith(false);
      expect(switchButton.getAttribute("aria-checked")).toBe("false");
    });
  });

  it("rendert den Toggle mit Initialzustand false und ruft updateAiFeatures mit true auf", async () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: {
        id: 1,
        email: "test@example.com",
        username: "Tester",
        ai_features_enabled: false,
      },
      token: "mock-token",
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      updateAiFeatures: mockUpdateAiFeatures,
    });

    render(<SettingsModal isOpen={true} onClose={() => {}} />);

    const switchButton = screen.getByRole("switch");
    expect(switchButton.getAttribute("aria-checked")).toBe("false");

    fireEvent.click(switchButton);

    await waitFor(() => {
      expect(mockUpdateAiFeatures).toHaveBeenCalledWith(true);
      expect(switchButton.getAttribute("aria-checked")).toBe("true");
    });
  });
});
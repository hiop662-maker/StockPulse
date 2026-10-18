import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SettingsModal } from "@/components/SettingsModal";

// Mock für AuthContext
const mockUpdateAiFeatures = vi.fn();
const mockSaveApiKey = vi.fn();
const mockRemoveApiKey = vi.fn();
const mockOnClose = vi.fn();

let mockUserState = {
  id: 1,
  email: "test@stockpulse.de",
  username: "TestTrader",
  avatar_url: "",
  ai_features_enabled: true,
  has_custom_api_key: false,
  api_key_last4: null as string | null,
};

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: mockUserState,
    token: "fake-jwt-token",
    updateAiFeatures: mockUpdateAiFeatures,
    saveApiKey: mockSaveApiKey,
    removeApiKey: mockRemoveApiKey,
  }),
}));

vi.mock("@/lib/api", () => ({
  updateProfileApi: vi.fn(),
  changePasswordApi: vi.fn(),
  updateUserApiKey: vi.fn(),
  deleteUserApiKey: vi.fn(),
}));

describe("SettingsModal Component (AI Toggle & BYOK)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserState = {
      id: 1,
      email: "test@stockpulse.de",
      username: "TestTrader",
      avatar_url: "",
      ai_features_enabled: true,
      has_custom_api_key: false,
      api_key_last4: null,
    };
  });

  it("rendert den KI-Toggle und das BYOK-Eingabefeld, wenn KI aktiviert ist", () => {
    render(<SettingsModal isOpen={true} onClose={mockOnClose} />);

    const toggle = screen.getByRole("switch");
    expect(toggle).toHaveAttribute("aria-checked", "true");

    expect(
      screen.getByText(/Persönlicher Gemini-API-Key \(BYOK\)/i)
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Gemini API-Key")).toBeInTheDocument();
  });

  it("blendet den BYOK-Bereich aus, wenn KI-Funktionen deaktiviert werden", async () => {
    mockUpdateAiFeatures.mockResolvedValueOnce(undefined);
    render(<SettingsModal isOpen={true} onClose={mockOnClose} />);

    const toggle = screen.getByRole("switch");
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(mockUpdateAiFeatures).toHaveBeenCalledWith(false);
    });

    expect(
      screen.queryByText(/Persönlicher Gemini-API-Key \(BYOK\)/i)
    ).not.toBeInTheDocument();
  });

  it("speichert einen neuen Gemini API-Key, zeigt das maskierte Badge und leert das Input-Feld", async () => {
    mockSaveApiKey.mockResolvedValueOnce({
      has_custom_api_key: true,
      api_key_last4: "9876",
      message: "API-Key erfolgreich geprüft und verschlüsselt gespeichert.",
    });

    render(<SettingsModal isOpen={true} onClose={mockOnClose} />);

    const input = screen.getByLabelText("Gemini API-Key") as HTMLInputElement;
    const saveBtn = screen.getByRole("button", { name: /Key speichern/i });

    fireEvent.change(input, {
      target: { value: "AIzaSyValidTestKey1234569876" },
    });
    expect(input.value).toBe("AIzaSyValidTestKey1234569876");

    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockSaveApiKey).toHaveBeenCalledWith(
        "AIzaSyValidTestKey1234569876"
      );
    });

    // Eingabefeld muss aus Sicherheitsgründen geleert sein
    expect(input.value).toBe("");

    // Grünes Status-Badge und Erfolgsmeldung müssen sichtbar sein
    expect(screen.getByText(/Hinterlegt \(••••9876\)/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /API-Key erfolgreich geprüft und verschlüsselt gespeichert\./i
      )
    ).toBeInTheDocument();
  });

  it("zeigt eine Fehlermeldung an, wenn der eingegebene API-Key ungültig ist", async () => {
    mockSaveApiKey.mockRejectedValueOnce(
      new Error("Ungültiger Gemini-API-Key. Bitte überprüfe deine Eingabe.")
    );

    render(<SettingsModal isOpen={true} onClose={mockOnClose} />);

    const input = screen.getByLabelText("Gemini API-Key");
    const saveBtn = screen.getByRole("button", { name: /Key speichern/i });

    fireEvent.change(input, { target: { value: "AIzaSy_INVALID_KEY" } });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(
        screen.getByText(
          /Ungültiger Gemini-API-Key\. Bitte überprüfe deine Eingabe\./i
        )
      ).toBeInTheDocument();
    });
  });

  it("ermöglicht das Löschen eines bereits hinterlegten API-Keys", async () => {
    mockUserState.has_custom_api_key = true;
    mockUserState.api_key_last4 = "4321";

    mockRemoveApiKey.mockResolvedValueOnce({
      has_custom_api_key: false,
      api_key_last4: null,
      message: "Persönlicher API-Key wurde entfernt.",
    });

    render(<SettingsModal isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByText(/Hinterlegt \(••••4321\)/i)).toBeInTheDocument();

    const deleteBtn = screen.getByRole("button", { name: /Key löschen/i });
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(mockRemoveApiKey).toHaveBeenCalledTimes(1);
    });

    expect(
      screen.queryByText(/Hinterlegt \(••••4321\)/i)
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/Persönlicher API-Key wurde entfernt\./i)
    ).toBeInTheDocument();
  });
});
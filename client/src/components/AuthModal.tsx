"use client";

import { useState } from "react";
import { X, Mail, Lock, AlertCircle, CheckCircle2 } from "lucide-react";
import { requestPasswordReset } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { login } = useAuth();
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const resetState = () => {
    setError(null);
    setSuccessMessage(null);
    setPassword("");
  };

  const switchMode = (newMode: "login" | "register" | "forgot") => {
    resetState();
    setMode(newMode);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      if (mode === "forgot") {
        const res = await requestPasswordReset(email);
        setSuccessMessage(res.message);
      } else if (mode === "login") {
        await login(email, password);
        onClose();
      } else {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Registrierung fehlgeschlagen.");
        
        switchMode("login");
        setSuccessMessage("Konto erfolgreich erstellt! Du kannst dich jetzt anmelden.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="mb-5">
          <h2 className="text-base font-bold text-white">
            {mode === "login" && "Willkommen zurück"}
            {mode === "register" && "Konto erstellen"}
            {mode === "forgot" && "Passwort zurücksetzen"}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {mode === "login" && "Melde dich an, um deine Watchlist zu verwalten."}
            {mode === "register" && "Erstelle ein Konto für deine persönliche Watchlist."}
            {mode === "forgot" && "Gib deine E-Mail ein. Wir senden dir einen Reset-Link."}
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 mb-4 text-xs text-rose-300 bg-rose-950/40 border border-rose-800 rounded-lg">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="flex items-start gap-2 p-3 mb-4 text-xs text-emerald-300 bg-emerald-950/40 border border-emerald-800 rounded-lg">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">E-Mail</label>
            <div className="relative">
              <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3 pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@beispiel.de"
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none transition shadow-sm"
              />
            </div>
          </div>

          {mode !== "forgot" && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-300">Passwort</label>
                {mode === "login" && (
                  <button
                    type="button"
                    onClick={() => switchMode("forgot")}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 transition cursor-pointer"
                  >
                    Passwort vergessen?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none transition shadow-sm"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-xl transition disabled:opacity-50 cursor-pointer shadow-lg shadow-indigo-600/20 mt-2"
          >
            {isLoading && "Wird geladen..."}
            {!isLoading && mode === "login" && "Anmelden"}
            {!isLoading && mode === "register" && "Registrieren"}
            {!isLoading && mode === "forgot" && "Reset-Link anfordern"}
          </button>
        </form>

        <div className="mt-4 pt-4 border-t border-slate-800 text-center text-xs text-slate-400">
          {mode === "login" && (
            <>
              Noch kein Konto?{" "}
              <button
                type="button"
                onClick={() => switchMode("register")}
                className="text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
              >
                Jetzt registrieren
              </button>
            </>
          )}

          {mode === "register" && (
            <>
              Bereits registriert?{" "}
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
              >
                Anmelden
              </button>
            </>
          )}

          {mode === "forgot" && (
            <button
              type="button"
              onClick={() => switchMode("login")}
              className="text-slate-400 hover:text-white transition cursor-pointer"
            >
              ← Zurück zur Anmeldung
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
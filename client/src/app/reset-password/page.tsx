"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { resetPassword } from "@/lib/api";
import { Lock, CheckCircle2, AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (!token) {
    return (
      <div className="p-4 text-center text-xs text-rose-400 bg-rose-950/20 border border-rose-900/50 rounded-xl space-y-3">
        <p>Kein gültiger Token im Link gefunden oder der Link ist unvollständig.</p>
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Zurück zur Anmeldung
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Das Passwort muss mindestens 8 Zeichen lang sein.");
      return;
    }
    if (!/\d/.test(password)) {
      setError("Das Passwort muss mindestens eine Zahl enthalten.");
      return;
    }
    if (!/[!@#$%^&*(),.?":{}|<>_\-[\]\\/+=~`]/.test(password)) {
      setError("Das Passwort muss mindestens ein Sonderzeichen enthalten.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Die Passwörter stimmen nicht überein.");
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword(token, password);
      setSuccess(true);
      setTimeout(() => router.push("/login"), 2500);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Fehler beim Zurücksetzen des Passworts.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center space-y-4 py-4">
        <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
        <h2 className="text-base font-semibold text-white">Passwort erfolgreich geändert!</h2>
        <p className="text-xs text-slate-400">
          Du wirst gleich zur Anmeldung weitergeleitet...
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="flex items-start gap-2 p-3 text-xs text-rose-300 bg-rose-950/40 border border-rose-800 rounded-lg">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-slate-300 mb-1.5">
          Neues Passwort
        </label>
        <div className="relative">
          <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mindestens 8 Zeichen"
            className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none transition"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-300 mb-1.5">
          Passwort bestätigen
        </label>
        <div className="relative">
          <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Passwort wiederholen"
            className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none transition"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-xl transition disabled:opacity-50 cursor-pointer shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          "Neues Passwort speichern"
        )}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4">
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-indigo-600 text-white p-2 px-3 rounded-xl font-bold text-base shadow-lg shadow-indigo-600/30">
          SP
        </div>
        <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
          StockPulse
        </span>
      </div>

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8">
        <div className="mb-6">
          <h1 className="text-base font-bold text-white">Neues Passwort vergeben</h1>
          <p className="text-xs text-slate-400 mt-1">
            Wähle ein sicheres Kennwort für dein Konto.
          </p>
        </div>

        <Suspense fallback={<div className="text-xs text-slate-400 text-center py-4">Laden...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  );
}
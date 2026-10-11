"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  User as UserIcon,
  Lock,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { updateProfileApi, changePasswordApi } from "@/lib/api";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { user, token, updateAiFeatures } = useAuth();
  const [mounted, setMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [username, setUsername] = useState(user?.username || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [aiEnabled, setAiEnabled] = useState(user?.ai_features_enabled ?? true);

  const [profileMsg, setProfileMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [passwordMsg, setPasswordMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [aiMsg, setAiMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isUpdatingAi, setIsUpdatingAi] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Synchronisiere Formularfelder, wenn sich der User ändert
  useEffect(() => {
    if (user) {
      setUsername(user.username || "");
      setAvatarUrl(user.avatar_url || "");
      setAiEnabled(user.ai_features_enabled ?? true);
    }
  }, [user]);

  if (!isOpen || !user || !token || !mounted) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setProfileMsg({
        type: "error",
        text: "Bild darf maximal 2 MB groß sein.",
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);
    setIsUpdatingProfile(true);

    try {
      await updateProfileApi(token, {
        username: username.trim() || undefined,
        avatar_url: avatarUrl.trim() || undefined,
      });
      window.location.reload();
    } catch (err: unknown) {
      setProfileMsg({
        type: "error",
        text: err instanceof Error ? err.message : "Fehler aufgetreten.",
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleToggleAi = async () => {
    const nextVal = !aiEnabled;
    setAiEnabled(nextVal);
    setAiMsg(null);
    setIsUpdatingAi(true);

    try {
      if (updateAiFeatures) {
        await updateAiFeatures(nextVal);
      }
    } catch (err: unknown) {
      setAiEnabled(!nextVal); // Revert bei Fehler
      setAiMsg({
        type: "error",
        text: err instanceof Error ? err.message : "Einstellung konnte nicht gespeichert werden.",
      });
    } finally {
      setIsUpdatingAi(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (newPassword.length < 8) {
      setPasswordMsg({
        type: "error",
        text: "Das neue Passwort muss mindestens 8 Zeichen lang sein.",
      });
      return;
    }
    if (
      !/\d/.test(newPassword) ||
      !/[!@#$%^&*(),.?":{}|<>_\-[\]\\/+=~`]/.test(newPassword)
    ) {
      setPasswordMsg({
        type: "error",
        text: "Mindestens eine Zahl und ein Sonderzeichen erforderlich.",
      });
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await changePasswordApi(token, {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setPasswordMsg({
        type: "success",
        text: "Passwort erfolgreich geändert.",
      });
      setCurrentPassword("");
      setNewPassword("");
    } catch (err: unknown) {
      setPasswordMsg({
        type: "error",
        text:
          err instanceof Error
            ? err.message
            : "Fehler beim Ändern des Passworts.",
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 overflow-hidden max-h-[85vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-lg font-bold text-slate-100 mb-6 flex items-center gap-2">
          <UserIcon className="w-5 h-5 text-indigo-400" />
          Kontoeinstellungen
        </h2>

        {/* Profil-Formular (Name & Avatar) */}
        <form
          onSubmit={handleProfileSubmit}
          className="space-y-4 pb-6 border-b border-slate-800"
        >
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Profil & Avatar
          </h3>

          {profileMsg && (
            <div
              className={`p-3 rounded-lg flex items-center gap-2 text-xs ${
                profileMsg.type === "success"
                  ? "bg-emerald-950/50 border border-emerald-800/60 text-emerald-300"
                  : "bg-red-950/50 border border-red-800/60 text-red-300"
              }`}
            >
              {profileMsg.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{profileMsg.text}</span>
            </div>
          )}

          {/* Avatar Preview & Upload */}
          <div className="flex items-center gap-4">
            <img
              src={
                avatarUrl ||
                `https://api.dicebear.com/7.x/bottts/svg?seed=${
                  username || user.email
                }`
              }
              alt="Avatar Preview"
              className="w-14 h-14 rounded-full bg-slate-950 border-2 border-indigo-500/50 object-cover"
            />
            <div className="flex flex-col gap-1.5">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                Eigenes Bild wählen
              </button>
              <span className="text-[10px] text-slate-500">
                Max. 2 MB (PNG, JPG, SVG)
              </span>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Benutzername
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Dein Name"
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none transition"
            />
          </div>

          <button
            type="submit"
            disabled={isUpdatingProfile}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-xs rounded-xl shadow-lg shadow-indigo-600/20 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            {isUpdatingProfile ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Profil speichern"
            )}
          </button>
        </form>

        {/* KI-Funktionen Toggle */}
        <div className="py-6 border-b border-slate-800">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            KI-Funktionen
          </h3>

          {aiMsg && (
            <div className="mb-3 p-3 rounded-lg flex items-center gap-2 text-xs bg-red-950/50 border border-red-800/60 text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{aiMsg.text}</span>
            </div>
          )}

          <div className="flex items-center justify-between p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl">
            <div className="pr-4">
              <span className="block text-xs font-medium text-slate-200">
                KI-Analysen & Assistent aktivieren
              </span>
              <span className="block text-[11px] text-slate-400 mt-0.5">
                Steuert Bull/Bear-Analysen und den AI-Chat zur Schonung von API-Kontingenten.
              </span>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={aiEnabled}
              disabled={isUpdatingAi}
              onClick={handleToggleAi}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
                aiEnabled ? "bg-indigo-600" : "bg-slate-700"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  aiEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Passwort ändern Formular */}
        <form onSubmit={handlePasswordSubmit} className="space-y-4 pt-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            Passwort ändern
          </h3>

          {passwordMsg && (
            <div
              className={`p-3 rounded-lg flex items-center gap-2 text-xs ${
                passwordMsg.type === "success"
                  ? "bg-emerald-950/50 border border-emerald-800/60 text-emerald-300"
                  : "bg-red-950/50 border border-red-800/60 text-red-300"
              }`}
            >
              {passwordMsg.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{passwordMsg.text}</span>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Aktuelles Passwort
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none transition"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Neues Passwort
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mind. 8 Zeichen, Zahl & Sonderzeichen"
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none transition"
            />
          </div>

          <button
            type="submit"
            disabled={isUpdatingPassword}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 font-medium text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
          >
            {isUpdatingPassword ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Neues Passwort speichern"
            )}
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
}
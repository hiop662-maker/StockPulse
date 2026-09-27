"use client";

import React, { useState, useRef, useEffect } from "react";
import { LogIn, LogOut, ChevronDown, Settings } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { SettingsModal } from "@/components/SettingsModal";
import { AuthModal } from "@/components/AuthModal";

export function UserMenu() {
  const { user, logout, isLoading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (isLoading) {
    return <div className="w-8 h-8 rounded-full bg-slate-800 animate-pulse" />;
  }

  if (!user) {
    return (
      <>
        <button
          onClick={() => setIsAuthOpen(true)}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition shadow-sm cursor-pointer"
        >
          <LogIn className="w-3.5 h-3.5" />
          <span>Anmelden</span>
        </button>

        <AuthModal
          isOpen={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
        />
      </>
    );
  }

  const displayName = user.username || user.email.split("@")[0];
  const avatarUrl =
    user.avatar_url ||
    `https://api.dicebear.com/7.x/bottts/svg?seed=${displayName}`;

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 p-1.5 pr-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/60 transition cursor-pointer group"
        >
          <img
            src={avatarUrl}
            alt={displayName}
            className="w-6 h-6 rounded-full bg-indigo-950/80 border border-indigo-500/40 p-0.5 object-cover"
          />
          <span className="text-xs font-medium text-slate-300 group-hover:text-slate-100 max-w-[100px] truncate">
            {displayName}
          </span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-52 bg-slate-900 border border-slate-800 rounded-xl shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-3.5 py-2 border-b border-slate-800/80 mb-1">
              <p className="text-xs font-medium text-slate-200 truncate">
                {displayName}
              </p>
              <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
            </div>

            <button
              onClick={() => {
                setIsOpen(false);
                setIsSettingsOpen(true);
              }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition text-left cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5 text-slate-400" />
              <span>Einstellungen</span>
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-red-400 hover:bg-red-950/30 hover:text-red-300 transition text-left cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Abmelden</span>
            </button>
          </div>
        )}
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  );
}
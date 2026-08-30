"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { User, loginApi, registerApi, getMeApi } from "@/lib/api";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, username?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem("stockpulse_token");
    if (storedToken) {
      setToken(storedToken);
      getMeApi(storedToken)
        .then((userData) => {
          setUser(userData);
        })
        .catch(() => {
          // Token ist abgelaufen oder ungültig
          localStorage.removeItem("stockpulse_token");
          setToken(null);
          setUser(null);
          if (pathname !== "/login") {
            router.replace("/login");
          }
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
      // Kein Token vorhanden -> Weiterleitung zur Login-Seite
      if (pathname !== "/login") {
        router.replace("/login");
      }
    }
  }, [pathname, router]);

  const login = async (email: string, password: string) => {
    const res = await loginApi(email, password);
    localStorage.setItem("stockpulse_token", res.access_token);
    setToken(res.access_token);
    setUser(res.user);
  };

  const register = async (email: string, password: string, username?: string) => {
    const res = await registerApi(email, password, username);
    localStorage.setItem("stockpulse_token", res.access_token);
    setToken(res.access_token);
    setUser(res.user);
  };

  const logout = () => {
    localStorage.removeItem("stockpulse_token");
    setToken(null);
    setUser(null);
    router.replace("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
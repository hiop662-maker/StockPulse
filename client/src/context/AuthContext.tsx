"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  User,
  UserApiKeyStatus,
  loginApi,
  registerApi,
  getMeApi,
  updateSettingsApi,
  updateUserApiKey,
  deleteUserApiKey,
} from "@/lib/api";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, username?: string) => Promise<void>;
  logout: () => void;
  updateAiFeatures: (enabled: boolean) => Promise<void>;
  saveApiKey: (apiKey: string) => Promise<UserApiKeyStatus>;
  removeApiKey: () => Promise<UserApiKeyStatus>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PUBLIC_PATHS = ["/login", "/reset-password"];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
    const storedToken = localStorage.getItem("stockpulse_token");

    if (storedToken) {
      setToken(storedToken);
      getMeApi(storedToken)
        .then((userData) => {
          setUser(userData);
        })
        .catch(() => {
          localStorage.removeItem("stockpulse_token");
          setToken(null);
          setUser(null);
          if (!isPublicPath) {
            router.replace("/login");
          }
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
      if (!isPublicPath) {
        router.replace("/login");
      }
    }
  }, [pathname, router]);

  const login = async (email: string, password: string) => {
    const res = await loginApi(email, password);
    localStorage.setItem("stockpulse_token", res.access_token);
    setToken(res.access_token);
    if (res.user) {
      setUser(res.user);
    } else {
      const me = await getMeApi(res.access_token);
      setUser(me);
    }
  };

  const register = async (email: string, password: string, username?: string) => {
    await registerApi(email, password, username);
    await login(email, password);
  };

  const logout = () => {
    localStorage.removeItem("stockpulse_token");
    setToken(null);
    setUser(null);
    router.replace("/login");
  };

  const updateAiFeatures = async (enabled: boolean) => {
    if (!token) return;
    const updatedUser = await updateSettingsApi(token, { ai_features_enabled: enabled });
    setUser(updatedUser);
  };

  const saveApiKey = async (apiKey: string): Promise<UserApiKeyStatus> => {
    if (!token) throw new Error("Nicht authentifiziert.");
    const status = await updateUserApiKey(token, apiKey);
    setUser((prev) =>
      prev
        ? {
            ...prev,
            has_custom_api_key: status.has_custom_api_key,
            api_key_last4: status.api_key_last4,
          }
        : prev
    );
    return status;
  };

  const removeApiKey = async (): Promise<UserApiKeyStatus> => {
    if (!token) throw new Error("Nicht authentifiziert.");
    const status = await deleteUserApiKey(token);
    setUser((prev) =>
      prev
        ? {
            ...prev,
            has_custom_api_key: false,
            api_key_last4: null,
          }
        : prev
    );
    return status;
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
        updateAiFeatures,
        saveApiKey,
        removeApiKey,
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
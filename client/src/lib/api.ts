const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export interface StockQuote {
  symbol: string;
  name?: string;
  shortName?: string;
  currency: string;
  currentPrice?: number;
  current_price?: number;
  marketCap?: number;
  market_cap?: number;
  trailingPE?: number;
  pe_trailing?: number;
  forwardPE?: number;
  pe_forward?: number;
  fiftyTwoWeekLow?: number;
  fifty_two_week_low?: number;
  fiftyTwoWeekHigh?: number;
  fifty_two_week_high?: number;
  recommendationKey?: string;
  recommendation_key?: string;
}

export interface ChartPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  [key: string]: any;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AiAdvisorResponse {
  reply: string;
  symbol: string;
}

export async function fetchStockQuote(ticker: string): Promise<StockQuote> {
  const res = await fetch(`${BASE_URL}/market/quote/${ticker}`);
  if (!res.ok) throw new Error(`Fehler beim Laden der Kursdaten für ${ticker}`);
  return res.json();
}

export async function fetchStockHistory(
  ticker: string,
  period: string = "6mo"
): Promise<ChartPoint[]> {
  const res = await fetch(`${BASE_URL}/market/history/${ticker}?period=${period}`);
  if (!res.ok) throw new Error(`Fehler beim Laden der Historie für ${ticker}`);
  return res.json();
}

export async function fetchFxRate(pair: string = "EURUSD=X"): Promise<number> {
  try {
    const res = await fetch(`${BASE_URL}/market/fx/${pair}`);
    if (!res.ok) return 1.08;
    const data = await res.json();
    return data.rate ?? 1.08;
  } catch {
    return 1.08;
  }
}

export async function askAiAdvisor(
  symbol: string,
  question: string,
  history: ChatMessage[] = []
): Promise<AiAdvisorResponse> {
  const res = await fetch(`${BASE_URL}/ai/advisor`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      symbol: symbol.toUpperCase(),
      question,
      history,
    }),
  });

  if (!res.ok) {
    throw new Error(`Fehler bei der KI-Anfrage: ${res.statusText}`);
  }

  return res.json();
}

/**
 * Streamt die Antwort des KI-Analysten Token für Token
 */
export async function streamAiAdvisor(
  symbol: string,
  question: string,
  history: ChatMessage[] = [],
  onChunk: (chunk: string) => void
): Promise<void> {
  const res = await fetch(`${BASE_URL}/ai/advisor/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      symbol: symbol.toUpperCase(),
      question,
      history,
    }),
  });

  if (!res.ok || !res.body) {
    throw new Error(`Fehler bei der Streaming-Anfrage: ${res.statusText}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.replace("data: ", "");
        if (data === "[DONE]") return;
        onChunk(data);
      }
    }
  }
}

export interface User {
  id: number;
  username: string | null;
  email: string;
  avatar_url: string | null;
  created_at?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export async function loginApi(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Login fehlgeschlagen");
  }
  return res.json();
}

export async function registerApi(
  email: string,
  password: string,
  username?: string
): Promise<AuthResponse> {
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, username: username || undefined }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Registrierung fehlgeschlagen");
  }
  return res.json();
}

export async function getMeApi(token: string): Promise<User> {
  const res = await fetch(`${BASE_URL}/auth/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    throw new Error("Sitzung abgelaufen");
  }
  return res.json();
}

export async function updateProfileApi(
  token: string,
  data: { username?: string; avatar_url?: string }
): Promise<User> {
  const res = await fetch(`${BASE_URL}/auth/profile`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Fehler beim Aktualisieren des Profils.");
  }
  return res.json();
}

export async function changePasswordApi(
  token: string,
  data: { current_password: string; new_password: string }
): Promise<{ message: string }> {
  const res = await fetch(`${BASE_URL}/auth/password`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Fehler beim Ändern des Passworts.");
  }
  return res.json();
}
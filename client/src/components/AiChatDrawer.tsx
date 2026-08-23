"use client";

import { useState } from "react";
import { askFinancialAgent } from "@/lib/api";
import { Bot, Send, Sparkles, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface AiChatDrawerProps {
  currentSymbol: string;
  isOpen: boolean;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function AiChatDrawer({ currentSymbol, isOpen }: AiChatDrawerProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `Hallo! Ich analysiere **${currentSymbol}** mit Echtzeitdaten, RSI und SMAs. Nutze eine Schnellfrage oder tippe deinen eigenen Prompt!`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || input;
    if (!textToSend.trim() || loading) return;

    const userMessage: Message = { role: "user", content: textToSend };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await askFinancialAgent(textToSend);
      setMessages((prev) => [...prev, { role: "assistant", content: res.analysis }]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `❌ Fehler: ${err.message || "Anfrage fehlgeschlagen."}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <aside className="fixed top-[57px] right-0 bottom-0 w-full md:w-[460px] h-[calc(100vh-57px)] bg-slate-950/95 backdrop-blur-md border-l border-slate-800 shadow-2xl flex flex-col z-20">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-semibold text-white text-sm">StockPulse AI Agent</h2>
            <p className="text-xs text-slate-400">Analysiere {currentSymbol} in Echtzeit</p>
          </div>
        </div>
      </div>

      {/* Schnellaktionen */}
      <div className="px-4 py-2 border-b border-slate-800/60 bg-slate-900/30 flex gap-2 overflow-x-auto">
        <button
          onClick={() =>
            handleSend(`Analysiere ${currentSymbol} mit Fokus auf RSI und Moving Averages.`)
          }
          disabled={loading}
          className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-full border border-slate-700 whitespace-nowrap flex items-center gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          Schnell-Check {currentSymbol}
        </button>
        <button
          onClick={() =>
            handleSend(`Wie ist das Chance-Risiko-Verhältnis bei ${currentSymbol}?`)
          }
          disabled={loading}
          className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-full border border-slate-700 whitespace-nowrap"
        >
          Einstiegschancen?
        </button>
      </div>

      {/* Nachrichtenliste */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[90%] rounded-xl p-3.5 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-900 border border-slate-800 text-slate-200"
              }`}
            >
              {m.role === "assistant" ? (
                <div className="space-y-2">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              ) : (
                m.content
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 text-slate-400 text-sm flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
              Agent analysiert Indikatoren...
            </div>
          </div>
        )}
      </div>

      {/* Eingabefeld */}
      <div className="p-4 border-t border-slate-800 bg-slate-950">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Frage zu ${currentSymbol}...`}
            disabled={loading}
            className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg transition"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </aside>
  );
}
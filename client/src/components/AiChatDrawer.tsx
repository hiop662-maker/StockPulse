"use client";

import { useState, useRef, useEffect } from "react";
import {
  Send,
  Sparkles,
  Bot,
  User,
  TrendingUp,
  ShieldAlert,
  Layers,
  FileText,
} from "lucide-react";
import { streamAiAdvisor, ChatMessage } from "@/lib/api";

interface AiChatDrawerProps {
  currentSymbol: string;
  isOpen: boolean;
}

interface QuickAction {
  label: string;
  icon: React.ReactNode;
  prompt: string;
}

export function AiChatDrawer({ currentSymbol, isOpen }: AiChatDrawerProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickActions: QuickAction[] = [
    {
      label: "Fundamentale Übersicht",
      icon: <FileText className="w-3.5 h-3.5 text-indigo-400 shrink-0" />,
      prompt: `Erstelle eine prägnante fundamentale Zusammenfassung für ${currentSymbol}. Gehe dabei kurz auf Bewertung (KGV), Marktkapitalisierung und die jüngste Geschäftsentwicklung ein.`,
    },
    {
      label: "Technischer Chart-Check",
      icon: <TrendingUp className="w-3.5 h-3.5 text-amber-400 shrink-0" />,
      prompt: `Analysiere die Lage für ${currentSymbol} anhand relevanter Durchschnitte (SMA 50, SMA 200) und des Momentum-Indikators RSI (14).`,
    },
    {
      label: "Risiko-Assessment",
      icon: <ShieldAlert className="w-3.5 h-3.5 text-red-400 shrink-0" />,
      prompt: `Welche wesentlichen Risiken und Gegenwinde (z. B. makroökonomisch, Wettbewerb, Margendruck) bestehen aktuell für ${currentSymbol}?`,
    },
    {
      label: "Peer-Group & Moat",
      icon: <Layers className="w-3.5 h-3.5 text-emerald-400 shrink-0" />,
      prompt: `Wer sind die wichtigsten direkten Konkurrenten von ${currentSymbol} und wie stark ist der wirtschaftliche Burggraben (Moat)?`,
    },
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: ChatMessage = { role: "user", content: textToSend };
    const chatHistory = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // User-Message sofort anzeigen + leere Assistant-Nachricht anlegen
    setMessages((prev) => [
      ...prev,
      userMsg,
      { role: "assistant", content: "" },
    ]);
    if (!messageText) setInput("");
    setIsLoading(true);

    try {
      await streamAiAdvisor(
        currentSymbol,
        textToSend,
        chatHistory,
        (chunk: string) => {
          setMessages((prev) => {
            const updated = [...prev];
            const lastIdx = updated.length - 1;
            if (lastIdx >= 0 && updated[lastIdx].role === "assistant") {
              updated[lastIdx] = {
                ...updated[lastIdx],
                content: updated[lastIdx].content + chunk,
              };
            }
            return updated;
          });
        }
      );
    } catch (err) {
      setMessages((prev) => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        if (lastIdx >= 0 && updated[lastIdx].role === "assistant") {
          updated[lastIdx] = {
            ...updated[lastIdx],
            content:
              "Entschuldigung, beim Laden der Antwort ist ein Fehler aufgetreten.",
          };
        }
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <aside className="fixed right-0 top-[57px] bottom-0 w-full sm:w-[440px] bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col z-40 animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="p-3.5 px-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span className="font-semibold text-slate-100 text-sm">
            KI-Analyst ({currentSymbol})
          </span>
        </div>
      </div>

      {/* Permanentes Quick-Actions Grid oben */}
      <div className="p-3 border-b border-slate-800/80 bg-slate-950/40">
        <div className="grid grid-cols-2 gap-2">
          {quickActions.map((action, idx) => (
            <button
              key={idx}
              type="button"
              disabled={isLoading}
              onClick={() => handleSend(action.prompt)}
              className="flex items-center gap-2 p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800/70 text-left transition disabled:opacity-50 cursor-pointer group"
            >
              {action.icon}
              <span className="text-[11px] font-medium text-slate-300 group-hover:text-indigo-300 truncate">
                {action.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8 text-slate-400 space-y-2">
            <div className="w-9 h-9 rounded-full bg-indigo-950/60 border border-indigo-800/50 flex items-center justify-center mx-auto text-indigo-400">
              <Bot className="w-4 h-4" />
            </div>
            <p className="text-xs text-slate-400 max-w-[260px] mx-auto">
              Wähle oben eine Analyse oder stelle eine eigene Frage zu {currentSymbol}.
            </p>
          </div>
        )}

        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex gap-2.5 text-sm ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            {msg.role === "assistant" && (
              <div className="w-6 h-6 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5" />
              </div>
            )}
            <div
              className={`p-3 rounded-xl max-w-[85%] leading-relaxed text-xs ${
                msg.role === "user"
                  ? "bg-indigo-600 text-white rounded-br-none"
                  : "bg-slate-950 border border-slate-800 text-slate-200 rounded-bl-none whitespace-pre-line"
              }`}
            >
              {/* Animierte Punkte nur anzeigen, wenn der Assistant-Text noch leer ist */}
              {msg.role === "assistant" && !msg.content ? (
                <div className="flex items-center gap-1.5 py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.4s]" />
                </div>
              ) : (
                msg.content
              )}
            </div>
            {msg.role === "user" && (
              <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0 mt-0.5">
                <User className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-3 border-t border-slate-800 bg-slate-950/80 flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Frage zu ${currentSymbol}...`}
          disabled={isLoading}
          className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white p-2 rounded-lg transition shrink-0 cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </aside>
  );
}
"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Bot, Loader2, MessageCircle, X } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { sendChatMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ChatRole = "user" | "assistant";

interface ChatTurn {
  id: string;
  role: ChatRole;
  content: string;
}

const quickPrompts = [
  "What's the status of PO-2024-001?",
  "How do alerts get triggered?",
  "Summarize the Field Support agreement."
];

export function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [conversation, setConversation] = useState<ChatTurn[]>([{
    id: crypto.randomUUID(),
    role: "assistant",
    content: "Hi! I'm the DMS assistant. Ask about purchase orders, invoices, agreements, or alerts and I'll guide you."
  }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!message.trim() || loading) return;

    const userTurn: ChatTurn = {
      id: crypto.randomUUID(),
      role: "user",
      content: message.trim()
    };

    const pendingConversation = [...conversation, userTurn];
    setConversation(pendingConversation);
    setMessage("");
    setLoading(true);
    setError(null);

    try {
      const { reply, session_id } = await sendChatMessage(userTurn.content, pendingConversation.map(({ role, content }) => ({ role, content })), sessionId);
      if (session_id) setSessionId(session_id);
      const assistantTurn: ChatTurn = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: reply
      };
      setConversation((prev) => [...prev, assistantTurn]);
    } catch (err) {
      console.error(err);
      setError("Unable to reach the assistant. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    setMessage(prompt);
  };

  const chatHistory = useMemo(() => conversation, [conversation]);

  return (
    <>
      <button
        type="button"
        aria-label="Open DMS Assistant"
        onClick={() => setOpen((prev) => !prev)}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand-500 text-white shadow-xl shadow-brand-500/30 transition hover:bg-brand-600"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 z-40 w-full max-w-sm overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/95 shadow-2xl backdrop-blur"
          >
            <div className="flex items-center gap-3 border-b border-slate-800 bg-slate-900/60 px-4 py-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500/20 text-brand-200">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">DMS Assistant</p>
                <p className="text-xs text-slate-400">Ask about spending, alerts, or document status.</p>
              </div>
            </div>

            <div className="flex flex-col gap-3 px-4 py-4 text-sm text-slate-200">
              <div className="h-64 overflow-y-auto space-y-3 pr-1">
                {chatHistory.map((turn) => (
                  <div key={turn.id} className={turn.role === "assistant" ? "flex gap-3" : "flex gap-3 justify-end"}>
                    {turn.role === "assistant" && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-500/20 text-brand-200">
                        <Bot className="h-4 w-4" />
                      </div>
                    )}
                    <div
                      className={
                        turn.role === "assistant"
                          ? "max-w-[80%] rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-2"
                          : "max-w-[80%] rounded-2xl bg-brand-500 px-3 py-2 text-white"
                      }
                    >
                      {turn.content}
                    </div>
                    {turn.role === "user" && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white">
                        <span className="text-xs font-semibold">You</span>
                      </div>
                    )}
                  </div>
                ))}
                {loading && (
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating answer…
                  </div>
                )}
              </div>

              {error && <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">{error}</p>}

              <div className="flex flex-wrap gap-2">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => handleQuickPrompt(prompt)}
                    className="rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1 text-xs text-slate-300 transition hover:border-brand-500/40 hover:text-brand-100"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="border-t border-slate-800 bg-slate-900/70 px-4 py-3">
              <div className="flex items-center gap-2">
                <Input
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Ask something about the DMS…"
                  className="bg-slate-900/80"
                  disabled={loading}
                />
                <Button type="submit" disabled={loading || !message.trim()}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send"}
                </Button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

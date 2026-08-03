import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Bot, Send, X, Loader2 } from "lucide-react";
import { askAssistant } from "@/lib/investigation.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Msg {
  role: "user" | "assistant";
  text: string;
}

export function AssistantDock() {
  const ask = useServerFn(askAssistant);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      text: "I'm the ForensicAI assistant. Ask me about your investigations, agent findings, or platform capabilities.",
    },
  ]);

  async function send() {
    const question = input.trim();
    if (!question || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: question }]);
    setBusy(true);
    try {
      const res = await ask({ data: { question, caseId: null } });
      setMessages((m) => [...m, { role: "assistant", text: res.answer }]);
    } catch (error) {
      setMessages((m) => [
        ...m,
        { role: "assistant", text: (error as Error).message || "Assistant unavailable." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {open && (
        <div className="glass-panel fixed bottom-24 right-5 z-50 flex h-[26rem] w-[min(22rem,calc(100vw-2.5rem))] flex-col overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <Bot className="size-4 text-primary" />
            <span className="font-display text-sm font-semibold">AI Assistant</span>
            <button className="ml-auto" onClick={() => setOpen(false)} aria-label="Close assistant">
              <X className="size-4 text-muted-foreground" />
            </button>
          </div>
          <ScrollArea className="flex-1 px-4 py-3">
            <div className="space-y-3">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={
                    m.role === "user"
                      ? "ml-auto max-w-[85%] rounded-lg rounded-br-sm bg-primary/15 px-3 py-2 text-sm"
                      : "max-w-[90%] rounded-lg rounded-bl-sm bg-secondary px-3 py-2 text-sm text-secondary-foreground"
                  }
                >
                  {m.text}
                </div>
              ))}
              {busy && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="size-3 animate-spin" /> analysing…
                </div>
              )}
            </div>
          </ScrollArea>
          <div className="flex gap-2 border-t border-border p-3">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Ask about a case…"
              className="h-9"
            />
            <Button size="icon" className="size-9 shrink-0" onClick={send} disabled={busy}>
              <Send className="size-4" />
            </Button>
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="AI assistant"
        className="fixed bottom-6 right-5 z-50 grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 animate-pulse-ring"
      >
        <Bot className="size-6" />
      </button>
    </>
  );
}

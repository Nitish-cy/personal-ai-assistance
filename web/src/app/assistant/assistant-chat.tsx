"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { SendIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { ConversationSidebar, type Conversation } from "./conversation-sidebar";

type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "error";
  content: string;
};

const SUGGESTED_PROMPTS = [
  "Do I have any meetings today?",
  "Find me a free 1-hour slot tomorrow.",
  "What does my schedule look like this week?",
];

let messageIdCounter = 0;
function nextId() {
  messageIdCounter += 1;
  return `msg-${messageIdCounter}`;
}

export function AssistantChat({ userName }: { userName: string }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  function scrollToBottom() {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    });
  }

  async function refreshConversations() {
    try {
      const res = await fetch("/api/agent/conversations");
      if (!res.ok) return;
      const data = (await res.json()) as { conversations: Conversation[] };
      setConversations(data.conversations);
    } catch {
      // Sidebar just stays as-is if this fails - not fatal to the chat itself.
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadInitialConversations() {
      await refreshConversations();
      if (!cancelled) {
        setReady(true);
      }
    }

    void loadInitialConversations();

    return () => {
      cancelled = true;
    };
  }, []);

  async function selectConversation(id: string) {
    setActiveId(id);
    setMessages([]);

    try {
      const res = await fetch(`/api/agent/conversations/${id}/messages`);
      if (!res.ok) return;

      const data = (await res.json()) as { history: { role: "user" | "assistant"; content: string }[] };
      setMessages(data.history.map((entry) => ({ id: nextId(), role: entry.role, content: entry.content })));
    } finally {
      scrollToBottom();
    }
  }

  function startNewChat() {
    setActiveId(null);
    setMessages([]);
  }

  async function removeConversation(id: string) {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) {
      startNewChat();
    }
    await fetch(`/api/agent/conversations/${id}`, { method: "DELETE" });
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim();

    if (!trimmed || loading) {
      return;
    }

    setMessages((prev) => [...prev, { id: nextId(), role: "user", content: trimmed }]);
    setInput("");
    setLoading(true);
    scrollToBottom();

    try {
      const res = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, conversationId: activeId ?? undefined }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            role: "error",
            content: data?.error ?? "Something went wrong. Please try again.",
          },
        ]);
        return;
      }

      const data = (await res.json()) as { reply: string; conversationId: string };
      setMessages((prev) => [...prev, { id: nextId(), role: "assistant", content: data.reply }]);
      setActiveId(data.conversationId);
      void refreshConversations();
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: "error", content: "Couldn't reach the assistant. Please try again." },
      ]);
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void sendMessage(input);
  }

  return (
    <div className="flex h-screen bg-muted/30">
      <ConversationSidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={(id) => void selectConversation(id)}
        onNewChat={startNewChat}
        onDelete={(id) => void removeConversation(id)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-background px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold">AI Calendar Assistant</h1>
            <p className="text-sm text-muted-foreground">Signed in as {userName}</p>
          </div>
          <Link href="/dashboard" className="text-sm underline underline-offset-4">
            Back to dashboard
          </Link>
        </header>

        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
          {!ready && <p className="pt-16 text-center text-sm text-muted-foreground">Loading...</p>}

          {ready && messages.length === 0 && (
            <div className="mx-auto max-w-lg space-y-4 pt-16 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-2xl">
                🤖
              </div>
              <p className="text-muted-foreground">Ask anything about your calendar to get started.</p>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void sendMessage(prompt)}
                    className="rounded-full border border-border px-3 py-1.5 text-sm hover:bg-muted"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={cn("flex items-end gap-2", message.role === "user" ? "justify-end" : "justify-start")}
            >
              {message.role !== "user" && (
                <Avatar className="size-7 shrink-0">
                  <AvatarFallback className="bg-primary text-xs text-primary-foreground">AI</AvatarFallback>
                </Avatar>
              )}
              <div
                className={cn(
                  "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap shadow-sm",
                  message.role === "user" && "rounded-br-sm bg-primary text-primary-foreground",
                  message.role === "assistant" && "rounded-bl-sm bg-background",
                  message.role === "error" && "rounded-bl-sm border border-destructive bg-background text-destructive"
                )}
              >
                {message.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-end justify-start gap-2">
              <Avatar className="size-7 shrink-0">
                <AvatarFallback className="bg-primary text-xs text-primary-foreground">AI</AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-background px-4 py-3 shadow-sm">
                <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
                <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
                <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground" />
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2 border-t border-border bg-background px-6 py-4">
          <Input
            value={input}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
            placeholder="Ask anything about your calendar..."
            disabled={loading}
          />
          <Button type="submit" disabled={loading || !input.trim()} size="icon">
            <SendIcon className="size-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

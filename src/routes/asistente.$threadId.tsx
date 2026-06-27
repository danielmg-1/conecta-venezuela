import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/asistente/$threadId")({
  component: ChatThread,
});

const SUGGESTIONS = [
  "¿Han visto a alguien llamado María Pérez?",
  "¿Cuáles son los estados más afectados?",
  "¿Dónde puedo donar agua y comida?",
  "Dame consejos para mantener la calma",
];

function ChatThread() {
  const { threadId } = Route.useParams();
  const [initialMessages, setInitialMessages] = useState<UIMessage[] | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load history for this thread
  useEffect(() => {
    let cancelled = false;
    setInitialMessages(null);
    (async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("id, role, parts")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      const msgs: UIMessage[] = (data ?? []).map((r) => ({
        id: r.id as string,
        role: r.role as UIMessage["role"],
        parts: (r.parts as UIMessage["parts"]) ?? [],
      }));
      setInitialMessages(msgs);
    })();
    return () => {
      cancelled = true;
    };
  }, [threadId]);

  if (initialMessages === null) {
    return (
      <div className="grid h-full place-items-center text-sm text-muted-foreground">
        Cargando…
      </div>
    );
  }

  return (
    <ChatWindow key={threadId} threadId={threadId} initialMessages={initialMessages} inputRef={inputRef} />
  );
}

function ChatWindow({
  threadId,
  initialMessages,
  inputRef,
}: {
  threadId: string;
  initialMessages: UIMessage[];
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  const persistedIds = useRef<Set<string>>(new Set(initialMessages.map((m) => m.id)));

  const { messages, sendMessage, status } = useChat({
    id: threadId,
    messages: initialMessages,
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    onError: (e) => console.error("chat error", e),
  });

  // Persist new messages as they finish streaming
  useEffect(() => {
    if (status !== "ready") return;
    const toSave = messages.filter((m) => !persistedIds.current.has(m.id));
    if (toSave.length === 0) return;
    (async () => {
      for (const m of toSave) {
        const { error } = await supabase.from("chat_messages").insert({
          thread_id: threadId,
          role: m.role,
          parts: m.parts as unknown as Record<string, unknown>[],
        });
        if (!error) persistedIds.current.add(m.id);
      }
      // Touch thread + maybe set title from first user message
      const firstUser = messages.find((m) => m.role === "user");
      if (firstUser) {
        const text = firstUser.parts
          .map((p) => (p.type === "text" ? p.text : ""))
          .join(" ")
          .trim()
          .slice(0, 60);
        await supabase
          .from("chat_threads")
          .update({ updated_at: new Date().toISOString(), title: text || "Nueva conversación" })
          .eq("id", threadId);
      }
    })();
  }, [messages, status, threadId]);

  // Keep textarea focused
  useEffect(() => {
    inputRef.current?.focus();
  }, [threadId, status, inputRef]);

  const submit = (msg: PromptInputMessage) => {
    const text = msg.text?.trim();
    if (!text) return;
    void sendMessage({ text });
  };

  const isLoading = status === "submitted" || status === "streaming";

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/40">
      <Conversation className="flex-1">
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState
              icon={<Sparkles className="h-6 w-6" />}
              title="Hola, soy tu asistente"
              description="Pregúntame por personas desaparecidas, centros de ayuda, consejos para sismos o números de emergencia."
            >
              <div className="mt-4 grid w-full max-w-md gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage({ text: s })}
                    className="rounded-xl border border-border/60 px-3 py-2 text-left text-sm text-foreground transition hover:bg-foreground/5"
                    type="button"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </ConversationEmptyState>
          ) : (
            messages.map((m) => {
              const text = m.parts
                .map((p) => (p.type === "text" ? p.text : ""))
                .join("");
              return (
                <Message key={m.id} from={m.role}>
                  {m.role === "assistant" ? (
                    <MessageResponse>{text || ""}</MessageResponse>
                  ) : (
                    <MessageContent>{text}</MessageContent>
                  )}
                </Message>
              );
            })
          )}
          {status === "submitted" && (
            <div className="px-2 py-1 text-sm">
              <Shimmer>Pensando…</Shimmer>
            </div>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <div className="border-t border-border/60 p-3">
        <PromptInput onSubmit={submit}>
          <PromptInputTextarea ref={inputRef} placeholder="Escribe tu pregunta…" />
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit status={status} disabled={isLoading} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
import { useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useRouterState, Link } from "@tanstack/react-router";
import { History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getVisitorId } from "@/lib/visitor";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
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
import compassAsset from "@/assets/guide-compass.png.asset.json";

const SUGGESTIONS = [
  "¿Cómo reporto a una persona desaparecida?",
  "¿Dónde veo los centros de ayuda?",
  "¿Cómo me registro como voluntario?",
  "¿Qué hago en caso de sismo?",
];

export function FloatingGuide() {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [threadId, setThreadId] = useState<string | null>(null);
  const [initialMessages, setInitialMessages] = useState<UIMessage[] | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open || threadId) return;
    let cancelled = false;
    (async () => {
      const visitorId = getVisitorId();
      const { data: existing } = await supabase
        .from("chat_threads")
        .select("id")
        .eq("visitor_id", visitorId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      let id = existing?.id as string | undefined;
      if (!id) {
        const { data: created } = await supabase
          .from("chat_threads")
          .insert({ visitor_id: visitorId, title: "Nueva conversación" })
          .select("id")
          .single();
        id = created?.id as string | undefined;
      }
      if (!id || cancelled) return;
      const { data: rows } = await supabase
        .from("chat_messages")
        .select("id, role, parts")
        .eq("thread_id", id)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      const msgs: UIMessage[] = (rows ?? []).map((r) => ({
        id: r.id as string,
        role: r.role as UIMessage["role"],
        parts: (r.parts as UIMessage["parts"]) ?? [],
      }));
      setInitialMessages(msgs);
      setThreadId(id);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, threadId]);

  if (pathname.startsWith("/asistente")) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir guía Brújula"
        className="fixed bottom-20 right-4 z-50 grid h-14 w-14 place-items-center rounded-full bg-background shadow-lg ring-1 ring-border/60 transition hover:scale-105 hover:shadow-xl md:bottom-6 md:right-6 md:h-16 md:w-16"
      >
        <img src={compassAsset.url} alt="" className="h-10 w-10 md:h-12 md:w-12" />
        <span className="absolute -top-1 -right-1 grid h-5 min-w-[32px] place-items-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground shadow-sm">
          Chat
        </span>
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-b border-border/60 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <img src={compassAsset.url} alt="" className="h-9 w-9" />
                <div className="text-left">
                  <SheetTitle className="text-base">Brújula</SheetTitle>
                  <SheetDescription className="text-xs">
                    Tu guía para usar la plataforma
                  </SheetDescription>
                </div>
              </div>
              <Link
                to="/asistente"
                onClick={() => setOpen(false)}
                className="inline-flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-foreground/5 hover:text-foreground"
                title="Historial de conversaciones"
              >
                <History className="h-3.5 w-3.5" />
                Historial
              </Link>
            </div>
          </SheetHeader>

          {threadId && initialMessages ? (
            <FloatingChat
              threadId={threadId}
              initialMessages={initialMessages}
              inputRef={inputRef}
            />
          ) : (
            <div className="grid flex-1 place-items-center text-sm text-muted-foreground">
              Preparando tu conversación…
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

function FloatingChat({
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
    onError: (e) => console.error("guide error", e),
  });

  useEffect(() => {
    if (status !== "ready") return;
    const toSave = messages.filter((m) => !persistedIds.current.has(m.id));
    if (toSave.length === 0) return;
    (async () => {
      for (const m of toSave) {
        const { error } = await supabase.from("chat_messages").insert({
          thread_id: threadId,
          role: m.role,
          parts: m.parts as unknown as never,
        });
        if (!error) persistedIds.current.add(m.id);
      }
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

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(t);
  }, [status, inputRef]);

  const isLoading = status === "submitted" || status === "streaming";

  const submit = (msg: PromptInputMessage) => {
    const text = msg.text?.trim();
    if (!text) return;
    void sendMessage({ text });
  };

  return (
    <>
      <Conversation className="flex-1">
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState
              title="Hola, soy Brújula"
              description="Te ayudo a conocer la plataforma y a usarla paso a paso. ¿Por dónde empezamos?"
            >
              <div className="mt-4 grid w-full gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => sendMessage({ text: s })}
                    className="rounded-xl border border-border/60 px-3 py-2 text-left text-sm transition hover:bg-foreground/5"
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
          <PromptInputTextarea ref={inputRef} placeholder="Pregúntame cómo usar la web…" />
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit status={status} disabled={isLoading} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </>
  );
}
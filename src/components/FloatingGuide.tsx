import { useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useRouterState } from "@tanstack/react-router";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
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
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/guide" }),
    onError: (e) => console.error("guide error", e),
  });

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open, status]);

  // Hide on the full assistant page to avoid duplication
  if (pathname.startsWith("/asistente")) return null;

  const isLoading = status === "submitted" || status === "streaming";

  const submit = (msg: PromptInputMessage) => {
    const text = msg.text?.trim();
    if (!text) return;
    void sendMessage({ text });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir guía Brújula"
        className="fixed bottom-20 right-4 z-50 grid h-14 w-14 place-items-center rounded-full bg-background shadow-lg ring-1 ring-border/60 transition hover:scale-105 hover:shadow-xl md:bottom-6 md:right-6 md:h-16 md:w-16"
      >
        <img src={compassAsset.url} alt="" className="h-10 w-10 md:h-12 md:w-12" />
        <span className="absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
          ?
        </span>
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-b border-border/60 px-4 py-3">
            <div className="flex items-center gap-3">
              <img src={compassAsset.url} alt="" className="h-9 w-9" />
              <div>
                <SheetTitle className="text-base">Brújula</SheetTitle>
                <SheetDescription className="text-xs">
                  Tu guía para usar la plataforma
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

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
        </SheetContent>
      </Sheet>
    </>
  );
}
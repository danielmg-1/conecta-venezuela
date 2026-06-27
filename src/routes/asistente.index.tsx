import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getVisitorId } from "@/lib/visitor";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/asistente/")({
  component: AsistenteIndex,
});

function AsistenteIndex() {
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const visitorId = getVisitorId();
      const { data } = await supabase
        .from("chat_threads")
        .select("id")
        .eq("visitor_id", visitorId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data?.id) {
        navigate({ to: "/asistente/$threadId", params: { threadId: data.id }, replace: true });
        return;
      }
      const { data: created } = await supabase
        .from("chat_threads")
        .insert({ visitor_id: visitorId, title: "Nueva conversación" })
        .select("id")
        .single();
      if (created?.id) {
        navigate({ to: "/asistente/$threadId", params: { threadId: created.id }, replace: true });
      }
    })();
  }, [navigate]);

  return (
    <div className="grid h-full place-items-center text-center">
      <div>
        <Sparkles className="mx-auto h-10 w-10 text-primary" />
        <p className="mt-3 text-sm text-muted-foreground">Preparando tu conversación…</p>
      </div>
    </div>
  );
}
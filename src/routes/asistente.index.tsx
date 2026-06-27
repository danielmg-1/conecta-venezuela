import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/asistente/")({
  component: AsistenteIndex,
});

function AsistenteIndex() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("chat_threads")
        .select("id")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data?.id) {
        navigate({ to: "/asistente/$threadId", params: { threadId: data.id }, replace: true });
        return;
      }
      const { data: created } = await supabase
        .from("chat_threads")
        .insert({ user_id: user.id, visitor_id: user.id, title: "Nueva conversación" })
        .select("id")
        .single();
      if (created?.id) {
        navigate({ to: "/asistente/$threadId", params: { threadId: created.id }, replace: true });
      }
    })();
  }, [navigate, user, loading]);

  return (
    <div className="grid h-full place-items-center text-center">
      <div>
        <Sparkles className="mx-auto h-10 w-10 text-primary" />
        <p className="mt-3 text-sm text-muted-foreground">
          {user ? "Preparando tu conversación…" : "Inicia sesión para guardar tu conversación. También puedes usar el chat flotante de Brújula sin cuenta."}
        </p>
      </div>
    </div>
  );
}
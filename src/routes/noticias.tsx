import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import DOMPurify from "dompurify";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/noticias")({
  head: () => ({
    meta: [
      { title: "Noticias y avisos — Guía de Apoyo Venezuela" },
      { name: "description", content: "Avisos oficiales y noticias relevantes sobre la emergencia en Venezuela." },
      { property: "og:title", content: "Noticias y avisos" },
      { property: "og:description", content: "Información verificada y actualizaciones sobre la emergencia." },
    ],
  }),
  component: Page,
});

type News = { id: string; titulo: string; contenido: string; body_html: string | null; is_html: boolean; created_at: string };

function Page() {
  const [items, setItems] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase
      .from("news")
      .select("id,titulo,contenido,body_html,is_html,created_at")
      .eq("published", true)
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setItems((data ?? []) as News[]);
        setLoading(false);
      });
  }, []);

  // After render: external links open in a new tab; first image gets fetchpriority="high".
  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.querySelectorAll<HTMLAnchorElement>("article a[href]").forEach((a) => {
      const href = a.getAttribute("href") || "";
      if (/^https?:\/\//i.test(href)) {
        a.setAttribute("target", "_blank");
        a.setAttribute("rel", "noopener noreferrer");
      }
    });
    listRef.current.querySelectorAll<HTMLElement>("article").forEach((art) => {
      const imgs = art.querySelectorAll<HTMLImageElement>("img");
      imgs.forEach((img, idx) => {
        if (idx === 0) {
          img.setAttribute("fetchpriority", "high");
          img.removeAttribute("loading");
        } else if (!img.hasAttribute("loading")) {
          img.setAttribute("loading", "lazy");
        }
        if (!img.hasAttribute("decoding")) img.setAttribute("decoding", "async");
      });
    });
  }, [items]);

  return (
    <Layout>
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Noticias y avisos</h1>
      <p className="mt-1 text-muted-foreground">Publicaciones oficiales del equipo de la plataforma.</p>

      <div ref={listRef} className="mt-8 space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : items.length === 0 ? (
          <p className="rounded-3xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            Aún no hay noticias publicadas.
          </p>
        ) : (
          items.map((n) => (
            <article key={n.id} className="rounded-3xl border border-border bg-card p-6">
              <time className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString("es-VE")}</time>
              <h2 className="mt-1 text-2xl font-semibold">{n.titulo}</h2>
              {n.is_html && n.body_html ? (
                <div
                  className="mt-3 text-sm leading-relaxed text-foreground/90 [&_a]:text-primary [&_a]:underline [&_h2]:mt-4 [&_h2]:text-2xl [&_h2]:font-bold [&_h3]:mt-3 [&_h3]:text-xl [&_h3]:font-semibold [&_img]:my-3 [&_img]:rounded-lg [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-2 [&_blockquote]:border-l-4 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:italic"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(n.body_html, {
                    ALLOWED_TAGS: ["h1","h2","h3","h4","p","br","strong","em","b","i","u","ul","ol","li","a","img","blockquote","figure","figcaption","span","div","hr","code","pre"],
                    ALLOWED_ATTR: ["href","target","rel","src","alt","title","class","style","data-size","data-align","loading","decoding","width","height","fetchpriority"],
                    ALLOWED_URI_REGEXP: /^(https?:|mailto:|tel:|\/)/i,
                    ADD_ATTR: ["target"],
                  }) }}
                />
              ) : (
                <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{n.contenido}</div>
              )}
            </article>
          ))
        )}
      </div>
    </Layout>
  );
}
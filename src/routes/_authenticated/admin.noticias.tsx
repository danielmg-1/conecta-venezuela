import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import DOMPurify from "dompurify";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useCanModerate } from "@/hooks/use-moderator-permissions";
import { Trash2, Bold, Italic, Heading2, Heading3, Link as LinkIcon, Image as ImageIcon, List, Eye, Pencil } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/noticias")({
  component: Page,
});

type News = { id: string; titulo: string; contenido: string; body_html: string | null; is_html: boolean; published: boolean; created_at: string };

const SIGNED_TTL = 60 * 60 * 24 * 365 * 10; // 10 years

async function signedNewsImage(path: string) {
  const { data } = await supabase.storage.from("news-images").createSignedUrl(path, SIGNED_TTL);
  return data?.signedUrl ?? null;
}

function Page() {
  const { user } = useAuth();
  const { allowed: isAdmin } = useCanModerate(user?.id, "noticias");
  const [items, setItems] = useState<News[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [richMode, setRichMode] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [plainContent, setPlainContent] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function refresh() {
    const { data } = await supabase.from("news").select("id,titulo,contenido,body_html,is_html,published,created_at").order("created_at", { ascending: false }).limit(100);
    setItems((data ?? []) as News[]);
  }

  useEffect(() => { if (isAdmin) refresh(); }, [isAdmin]);

  function exec(cmd: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(cmd, false, value);
    syncHtml();
  }

  function syncHtml() {
    if (editorRef.current) setHtmlContent(editorRef.current.innerHTML);
  }

  function insertLink() {
    const url = prompt("URL del enlace (https://...)");
    if (!url) return;
    exec("createLink", url);
  }

  async function handleImageUpload(file: File) {
    if (!user) return;
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("news-images").upload(path, file, { upsert: false, contentType: file.type || "image/jpeg" });
    if (upErr) { setError(upErr.message); return; }
    const url = await signedNewsImage(path);
    if (!url) return;
    editorRef.current?.focus();
    document.execCommand("insertImage", false, url);
    syncHtml();
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setSubmitting(true);
    try {
      const cleanHtml = richMode ? DOMPurify.sanitize(htmlContent, {
        ALLOWED_TAGS: ["h1","h2","h3","h4","p","br","strong","em","b","i","u","ul","ol","li","a","img","blockquote","figure","figcaption","span","div","hr","code","pre"],
        ALLOWED_ATTR: ["href","target","rel","src","alt","title","class","style"],
        ALLOWED_URI_REGEXP: /^(https?:|mailto:|tel:|\/)/i,
      }) : null;
      const plainFromHtml = richMode ? (editorRef.current?.innerText?.trim() ?? "") : plainContent.trim();
      if (!titulo.trim() || !plainFromHtml) throw new Error("Título y contenido son obligatorios");
      const { error: insErr } = await supabase.from("news").insert({
        author_id: user.id,
        titulo: titulo.trim(),
        contenido: plainFromHtml.slice(0, 5000),
        body_html: cleanHtml,
        is_html: richMode,
        published: true,
      });
      if (insErr) throw insErr;
      setTitulo("");
      setPlainContent("");
      setHtmlContent("");
      if (editorRef.current) editorRef.current.innerHTML = "";
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSubmitting(false);
    }
  }

  async function togglePublish(n: News) {
    await supabase.from("news").update({ published: !n.published }).eq("id", n.id);
    refresh();
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar esta noticia?")) return;
    await supabase.from("news").delete().eq("id", id);
    refresh();
  }

  if (!isAdmin) {
    return <Layout><p className="rounded-3xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">No tienes permiso para gestionar noticias.</p></Layout>;
  }

  return (
    <Layout>
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Noticias — Admin</h1>

      <form onSubmit={onSubmit} className="mt-6 grid gap-4 rounded-3xl border border-border bg-card p-6">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium">Modo de redacción</span>
          <button type="button" onClick={() => { setRichMode((v) => !v); setShowPreview(false); }} className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${richMode ? "border-primary bg-primary/10 text-primary" : "border-input"}`}>
            {richMode ? "✓ Editor enriquecido (HTML)" : "Texto plano"}
          </button>
        </div>

        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">Título *</span>
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} required className="rounded-xl border border-input bg-background px-3 py-2.5 text-lg font-semibold" placeholder="Un título claro y directo" />
        </label>

        {!richMode && (
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Contenido *</span>
            <textarea value={plainContent} onChange={(e) => setPlainContent(e.target.value)} required rows={6} className="rounded-xl border border-input bg-background px-3 py-2.5" placeholder="Escribe la noticia…" />
          </label>
        )}

        {richMode && (
          <div className="grid gap-2">
            <div className="flex flex-wrap items-center gap-1 rounded-xl border border-input bg-background p-1">
              <ToolbarBtn onClick={() => exec("bold")} title="Negrita"><Bold className="h-4 w-4" /></ToolbarBtn>
              <ToolbarBtn onClick={() => exec("italic")} title="Cursiva"><Italic className="h-4 w-4" /></ToolbarBtn>
              <span className="mx-1 h-5 w-px bg-border" />
              <ToolbarBtn onClick={() => exec("formatBlock", "<h2>")} title="Título"><Heading2 className="h-4 w-4" /></ToolbarBtn>
              <ToolbarBtn onClick={() => exec("formatBlock", "<h3>")} title="Subtítulo"><Heading3 className="h-4 w-4" /></ToolbarBtn>
              <ToolbarBtn onClick={() => exec("formatBlock", "<p>")} title="Párrafo">¶</ToolbarBtn>
              <span className="mx-1 h-5 w-px bg-border" />
              <ToolbarBtn onClick={() => exec("insertUnorderedList")} title="Lista"><List className="h-4 w-4" /></ToolbarBtn>
              <ToolbarBtn onClick={insertLink} title="Enlace externo"><LinkIcon className="h-4 w-4" /></ToolbarBtn>
              <ToolbarBtn onClick={() => fileRef.current?.click()} title="Insertar imagen"><ImageIcon className="h-4 w-4" /></ToolbarBtn>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); e.target.value = ""; }} />
              <span className="ml-auto" />
              <ToolbarBtn onClick={() => setShowPreview((v) => !v)} title={showPreview ? "Editar" : "Vista previa"}>
                {showPreview ? <Pencil className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </ToolbarBtn>
            </div>
            {!showPreview ? (
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={syncHtml}
                onBlur={syncHtml}
                className="prose prose-sm dark:prose-invert min-h-[240px] max-w-none rounded-xl border border-input bg-background p-4 focus:outline-none [&_a]:text-primary [&_a]:underline [&_h2]:mt-3 [&_h2]:text-2xl [&_h2]:font-bold [&_h3]:mt-2 [&_h3]:text-xl [&_h3]:font-semibold [&_img]:my-3 [&_img]:rounded-lg [&_ul]:list-disc [&_ul]:pl-6 [&_p]:my-2"
              />
            ) : (
              <div className="min-h-[240px] rounded-xl border border-dashed border-input bg-muted/30 p-4 [&_a]:text-primary [&_a]:underline [&_h2]:mt-3 [&_h2]:text-2xl [&_h2]:font-bold [&_h3]:mt-2 [&_h3]:text-xl [&_h3]:font-semibold [&_img]:my-3 [&_img]:rounded-lg [&_ul]:list-disc [&_ul]:pl-6 [&_p]:my-2" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(htmlContent) }} />
            )}
            <p className="text-xs text-muted-foreground">Activa el modo HTML para insertar títulos, subtítulos, listas, imágenes y enlaces externos. La barra de herramientas aplica el formato a lo seleccionado.</p>
          </div>
        )}

        {error && <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
        <button disabled={submitting} className="inline-flex items-center justify-center self-start rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">
          {submitting ? "Publicando…" : "Publicar noticia"}
        </button>
      </form>

      <h2 className="mt-10 text-xl font-semibold">Publicadas</h2>
      <div className="mt-4 space-y-3">
        {items.map((n) => (
          <article key={n.id} className="flex items-start justify-between gap-4 rounded-3xl border border-border bg-card p-5">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString("es-VE")}{!n.published && " · oculta"}{n.is_html && " · HTML"}</p>
              <h3 className="font-semibold">{n.titulo}</h3>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{n.contenido}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button onClick={() => togglePublish(n)} className="rounded-full border border-input px-3 py-1.5 text-xs font-medium">
                {n.published ? "Ocultar" : "Publicar"}
              </button>
              <button onClick={() => remove(n.id)} className="rounded-full border border-destructive/30 px-2.5 py-1.5 text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </article>
        ))}
      </div>
    </Layout>
  );
}
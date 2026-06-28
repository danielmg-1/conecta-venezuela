import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import DOMPurify from "dompurify";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useCanModerate } from "@/hooks/use-moderator-permissions";
import { Trash2, Bold, Italic, Heading2, Heading3, Link as LinkIcon, Image as ImageIcon, List, Eye, Pencil, AlignLeft, AlignCenter, AlignRight, X } from "lucide-react";
import { optimizeImage } from "@/lib/image-optimize";

export const Route = createFileRoute("/_authenticated/admin/noticias")({
  component: Page,
});

type News = { id: string; titulo: string; contenido: string; body_html: string | null; is_html: boolean; published: boolean; created_at: string };

const SIGNED_TTL = 60 * 60 * 24 * 365 * 10; // 10 years

function ToolbarBtn({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={onClick} title={title} className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm hover:bg-muted">
      {children}
    </button>
  );
}

async function signedNewsImage(path: string) {
  const { data } = await supabase.storage.from("news-images").createSignedUrl(path, SIGNED_TTL);
  return data?.signedUrl ?? null;
}

const SIZE_PX: Record<string, string> = {
  small: "240px",
  medium: "480px",
  large: "720px",
  full: "100%",
};

function applyFigureStyle(fig: HTMLElement) {
  const size = fig.dataset.size || "medium";
  const align = fig.dataset.align || "center";
  fig.style.maxWidth = SIZE_PX[size] ?? SIZE_PX.medium;
  fig.style.marginTop = "0.75rem";
  fig.style.marginBottom = "0.75rem";
  fig.style.display = "block";
  if (align === "left") { fig.style.marginLeft = "0"; fig.style.marginRight = "auto"; }
  else if (align === "right") { fig.style.marginLeft = "auto"; fig.style.marginRight = "0"; }
  else { fig.style.marginLeft = "auto"; fig.style.marginRight = "auto"; }
  const img = fig.querySelector("img");
  if (img) {
    img.style.width = "100%";
    img.style.height = "auto";
    img.style.borderRadius = "0.5rem";
    img.setAttribute("loading", "lazy");
    img.setAttribute("decoding", "async");
  }
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
  const [uploadingImg, setUploadingImg] = useState(false);
  const [selectedFigure, setSelectedFigure] = useState<HTMLElement | null>(null);
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
    editorRef.current?.focus();
    document.execCommand("createLink", false, url);
    // Apply target=_blank to the newly created link(s)
    if (editorRef.current) {
      editorRef.current.querySelectorAll(`a[href="${url}"]`).forEach((a) => {
        a.setAttribute("target", "_blank");
        a.setAttribute("rel", "noopener noreferrer");
      });
    }
    syncHtml();
  }

  async function handleImageUpload(file: File) {
    if (!user) return;
    setUploadingImg(true);
    try {
      const { file: optimized } = await optimizeImage(file, { maxDim: 1600, quality: 0.82 });
      const ext = optimized.name.split(".").pop()?.toLowerCase() || "webp";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("news-images").upload(path, optimized, {
        upsert: false,
        contentType: optimized.type || "image/webp",
        cacheControl: "31536000",
      });
      if (upErr) { setError(upErr.message); return; }
      const url = await signedNewsImage(path);
      if (!url) return;
      const alt = (prompt("Texto alternativo (alt) — describe la imagen para SEO y accesibilidad. Déjalo vacío si es decorativa.") || "").trim();
      const ed = editorRef.current;
      if (!ed) return;
      ed.focus();
      const fig = document.createElement("figure");
      fig.dataset.size = "medium";
      fig.dataset.align = "center";
      const img = document.createElement("img");
      img.src = url;
      img.alt = alt;
      fig.appendChild(img);
      applyFigureStyle(fig);
      // Insert at caret
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && ed.contains(sel.anchorNode)) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        range.insertNode(fig);
        // Move caret after the figure
        range.setStartAfter(fig);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      } else {
        ed.appendChild(fig);
      }
      syncHtml();
    } finally {
      setUploadingImg(false);
    }
  }

  function onEditorClick(e: React.MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;
    const fig = target.closest("figure") as HTMLElement | null;
    setSelectedFigure(fig && editorRef.current?.contains(fig) ? fig : null);
  }

  function updateFigure(mut: (f: HTMLElement) => void) {
    if (!selectedFigure) return;
    mut(selectedFigure);
    applyFigureStyle(selectedFigure);
    syncHtml();
    // Force re-render of toolbar position
    setSelectedFigure(selectedFigure);
  }

  function setSize(s: string) { updateFigure((f) => { f.dataset.size = s; }); }
  function setAlign(a: string) { updateFigure((f) => { f.dataset.align = a; }); }
  function setAlt() {
    if (!selectedFigure) return;
    const img = selectedFigure.querySelector("img");
    if (!img) return;
    const next = prompt("Texto alternativo (alt)", img.alt || "");
    if (next === null) return;
    img.alt = next.trim();
    syncHtml();
  }
  function removeFigure() {
    if (!selectedFigure) return;
    selectedFigure.remove();
    setSelectedFigure(null);
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
        ALLOWED_ATTR: ["href","target","rel","src","alt","title","class","style","data-size","data-align","loading","decoding","width","height"],
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
              <ToolbarBtn onClick={insertLink} title="Enlace externo (abre en nueva pestaña)"><LinkIcon className="h-4 w-4" /></ToolbarBtn>
              <ToolbarBtn onClick={() => fileRef.current?.click()} title="Insertar imagen (se optimiza automáticamente)">
                {uploadingImg ? <span className="text-xs">…</span> : <ImageIcon className="h-4 w-4" />}
              </ToolbarBtn>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); e.target.value = ""; }} />
              <span className="ml-auto" />
              <ToolbarBtn onClick={() => setShowPreview((v) => !v)} title={showPreview ? "Editar" : "Vista previa"}>
                {showPreview ? <Pencil className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </ToolbarBtn>
            </div>
            {selectedFigure && !showPreview && (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/40 bg-primary/5 p-2 text-xs">
                <span className="font-medium text-primary">Imagen seleccionada:</span>
                <div className="flex items-center gap-1 rounded-lg border border-input bg-background p-0.5">
                  {[
                    { v: "small", l: "S" },
                    { v: "medium", l: "M" },
                    { v: "large", l: "L" },
                    { v: "full", l: "Full" },
                  ].map((s) => (
                    <button
                      key={s.v}
                      type="button"
                      onClick={() => setSize(s.v)}
                      className={`rounded-md px-2 py-1 font-medium ${selectedFigure.dataset.size === s.v ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                    >{s.l}</button>
                  ))}
                </div>
                <div className="flex items-center gap-1 rounded-lg border border-input bg-background p-0.5">
                  <button type="button" onClick={() => setAlign("left")} title="Izquierda" className={`rounded-md p-1 ${selectedFigure.dataset.align === "left" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}><AlignLeft className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => setAlign("center")} title="Centro" className={`rounded-md p-1 ${(selectedFigure.dataset.align || "center") === "center" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}><AlignCenter className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => setAlign("right")} title="Derecha" className={`rounded-md p-1 ${selectedFigure.dataset.align === "right" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}><AlignRight className="h-3.5 w-3.5" /></button>
                </div>
                <button type="button" onClick={setAlt} className="rounded-lg border border-input bg-background px-2 py-1 hover:bg-muted">Editar alt</button>
                <button type="button" onClick={removeFigure} className="ml-auto inline-flex items-center gap-1 rounded-lg border border-destructive/30 px-2 py-1 text-destructive hover:bg-destructive/10">
                  <X className="h-3 w-3" /> Quitar
                </button>
              </div>
            )}
            {!showPreview ? (
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={syncHtml}
                onBlur={syncHtml}
                onClick={onEditorClick}
                className="prose prose-sm dark:prose-invert min-h-[240px] max-w-none rounded-xl border border-input bg-background p-4 focus:outline-none [&_a]:text-primary [&_a]:underline [&_h2]:mt-3 [&_h2]:text-2xl [&_h2]:font-bold [&_h3]:mt-2 [&_h3]:text-xl [&_h3]:font-semibold [&_img]:my-3 [&_img]:rounded-lg [&_ul]:list-disc [&_ul]:pl-6 [&_p]:my-2"
              />
            ) : (
              <div className="min-h-[240px] rounded-xl border border-dashed border-input bg-muted/30 p-4 [&_a]:text-primary [&_a]:underline [&_h2]:mt-3 [&_h2]:text-2xl [&_h2]:font-bold [&_h3]:mt-2 [&_h3]:text-xl [&_h3]:font-semibold [&_img]:my-3 [&_img]:rounded-lg [&_ul]:list-disc [&_ul]:pl-6 [&_p]:my-2" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(htmlContent) }} />
            )}
            <p className="text-xs text-muted-foreground">
              Las imágenes se comprimen automáticamente para que carguen rápido. <strong>Haz clic sobre una imagen</strong> para cambiar su tamaño, alineación o texto alternativo. Los enlaces externos abren en una pestaña nueva.
            </p>
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
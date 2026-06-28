import DOMPurify from "dompurify";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export const NEWS_ALLOWED_TAGS = [
  "h1","h2","h3","h4","p","br","strong","em","b","i","u","ul","ol","li","a","img","blockquote","figure","figcaption","span","div","hr","code","pre",
  "table","thead","tbody","tfoot","tr","th","td","caption","colgroup","col",
];
export const NEWS_ALLOWED_ATTR = [
  "href","target","rel","src","alt","title","class","style","data-size","data-align","loading","decoding","width","height","fetchpriority",
  "colspan","rowspan","align","valign","scope","span",
];
export const NEWS_URI_REGEXP = /^(https?:|mailto:|tel:|\/)/i;

export const NEWS_PROSE_CLASS = "prose prose-sm dark:prose-invert max-w-none [&_a]:text-primary [&_a]:underline [&_h2]:mt-4 [&_h2]:text-2xl [&_h2]:font-bold [&_h3]:mt-3 [&_h3]:text-xl [&_h3]:font-semibold [&_img]:my-3 [&_img]:rounded-lg [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-2 [&_blockquote]:border-l-4 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:italic [&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm [&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2";

export function sanitizeNewsHtml(html: string) {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: NEWS_ALLOWED_TAGS,
    ALLOWED_ATTR: NEWS_ALLOWED_ATTR,
    ALLOWED_URI_REGEXP: NEWS_URI_REGEXP,
    ADD_ATTR: ["target"],
  });
}

export function NewsArticlePreview({ titulo, html, plain, isHtml, date }: { titulo: string; html?: string | null; plain?: string; isHtml: boolean; date?: Date }) {
  return (
    <article className="rounded-3xl border border-border bg-card p-6 md:p-8">
      <time className="text-xs text-muted-foreground">{(date ?? new Date()).toLocaleString("es-VE")}</time>
      <h1 className="mt-1 text-3xl font-bold tracking-tight md:text-4xl">{titulo || "(Sin título)"}</h1>
      {isHtml && html ? (
        <div className={`mt-4 ${NEWS_PROSE_CLASS}`} dangerouslySetInnerHTML={{ __html: sanitizeNewsHtml(html) }} />
      ) : (
        <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{plain || ""}</div>
      )}
    </article>
  );
}

export function NewsPreviewDialog({ open, onOpenChange, titulo, html, plain, isHtml }: { open: boolean; onOpenChange: (v: boolean) => void; titulo: string; html?: string | null; plain?: string; isHtml: boolean }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[95vh] w-[95vw] max-w-4xl overflow-y-auto sm:rounded-3xl">
        <DialogTitle className="sr-only">Vista previa de la noticia</DialogTitle>
        <DialogDescription className="sr-only">Así se verá publicada</DialogDescription>
        <NewsArticlePreview titulo={titulo} html={html} plain={plain} isHtml={isHtml} />
      </DialogContent>
    </Dialog>
  );
}
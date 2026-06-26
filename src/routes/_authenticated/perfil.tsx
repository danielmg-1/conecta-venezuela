import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useIsAdmin } from "@/hooks/use-auth";
import { Photo } from "@/components/Photo";
import { uploadMissingPhoto } from "@/lib/photo";
import { toast } from "sonner";
import { Camera, FileText, HeartHandshake, Users, LogOut, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/perfil")({
  component: Page,
});

type Profile = { id: string; full_name: string | null; avatar_url: string | null; phone: string | null; bio: string | null };

function Page() {
  const { user } = useAuth();
  const isAdmin = useIsAdmin(user?.id);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [counts, setCounts] = useState({ reports: 0, aid: 0, volunteer: false });
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("profiles").select("id,full_name,avatar_url,phone,bio").eq("id", user.id).maybeSingle();
      const p = (data as Profile | null) ?? { id: user.id, full_name: "", avatar_url: null, phone: "", bio: "" };
      setProfile(p);
      setFullName(p.full_name ?? "");
      setPhone(p.phone ?? "");
      setBio(p.bio ?? "");

      const [{ count: reports }, { count: aid }, { data: vol }] = await Promise.all([
        supabase.from("missing_persons").select("id", { count: "exact", head: true }).eq("reporter_id", user.id),
        supabase.from("aid_points").select("id", { count: "exact", head: true }).eq("owner_id", user.id),
        supabase.from("volunteers").select("id").eq("user_id", user.id).maybeSingle(),
      ]);
      setCounts({ reports: reports ?? 0, aid: aid ?? 0, volunteer: !!vol });
    })();
  }, [user]);

  async function save() {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      full_name: fullName.trim() || null,
      phone: phone.trim() || null,
      bio: bio.trim() || null,
    });
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Perfil actualizado");
  }

  async function onAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen debe pesar menos de 5 MB");
      return;
    }
    setUploading(true);
    try {
      const path = await uploadMissingPhoto(user.id, file);
      const { error } = await supabase.from("profiles").upsert({ id: user.id, avatar_url: path });
      if (error) throw error;
      setProfile((p) => (p ? { ...p, avatar_url: path } : p));
      toast.success("Foto actualizada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al subir foto");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  if (!profile) {
    return (
      <Layout>
        <p className="mt-10 text-muted-foreground">Cargando…</p>
      </Layout>
    );
  }

  return (
    <Layout>
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Mi perfil</h1>
      <p className="mt-2 text-muted-foreground">Edita tu información y accede a todas tus publicaciones.</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        {/* Card: identity */}
        <section className="rounded-3xl border border-border bg-card p-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              {profile.avatar_url ? (
                <Photo path={profile.avatar_url} alt={fullName} className="h-20 w-20 rounded-full object-cover" />
              ) : (
                <div className="grid h-20 w-20 place-items-center rounded-full bg-muted text-2xl font-semibold text-muted-foreground">
                  {(fullName || user?.email || "?").charAt(0).toUpperCase()}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full bg-foreground text-background shadow-md disabled:opacity-50"
                aria-label="Cambiar foto"
              >
                <Camera className="h-4 w-4" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onAvatar} />
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold">{fullName || "Sin nombre"}</p>
              <p className="truncate text-sm text-muted-foreground">{user?.email}</p>
              {isAdmin && (
                <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  <ShieldCheck className="h-3 w-3" /> Administrador
                </span>
              )}
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <Field label="Nombre completo">
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={100} className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-foreground" />
            </Field>
            <Field label="Teléfono de contacto">
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+58 412 0000000" maxLength={30} className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-foreground" />
            </Field>
            <Field label="Sobre mí">
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} maxLength={300} placeholder="Cómo puedes ayudar o por qué estás aquí" className="w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-foreground" />
            </Field>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="w-full rounded-full bg-foreground py-3 text-sm font-semibold text-background disabled:opacity-60"
            >
              {saving ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </section>

        {/* Card: shortcuts */}
        <section className="space-y-4">
          <ShortcutCard
            to="/mis-reportes"
            icon={<FileText className="h-5 w-5" />}
            title="Mis reportes de desaparecidos"
            description={`${counts.reports} ${counts.reports === 1 ? "publicación" : "publicaciones"}`}
            cta="Ver y gestionar"
          />
          <ShortcutCard
            to="/centros-acopio/nuevo"
            icon={<HeartHandshake className="h-5 w-5" />}
            title="Centros y puntos de ayuda"
            description={`${counts.aid} ${counts.aid === 1 ? "punto publicado" : "puntos publicados"}`}
            cta="Publicar nuevo"
          />
          <ShortcutCard
            to="/voluntarios/registrarme"
            icon={<Users className="h-5 w-5" />}
            title="Perfil de voluntario"
            description={counts.volunteer ? "Perfil activo" : "Aún no te has registrado"}
            cta={counts.volunteer ? "Editar perfil" : "Registrarme"}
          />

          <button
            type="button"
            onClick={signOut}
            className="flex w-full items-center justify-center gap-2 rounded-3xl border border-border bg-card py-4 text-sm font-semibold text-destructive hover:bg-destructive/5"
          >
            <LogOut className="h-4 w-4" /> Cerrar sesión
          </button>
        </section>
      </div>
    </Layout>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function ShortcutCard({ to, icon, title, description, cta }: { to: string; icon: React.ReactNode; title: string; description: string; cta: string }) {
  return (
    <Link to={to} className="flex items-center gap-4 rounded-3xl border border-border bg-card p-5 transition-shadow hover:shadow-md">
      <span className="grid h-11 w-11 flex-none place-items-center rounded-2xl bg-muted text-foreground">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{description}</p>
      </div>
      <span className="rounded-full bg-foreground px-3 py-1.5 text-xs font-semibold text-background">{cta}</span>
    </Link>
  );
}
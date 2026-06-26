import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: AuthPage,
});

function AuthPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) router.navigate({ to: "/mis-reportes" });
  }, [user, router]);

  async function googleSignIn() {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/mis-reportes" },
    });
    if (error) setError(error.message);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setInfo(null); setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: name }, emailRedirectTo: window.location.origin + "/mis-reportes" },
        });
        if (error) throw error;
        setInfo("Cuenta creada. Revisa tu correo si pide confirmación.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally { setBusy(false); }
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  if (loading) return <Layout><p className="py-20 text-center text-sm text-muted-foreground">Cargando…</p></Layout>;

  if (user) {
    return (
      <Layout>
        <div className="mx-auto max-w-md rounded-3xl border border-border bg-card p-8 text-center">
          <h1 className="text-2xl font-bold">Sesión iniciada</h1>
          <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
          <button onClick={signOut} className="mt-6 rounded-full border border-input px-5 py-2.5 text-sm font-medium">Cerrar sesión</button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto max-w-md">
        <h1 className="text-3xl font-bold tracking-tight">{mode === "signin" ? "Iniciar sesión" : "Crear cuenta"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Necesitas una cuenta para publicar reportes y dar seguimiento.</p>

        <button onClick={googleSignIn} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full border border-input bg-background px-5 py-3 text-sm font-medium hover:bg-muted">
          <GoogleIcon /> Continuar con Google
        </button>

        <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> o con correo <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={onSubmit} className="grid gap-3">
          {mode === "signup" && (
            <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Nombre completo" className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm" />
          )}
          <input value={email} onChange={(e) => setEmail(e.target.value)} required type="email" placeholder="Correo" className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm" />
          <input value={password} onChange={(e) => setPassword(e.target.value)} required type="password" minLength={6} placeholder="Contraseña" className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm" />
          {error && <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
          {info && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{info}</p>}
          <button disabled={busy} className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">
            {busy ? "…" : mode === "signin" ? "Entrar" : "Crear cuenta"}
          </button>
        </form>

        <button type="button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground">
          {mode === "signin" ? "¿No tienes cuenta? Crea una" : "¿Ya tienes cuenta? Inicia sesión"}
        </button>
      </div>
    </Layout>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.47 1.18 4.93l3.66-2.83z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
  );
}
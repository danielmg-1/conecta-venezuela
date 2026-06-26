import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Search, Map, Phone, User, HeartHandshake, Users, Newspaper } from "lucide-react";
import { useAuth, useIsAdmin } from "@/hooks/use-auth";
import type { ReactNode } from "react";

const baseNav = [
  { to: "/", label: "Inicio", icon: Home },
  { to: "/desaparecidos", label: "Buscar", icon: Search },
  { to: "/mapa", label: "Mapa", icon: Map },
  { to: "/centros-acopio", label: "Ayuda", icon: HeartHandshake },
] as const;

const secondaryNav = [
  { to: "/voluntarios", label: "Voluntarios", icon: Users },
  { to: "/emergencias", label: "Emergencias", icon: Phone },
  { to: "/noticias", label: "Noticias", icon: Newspaper },
] as const;

export function Layout({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useAuth();
  const isAdmin = useIsAdmin(user?.id);
  const accountItem = user
    ? { to: "/perfil" as const, label: "Perfil", icon: User }
    : { to: "/auth" as const, label: "Cuenta", icon: User };
  const navItems = [...baseNav, accountItem];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Desktop / tablet header */}
      <header className="sticky top-0 z-40 hidden border-b border-border/60 bg-background/80 backdrop-blur-xl md:block">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-2xl bg-primary text-primary-foreground font-bold">G</span>
            <span className="text-lg font-semibold tracking-tight">Guía de Apoyo Venezuela</span>
          </Link>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    active ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            {secondaryNav.map((item) => {
              const active = pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    active ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            {user && (
              <Link to="/perfil" className={`rounded-full px-4 py-2 text-sm font-medium ${pathname.startsWith("/perfil") ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}>
                Mi perfil
              </Link>
            )}
            {isAdmin && (
              <Link to="/admin" className={`rounded-full px-4 py-2 text-sm font-medium ${pathname.startsWith("/admin") ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}>
                Admin
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur-xl md:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary text-primary-foreground text-sm font-bold">G</span>
            <span className="text-sm font-semibold tracking-tight">Guía de Apoyo VE</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-6 md:px-6 md:pb-12">{children}</main>

      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur-xl md:hidden">
        <div className="grid grid-cols-5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center gap-1 py-2 text-[11px] font-medium ${
                  active ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
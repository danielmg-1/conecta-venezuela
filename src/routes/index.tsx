import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Layout } from "@/components/Layout";
import { Search, Map, Phone, AlertCircle, MessageSquare, HeartHandshake, Users, Newspaper } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Guía de Apoyo Venezuela — Personas desaparecidas y ayuda tras el terremoto" },
      { name: "description", content: "Reporta y busca personas desaparecidas tras el terremoto en Venezuela. Mapa interactivo, contactos de emergencia y red de apoyo ciudadana." },
      { property: "og:title", content: "Guía de Apoyo Venezuela" },
      { property: "og:description", content: "Reporta, busca y ayuda a localizar personas desaparecidas tras el terremoto en Venezuela." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <Layout>
      {/* Hero */}
      <section className="rounded-3xl bg-gradient-to-br from-primary to-primary/80 px-6 py-14 text-primary-foreground shadow-sm md:px-12 md:py-20">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
          <AlertCircle className="h-3.5 w-3.5" />
          Emergencia activa — Venezuela
        </span>
        <h1 className="mt-5 max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">
          Buscamos juntos a las personas desaparecidas.
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-primary-foreground/85 md:text-xl">
          Plataforma ciudadana para reportar y localizar familiares y amigos tras el terremoto. Reportes públicos, mapa en vivo y números de emergencia, en un solo lugar.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/desaparecidos" className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-primary shadow hover:bg-white/95">
            Buscar personas
          </Link>
          <Link to="/desaparecidos/nuevo" className="rounded-full border border-white/40 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10">
            Publicar reporte
          </Link>
        </div>
      </section>

      {/* Feature grid */}
      <section className="mt-10 grid gap-4 md:grid-cols-3">
        <FeatureCard
          icon={<Search className="h-5 w-5" />}
          title="Buscador con filtros"
          desc="Encuentra por nombre, cédula, fecha de nacimiento o estado. Comparte el enlace con tus filtros."
          to="/desaparecidos"
        />
        <FeatureCard
          icon={<Map className="h-5 w-5" />}
          title="Mapa en vivo"
          desc="Visualiza las zonas más afectadas según los reportes. Pines por estado de búsqueda."
          to="/mapa"
        />
        <FeatureCard
          icon={<Phone className="h-5 w-5" />}
          title="Emergencias"
          desc="Números oficiales: bomberos, Protección Civil, Cruz Roja, primeros auxilios psicológicos."
          to="/emergencias"
        />
        <FeatureCard
          icon={<HeartHandshake className="h-5 w-5" />}
          title="Centros de ayuda"
          desc="Centros de acopio, puntos de recaudación, hospitales y servicios activos en cada estado."
          to="/centros-acopio"
        />
        <FeatureCard
          icon={<Users className="h-5 w-5" />}
          title="Voluntarios"
          desc="Profesionales y voluntarios listos para ayudar — médicos, psicólogos, ingenieros, conductores."
          to="/voluntarios"
        />
        <FeatureCard
          icon={<Newspaper className="h-5 w-5" />}
          title="Noticias y avisos"
          desc="Información verificada y actualizaciones del equipo de la plataforma."
          to="/noticias"
        />
      </section>

      {/* How it works */}
      <section className="mt-12 rounded-3xl border border-border bg-card p-6 md:p-10">
        <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Cómo funciona</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          <Step n={1} title="Crea un reporte" desc="Sube foto, datos básicos y al menos un método de contacto (máximo 4). Sin formularios complicados." />
          <Step n={2} title="Comparte el enlace" desc="Cada reporte tiene su página pública con su URL para compartir por WhatsApp y redes." />
          <Step n={3} title="Recibe pistas" desc="Cualquier persona puede enviarte información. Tú actualizas el estado: en búsqueda o encontrado." />
        </div>
      </section>

      <section className="mt-10 rounded-3xl bg-foreground p-8 text-background md:p-12">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <h3 className="text-xl font-semibold md:text-2xl">¿Tienes información de alguien?</h3>
            <p className="mt-1 text-background/70">Envía una pista anónima desde la página de la persona.</p>
          </div>
          <Link to="/desaparecidos" className="inline-flex items-center gap-2 rounded-full bg-secondary px-5 py-3 text-sm font-semibold text-secondary-foreground hover:opacity-90">
            <MessageSquare className="h-4 w-4" /> Ver reportes
          </Link>
        </div>
      </section>

      <footer className="mt-12 border-t border-border pt-6 text-center text-xs text-muted-foreground">
        Iniciativa ciudadana. Esta plataforma no sustituye a las autoridades. Llama al 911 ante una emergencia.
      </footer>
    </Layout>
  );
}

function FeatureCard({ icon, title, desc, to }: { icon: React.ReactNode; title: string; desc: string; to: string }) {
  return (
    <Link to={to} className="group rounded-3xl border border-border bg-card p-6 transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">{icon}</div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </Link>
  );
}

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div>
      <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">{n}</span>
      <h4 className="mt-3 font-semibold">{title}</h4>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Layout } from "@/components/Layout";
import { Search, Map, Phone, AlertCircle, MessageSquare, HeartHandshake, Users, Newspaper, Clock, Building2, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Conecta Venezuela — Ayuda organizada para Venezuela tras el terremoto" },
      { name: "description", content: "Plataforma ciudadana para conectar afectados, donantes, centros de acopio y voluntarios. Ayuda de corto, mediano y largo plazo tras el terremoto en Venezuela." },
      { property: "og:title", content: "Conecta Venezuela" },
      { property: "og:description", content: "Conectamos a quienes necesitan ayuda con quienes pueden ofrecerla. Centros de acopio, donaciones, búsqueda de personas y voluntarios." },
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
          <Clock className="h-3.5 w-3.5" />
          Ayuda sostenida — semanas y meses
        </span>
        <h1 className="mt-5 max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">
          Organizemos la ayuda para Venezuela.
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-primary-foreground/85 md:text-xl">
          Esta no es una emergencia de un fin de semana. La magnitud de esta catástrofe nos necesitará durante semanas e incluso meses. Conecta Venezuela une a afectados, donantes, centros de acopio, voluntarios e instituciones en un solo lugar para que la ayuda llegue de forma organizada y llegue a quien más la necesita.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/centros-acopio" className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-primary shadow hover:bg-white/95">
            Ver centros de ayuda
          </Link>
          <Link to="/desaparecidos" className="rounded-full border border-white/40 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10">
            Buscar personas
          </Link>
        </div>
      </section>

      {/* Mission statement */}
      <section className="mt-10 rounded-3xl border border-border bg-card p-6 md:p-10">
        <div className="grid gap-8 md:grid-cols-2 md:items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Una plataforma para el corto, mediano y largo plazo</h2>
            <p className="mt-3 text-muted-foreground">
              El país está recibiendo una enorme cantidad de ayuda — lo cual nos alegra — pero sin organización esa ayuda puede no llegar a quienes más la necesitan. Aquí centros de acopio, hospitales, organizaciones y voluntarios se registran y permanecen visibles durante todo el tiempo que sea necesario.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                Publica o encuentra centros de acopio y puntos de donación activos.
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                Hospitales y clínicas publican sus ubicaciones y necesidades.
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                Voluntarios y profesionales se ofrecen por estado y especialidad.
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                Reportes de personas desaparecidas con búsqueda activa y actualización de estado.
              </li>
            </ul>
          </div>
          <div className="grid gap-4">
            <div className="rounded-2xl bg-muted/50 p-5">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">Registra tu centro o institución</p>
                  <p className="text-sm text-muted-foreground">Permanece visible mientras dure la necesidad.</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl bg-muted/50 p-5">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <HeartHandshake className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">Dona de forma organizada</p>
                  <p className="text-sm text-muted-foreground">Encuentra dónde se necesita agua, medicinas, ropa y alimentos.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="mt-10 grid gap-4 md:grid-cols-3">
        <FeatureCard
          icon={<HeartHandshake className="h-5 w-5" />}
          title="Centros de ayuda"
          desc="Centros de acopio, puntos de recaudación, hospitales y clínicas con ubicación exacta y necesidades actualizadas."
          to="/centros-acopio"
        />
        <FeatureCard
          icon={<Search className="h-5 w-5" />}
          title="Buscador con filtros"
          desc="Encuentra por nombre, cédula, fecha de nacimiento o estado. Comparte el enlace con tus filtros."
          to="/desaparecidos"
        />
        <FeatureCard
          icon={<Map className="h-5 w-5" />}
          title="Mapa en vivo"
          desc="Visualiza las zonas más afectadas según los reportes. Pines por estado de búsqueda y centros de ayuda."
          to="/mapa"
        />
        <FeatureCard
          icon={<Users className="h-5 w-5" />}
          title="Voluntarios"
          desc="Profesionales y voluntarios listos para ayudar — médicos, psicólogos, ingenieros, conductores."
          to="/voluntarios"
        />
        <FeatureCard
          icon={<Phone className="h-5 w-5" />}
          title="Emergencias"
          desc="Números oficiales: bomberos, Protección Civil, Cruz Roja, primeros auxilios psicológicos."
          to="/emergencias"
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
          <Step n={1} title="Publica o encuentra ayuda" desc="Registra tu centro de acopio, ofrece tus habilidades como voluntario o busca dónde donar. También puedes crear un reporte de búsqueda." />
          <Step n={2} title="Comparte la información" desc="Cada publicación tiene su URL para compartir. Mientras más personas conozcan los puntos activos, mejor fluye la ayuda." />
          <Step n={3} title="Mantén todo actualizado" desc="Los centros y reportes se actualizan en tiempo real. Así evitamos donar donde ya no se necesita o buscar a alguien que ya fue encontrado." />
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

import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/Layout";
import { AlertTriangle, HeartPulse, Brain, Home, Phone, Backpack } from "lucide-react";

const CANONICAL = "https://conecta-venezuela.lovable.app/consejos";
const TITLE = "Qué hacer en un sismo: consejos y primeros auxilios | Venezuela";
const DESCRIPTION =
  "Guía práctica para Venezuela: cómo actuar durante y después de un sismo, primeros auxilios básicos, apoyo emocional, mochila de emergencia y cuándo llamar al 911.";

export const Route = createFileRoute("/consejos")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { name: "keywords", content: "sismo Venezuela, terremoto, primeros auxilios, qué hacer en un sismo, mochila de emergencia, apoyo psicológico" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "article" },
      { property: "og:url", content: CANONICAL },
      { property: "og:site_name", content: "Guía de Apoyo Venezuela" },
      { property: "og:locale", content: "es_VE" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: CANONICAL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "HowTo",
          name: "Qué hacer antes, durante y después de un sismo",
          description: DESCRIPTION,
          inLanguage: "es-VE",
          step: [
            { "@type": "HowToStep", name: "Durante el sismo", text: "Agáchate, cúbrete y agárrate bajo una mesa firme; aléjate de ventanas y objetos que puedan caer." },
            { "@type": "HowToStep", name: "Después del sismo", text: "Revisa heridas, evacua con calma por las escaleras y cierra las llaves de gas y electricidad si hay daños." },
            { "@type": "HowToStep", name: "Primeros auxilios", text: "Controla hemorragias con presión directa, inmoviliza fracturas y llama al 911 ante heridas graves." },
            { "@type": "HowToStep", name: "Apoyo emocional", text: "Respira lento, habla con alguien de confianza y limita la exposición a noticias del desastre." },
          ],
        }),
      },
    ],
  }),
  component: Page,
});

type Section = {
  icon: typeof AlertTriangle;
  title: string;
  intro?: string;
  items: string[];
};

const SECTIONS: Section[] = [
  {
    icon: AlertTriangle,
    title: "Durante el sismo",
    intro: "Actúa en los primeros segundos. La mayoría de las lesiones ocurren al intentar correr.",
    items: [
      "Agáchate, cúbrete y agárrate: ponte bajo una mesa firme y sujétate hasta que termine.",
      "Aléjate de ventanas, espejos, lámparas y objetos que puedan caer.",
      "Si estás en cama, quédate ahí y protege tu cabeza con una almohada.",
      "Si estás en la calle, ve a un espacio abierto lejos de edificios, postes y cables.",
      "Si vas conduciendo, detente en un lugar seguro, lejos de puentes y túneles, y permanece dentro del vehículo.",
      "No uses ascensores bajo ninguna circunstancia.",
    ],
  },
  {
    icon: Home,
    title: "Después del sismo",
    items: [
      "Revisa si tú o quienes te rodean tienen heridas antes de moverte.",
      "Evacua con calma usando las escaleras; revisa que la ruta esté despejada.",
      "Cierra las llaves de gas, agua y electricidad si detectas fugas, daños o olor a gas.",
      "No enciendas fósforos ni encendedores hasta confirmar que no hay fugas.",
      "Aléjate de estructuras dañadas; pueden colapsar con réplicas.",
      "Mantente informado por radio o medios oficiales y evita difundir rumores.",
      "Si quedas atrapado: cubre tu boca, golpea una tubería o pared para que te escuchen, no grites de forma continua.",
    ],
  },
  {
    icon: HeartPulse,
    title: "Primeros auxilios básicos",
    intro: "Si no tienes formación, prioriza pedir ayuda al 911 y no movilizar a la víctima salvo peligro inminente.",
    items: [
      "Hemorragias: aplica presión directa con una tela limpia durante varios minutos sin retirarla.",
      "Fracturas: inmoviliza la zona en la posición en que se encuentre, no intentes acomodar el hueso.",
      "Quemaduras: enfría con agua corriente durante 10 minutos, no apliques pasta dental, hielo ni remedios caseros.",
      "Persona inconsciente que respira: colócala en posición lateral de seguridad.",
      "Si no respira y sabes RCP: 30 compresiones torácicas + 2 ventilaciones, repite hasta que llegue ayuda.",
      "No des comida ni agua a personas con heridas graves o inconscientes.",
    ],
  },
  {
    icon: Brain,
    title: "Mantén la calma — apoyo emocional",
    intro: "Es normal sentir miedo, ansiedad o tristeza después de un sismo. Cuidar la mente es tan importante como el cuerpo.",
    items: [
      "Respira lento: inhala 4 segundos, sostén 4, exhala 6. Repite varias veces.",
      "Habla con alguien de confianza sobre lo que sientes, no te aísles.",
      "Limita la exposición a noticias e imágenes del desastre, sobre todo con niños.",
      "Mantén rutinas básicas: comer, hidratarte y dormir, aunque sea poco.",
      "Valida las emociones de los niños; explícales lo ocurrido con palabras sencillas y honestas.",
      "Si la angustia, el insomnio o los pensamientos intrusivos persisten, busca apoyo psicológico profesional.",
    ],
  },
  {
    icon: Backpack,
    title: "Mochila de emergencia",
    intro: "Ten lista una mochila ligera en un lugar accesible para cada miembro de la familia.",
    items: [
      "Agua embotellada (mínimo 1 litro por persona) y alimentos no perecederos.",
      "Linterna, radio portátil y baterías de repuesto.",
      "Botiquín: gasas, vendas, alcohol, analgésicos y medicamentos personales.",
      "Copia de documentos importantes (cédula, partidas) en bolsa hermética.",
      "Silbato, navaja multiusos, mascarillas y guantes.",
      "Dinero en efectivo en billetes pequeños y un cargador portátil.",
      "Manta térmica, muda de ropa y artículos de higiene básica.",
    ],
  },
  {
    icon: Phone,
    title: "Cuándo llamar a emergencias",
    items: [
      "Personas atrapadas, heridas graves o inconscientes.",
      "Incendios, fugas de gas o derrumbes.",
      "Estructuras a punto de colapsar en vías públicas.",
      "Crisis emocional severa: pensamientos de hacerse daño o pánico incontrolable.",
    ],
  },
];

function Page() {
  return (
    <Layout>
      <article aria-labelledby="consejos-title">
        <header className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">
            Guía rápida
          </span>
          <h1 id="consejos-title" className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
            Qué hacer en un sismo: consejos y primeros auxilios
          </h1>
          <p className="mt-3 text-base text-muted-foreground sm:text-lg">
            Qué hacer antes, durante y después de un sismo en Venezuela. Pautas claras para protegerte, ayudar a otros y mantener la calma.
          </p>
        </header>

        <nav aria-label="Índice de la guía" className="mt-6 rounded-2xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">En esta guía</h2>
          <ul className="mt-2 flex flex-wrap gap-2 text-sm">
            {SECTIONS.map((s) => (
              <li key={s.title}>
                <a
                  href={`#${slug(s.title)}`}
                  className="inline-block rounded-full border border-input px-3 py-1 text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            const id = slug(s.title);
            return (
              <section
                key={s.title}
                id={id}
                aria-labelledby={`${id}-title`}
                className="scroll-mt-20 rounded-2xl border border-border bg-card p-5"
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-foreground/5" aria-hidden="true">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h2 id={`${id}-title`} className="min-w-0 text-lg font-semibold">{s.title}</h2>
                </div>
                {s.intro && <p className="mt-3 text-sm text-muted-foreground">{s.intro}</p>}
                <ul className="mt-4 space-y-2 text-sm leading-relaxed">
                  {s.items.map((it, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/40" aria-hidden="true" />
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>

        <aside
          role="note"
          className="mt-8 rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground"
        >
          Esta guía es informativa y no sustituye la atención médica profesional. Ante una emergencia, llama al{" "}
          <a href="tel:911" className="font-semibold text-foreground underline underline-offset-2">911</a> o al{" "}
          <a href="tel:171" className="font-semibold text-foreground underline underline-offset-2">171</a> (Bomberos).
        </aside>
      </article>
    </Layout>
  );
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
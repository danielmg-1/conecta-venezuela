import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, tool, stepCountIs, type UIMessage } from "ai";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

const SYSTEM = `Eres el Asistente de la Guía de Apoyo Venezuela, una plataforma para ayudar a las personas afectadas por el terremoto en Venezuela. Respondes SIEMPRE en español, con tono empático, claro y breve.

Puedes ayudar a:
- Buscar personas desaparecidas en la base de datos (usa la herramienta buscar_personas; tolera errores de ortografía y nombres parciales).
- Listar centros de acopio, hospitales, donaciones y puntos de ayuda (usa listar_centros_ayuda).
- Indicar las zonas más afectadas según los reportes (usa zonas_mas_afectadas).
- Compartir consejos de primeros auxilios y cómo actuar antes/durante/después de un sismo (usa consejos_sismo).
- Compartir números de emergencia oficiales (usa numeros_emergencia).

Cuando muestres una persona desaparecida, incluye un enlace en formato Markdown a /desaparecidos/{id} para ver el perfil completo. Cuando muestres un centro de ayuda, indica nombre, tipo, dirección y teléfono si existen.

Si una herramienta no devuelve resultados, sugiere al usuario crear un reporte en /desaparecidos/nuevo o publicar un centro en /centros-acopio/nuevo. No inventes datos. Si te preguntan algo fuera del alcance (política, opiniones), redirige amablemente al tema de la emergencia.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages } = (await request.json()) as { messages?: UIMessage[] };
        if (!Array.isArray(messages)) return new Response("messages required", { status: 400 });

        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const supabase = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_PUBLISHABLE_KEY!,
          { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
        );

        const gateway = createLovableAiGatewayProvider(apiKey);

        const tools = {
          buscar_personas: tool({
            description:
              "Busca personas desaparecidas, en búsqueda o encontradas en la base de datos. Tolera nombres parciales o mal escritos. Devuelve hasta 10 resultados con nombre, cédula, estado, lugar y un enlace al perfil.",
            inputSchema: z.object({
              nombre: z.string().optional().describe("Nombre o parte del nombre"),
              cedula: z.string().optional().describe("Número de cédula"),
              estado_lugar: z.string().optional().describe("Estado o ciudad donde desapareció"),
              status: z.enum(["desaparecido", "en_busqueda", "encontrado"]).optional(),
            }),
            execute: async ({ nombre, cedula, estado_lugar, status }) => {
              let q = supabase
                .from("missing_persons")
                .select("id, full_name, cedula, status, last_seen_state, last_seen_location, photo_url, birth_date")
                .limit(10);
              if (cedula) q = q.ilike("cedula", `%${cedula.replace(/\D/g, "")}%`);
              if (status) q = q.eq("status", status);
              if (estado_lugar) {
                q = q.or(
                  `last_seen_state.ilike.%${estado_lugar}%,last_seen_location.ilike.%${estado_lugar}%`,
                );
              }
              if (nombre) {
                const words = nombre.trim().split(/\s+/).filter(Boolean).slice(0, 4);
                if (words.length) {
                  const orParts = words.map((w) => `full_name.ilike.%${w}%`).join(",");
                  q = q.or(orParts);
                }
              }
              const { data, error } = await q;
              if (error) return { error: error.message, resultados: [] };
              return { resultados: data ?? [] };
            },
          }),
          listar_centros_ayuda: tool({
            description:
              "Lista centros de acopio, hospitales, clínicas, donaciones, refugios y puntos de primeros auxilios. Filtra por tipo o estado.",
            inputSchema: z.object({
              tipo: z
                .enum([
                  "centro_acopio",
                  "donaciones",
                  "hospital",
                  "clinica",
                  "refugio",
                  "primeros_auxilios",
                  "apoyo_psicologico",
                  "otros",
                ])
                .optional(),
              estado: z.string().optional(),
            }),
            execute: async ({ tipo, estado }) => {
              let q = supabase
                .from("aid_points")
                .select("id, name, kind, state, address, phone, description")
                .eq("status", "active")
                .limit(15);
              if (tipo) q = q.eq("kind", tipo);
              if (estado) q = q.ilike("state", `%${estado}%`);
              const { data, error } = await q;
              if (error) return { error: error.message, centros: [] };
              return { centros: data ?? [] };
            },
          }),
          zonas_mas_afectadas: tool({
            description:
              "Devuelve un ranking de los estados/zonas con más personas reportadas como desaparecidas o en búsqueda.",
            inputSchema: z.object({}),
            execute: async () => {
              const { data, error } = await supabase
                .from("missing_persons")
                .select("last_seen_state, status")
                .in("status", ["desaparecido", "en_busqueda"])
                .limit(1000);
              if (error) return { error: error.message, zonas: [] };
              const counts = new Map<string, number>();
              for (const r of data ?? []) {
                const k = (r.last_seen_state || "Sin especificar").trim();
                counts.set(k, (counts.get(k) ?? 0) + 1);
              }
              const zonas = Array.from(counts.entries())
                .map(([estado, total]) => ({ estado, total }))
                .sort((a, b) => b.total - a.total)
                .slice(0, 10);
              return { zonas };
            },
          }),
          consejos_sismo: tool({
            description:
              "Devuelve consejos de qué hacer antes, durante y después de un sismo, y para mantener la calma.",
            inputSchema: z.object({}),
            execute: async () => ({
              antes: [
                "Prepara una mochila de emergencia con agua, linterna, radio, medicamentos y copias de tus documentos.",
                "Identifica zonas seguras en casa (junto a muros de carga, lejos de ventanas).",
                "Acuerda un punto de encuentro familiar y un contacto fuera del estado.",
              ],
              durante: [
                "Agáchate, cúbrete y agárrate. Protege cabeza y cuello.",
                "No uses ascensores. Aléjate de ventanas, espejos y objetos que puedan caer.",
                "Si estás afuera, ve a un espacio abierto lejos de edificios, postes y cables.",
              ],
              despues: [
                "Revisa heridos y aplica primeros auxilios.",
                "Cierra llaves de gas y agua si hay fugas. No enciendas fósforos.",
                "Atento a réplicas. Sal con calma por las escaleras.",
              ],
              calma: [
                "Respira profundo 4 segundos, sostén 4, exhala 6. Repite 5 veces.",
                "Habla con alguien de confianza. Si la angustia persiste, llama a la línea de apoyo psicológico 0424-1723981 (UCAB).",
              ],
              mas_info: "Visita /consejos para la guía completa.",
            }),
          }),
          numeros_emergencia: tool({
            description: "Devuelve los números oficiales de emergencia en Venezuela.",
            inputSchema: z.object({}),
            execute: async () => ({
              numeros: [
                { servicio: "Emergencias 911", telefono: "911" },
                { servicio: "Protección Civil", telefono: "0800-7248451" },
                { servicio: "Cruz Roja Venezolana", telefono: "0241-8214841" },
                { servicio: "Bomberos", telefono: "171" },
                { servicio: "Apoyo psicológico (UCAB)", telefono: "0424-1723981" },
              ],
              mas_info: "Visita /emergencias para el directorio completo.",
            }),
          }),
        };

        try {
          const result = streamText({
            model: gateway("google/gemini-3-flash-preview"),
            system: SYSTEM,
            messages: convertToModelMessages(messages),
            tools,
            stopWhen: stepCountIs(8),
          });
          return result.toUIMessageStreamResponse({ originalMessages: messages });
        } catch (e) {
          console.error("chat error", e);
          return new Response("AI error", { status: 500 });
        }
      },
    },
  },
});
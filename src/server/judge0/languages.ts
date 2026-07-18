// IDs verificados contra GET /languages de Judge0 CE (RapidAPI, judge0-ce.p.rapidapi.com).
// Se eligió, para cada lenguaje, la versión disponible más cercana a la que se usaba en
// Piston (ver historial de src/server/piston/languages.ts): JavaScript coincide exacto
// (Node.js 18.15.0); el resto son la versión moderna más próxima. Los harness generadores
// en src/server/judge/harness/*.ts no usan sintaxis específica de versión, así que el
// desfase de versión no afecta la ejecución.
export const MAPA_LENGUAJES: Record<string, number> = {
  python: 92, // Python (3.11.2)
  javascript: 93, // JavaScript (Node.js 18.15.0)
  java: 91, // Java (JDK 17.0.6)
  csharp: 51, // C# (Mono 6.6.0.161)
  php: 98, // PHP (8.3.11)
}

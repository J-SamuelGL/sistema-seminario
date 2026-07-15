// NOTA: las versiones de `java`, `csharp` y `php` son valores de referencia SIN
// verificar contra la instancia real de Piston (no estaba accesible durante la
// Tarea 5 de este plan). `python` y `javascript` sí están verificados. Antes de
// confiar en estos valores en producción, confirmarlos contra `GET /api/v2/packages`
// de la instancia de Piston desplegada.
export const MAPA_LENGUAJES: Record<string, { language: string; version: string }> = {
  python: { language: 'python', version: '3.10.0' },
  javascript: { language: 'javascript', version: '18.15.0' },
  java: { language: 'java', version: '15.0.2' },
  csharp: { language: 'csharp', version: '6.12.0' },
  php: { language: 'php', version: '8.2.3' },
}

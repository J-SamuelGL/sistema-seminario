// Versiones verificadas contra una instancia real de Piston (`GET /api/v2/packages`):
// para instalar `javascript`/`csharp` el paquete se llama `node`/`mono` respectivamente
// (ver scripts/install-piston-languages.sh), pero como alias de ejecución `language:
// 'javascript'`/`'csharp'` sí son válidos en `POST /api/v2/execute`.
export const MAPA_LENGUAJES: Record<string, { language: string; version: string }> = {
  python: { language: 'python', version: '3.10.0' },
  javascript: { language: 'javascript', version: '18.15.0' },
  java: { language: 'java', version: '15.0.2' },
  csharp: { language: 'csharp', version: '6.12.0' },
  php: { language: 'php', version: '8.2.3' },
}

import type { Categoria } from '../../shared/dominio'

export type RegistroCorridaActividad = {
  usuarioId: string
  usuarioNombre: string
  usuarioCategoria: Categoria
  problemaTitulo: string
  ultimaEjecucionEn: Date | null
}

export type ActividadEnVivo = {
  usuarioId: string
  usuarioNombre: string
  usuarioCategoria: Categoria
  problemaTitulo: string
}

export function calcularActividadEnVivo(
  corridas: RegistroCorridaActividad[],
  ahora: Date,
  ventanaMinutos: number,
): ActividadEnVivo[] {
  const limite = ahora.getTime() - ventanaMinutos * 60000
  const masRecientePorUsuario = new Map<string, RegistroCorridaActividad>()

  for (const c of corridas) {
    if (!c.ultimaEjecucionEn) continue
    const actual = masRecientePorUsuario.get(c.usuarioId)
    if (!actual || c.ultimaEjecucionEn.getTime() > actual.ultimaEjecucionEn!.getTime()) {
      masRecientePorUsuario.set(c.usuarioId, c)
    }
  }

  return [...masRecientePorUsuario.values()]
    .filter((c) => c.ultimaEjecucionEn!.getTime() >= limite)
    .map((c) => ({
      usuarioId: c.usuarioId,
      usuarioNombre: c.usuarioNombre,
      usuarioCategoria: c.usuarioCategoria,
      problemaTitulo: c.problemaTitulo,
    }))
}

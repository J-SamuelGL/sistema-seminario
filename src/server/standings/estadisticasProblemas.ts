import type { Categoria, Grupo } from '../../shared/dominio'
import { GRUPOS } from '../../shared/dominio'
import { grupoDeCategoria } from '../problems/grupo'

export type RegistroUsuarioElegible = {
  categoria: Categoria
}

export type RegistroEnvioProblema = {
  usuarioId: string
  problemaId: string
  estadoProgreso: 'pendiente' | 'completado' | 'aprobado_manual'
}

export type RegistroCorridaProblema = {
  usuarioId: string
  problemaId: string
  contador: number
}

export type RegistroProblemaInfo = {
  id: string
  titulo: string
  grupo: Grupo
}

export type EstadisticaProblema = {
  problemaId: string
  titulo: string
  grupo: Grupo
  elegibles: number
  resueltos: number
  intentosTotales: number
  tasaAciertos: number
}

export function calcularEstadisticasProblemas(
  usuarios: RegistroUsuarioElegible[],
  envios: RegistroEnvioProblema[],
  corridas: RegistroCorridaProblema[],
  problemas: RegistroProblemaInfo[],
): EstadisticaProblema[] {
  const elegiblesPorGrupo = new Map<Grupo, number>()
  for (const u of usuarios) {
    const grupo = grupoDeCategoria(u.categoria)
    elegiblesPorGrupo.set(grupo, (elegiblesPorGrupo.get(grupo) ?? 0) + 1)
  }

  const resueltosPorProblema = new Map<string, Set<string>>()
  for (const e of envios) {
    if (e.estadoProgreso === 'pendiente') continue
    if (!resueltosPorProblema.has(e.problemaId)) {
      resueltosPorProblema.set(e.problemaId, new Set())
    }
    resueltosPorProblema.get(e.problemaId)!.add(e.usuarioId)
  }

  const intentosPorProblema = new Map<string, number>()
  const participantesConIntentoPorProblema = new Map<string, Set<string>>()
  for (const c of corridas) {
    if (c.contador <= 0) continue
    intentosPorProblema.set(
      c.problemaId,
      (intentosPorProblema.get(c.problemaId) ?? 0) + c.contador,
    )
    if (!participantesConIntentoPorProblema.has(c.problemaId)) {
      participantesConIntentoPorProblema.set(c.problemaId, new Set())
    }
    participantesConIntentoPorProblema.get(c.problemaId)!.add(c.usuarioId)
  }

  return problemas.map((p): EstadisticaProblema => {
    const resueltos = resueltosPorProblema.get(p.id)?.size ?? 0
    const intentosTotales = intentosPorProblema.get(p.id) ?? 0
    const participantesConIntento =
      participantesConIntentoPorProblema.get(p.id)?.size ?? 0
    return {
      problemaId: p.id,
      titulo: p.titulo,
      grupo: p.grupo,
      elegibles: elegiblesPorGrupo.get(p.grupo) ?? 0,
      resueltos,
      intentosTotales,
      tasaAciertos:
        participantesConIntento > 0 ? resueltos / participantesConIntento : 0,
    }
  })
}

export function problemasResueltosPorTodos(
  stats: EstadisticaProblema[],
): EstadisticaProblema[] {
  return stats.filter((s) => s.elegibles > 0 && s.resueltos >= s.elegibles)
}

export function problemasResueltosPorNadie(
  stats: EstadisticaProblema[],
): EstadisticaProblema[] {
  return stats.filter((s) => s.resueltos === 0)
}

/** "En llamas" es una heurística, no una métrica exacta: aproxima "fallos
 * acumulados" como intentosTotales - resueltos (usuarios distintos), y usa
 * tasaAciertos como desempate — suficiente para un panel de exhibición en
 * vivo, no para análisis estadístico. */
export function problemaEnLlamasPorGrupo(
  stats: EstadisticaProblema[],
): Partial<Record<Grupo, EstadisticaProblema>> {
  const resultado: Partial<Record<Grupo, EstadisticaProblema>> = {}
  for (const grupo of GRUPOS) {
    const candidatos = stats.filter(
      (s) => s.grupo === grupo && s.intentosTotales > 0,
    )
    if (candidatos.length === 0) continue
    candidatos.sort((a, b) => {
      const fallosA = a.intentosTotales - a.resueltos
      const fallosB = b.intentosTotales - b.resueltos
      if (fallosB !== fallosA) return fallosB - fallosA
      return a.tasaAciertos - b.tasaAciertos
    })
    resultado[grupo] = candidatos[0]
  }
  return resultado
}

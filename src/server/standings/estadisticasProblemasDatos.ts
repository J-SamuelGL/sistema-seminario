import { and, eq, inArray } from 'drizzle-orm'
import { db } from '../db/client'
import { usuarios, envios, corridas, problemas } from '../db/schema'
import {
  calcularEstadisticasProblemas,
  problemasResueltosPorTodos,
  problemasResueltosPorNadie,
  problemaEnLlamasPorGrupo,
} from './estadisticasProblemas'

export async function cargarEstadisticasProblemas(torneoId: string) {
  const [todosUsuarios, todosProblemas] = await Promise.all([
    db
      .select({ categoria: usuarios.categoria })
      .from(usuarios)
      .where(and(eq(usuarios.torneoId, torneoId), eq(usuarios.rol, 'participante'))),
    db
      .select({ id: problemas.id, titulo: problemas.titulo, grupo: problemas.grupo })
      .from(problemas)
      .where(eq(problemas.torneoId, torneoId)),
  ])

  const idsProblemas = todosProblemas.map((p) => p.id)
  const [todosEnvios, todasCorridas] =
    idsProblemas.length > 0
      ? await Promise.all([
          db
            .select({
              usuarioId: envios.usuarioId,
              problemaId: envios.problemaId,
              estadoProgreso: envios.estadoProgreso,
            })
            .from(envios)
            .where(inArray(envios.problemaId, idsProblemas)),
          db
            .select({
              usuarioId: corridas.usuarioId,
              problemaId: corridas.problemaId,
              contador: corridas.contador,
            })
            .from(corridas)
            .where(inArray(corridas.problemaId, idsProblemas)),
        ])
      : [[], []]

  const todas = calcularEstadisticasProblemas(todosUsuarios, todosEnvios, todasCorridas, todosProblemas)

  return {
    todas,
    resueltosPorTodos: problemasResueltosPorTodos(todas),
    resueltosPorNadie: problemasResueltosPorNadie(todas),
    enLlamasPorGrupo: problemaEnLlamasPorGrupo(todas),
  }
}

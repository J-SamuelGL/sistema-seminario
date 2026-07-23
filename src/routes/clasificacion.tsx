// src/routes/clasificacion.tsx
import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { clasificacionQueryOptions } from '#/server/queries/clasificacion'
import { usuarioActualOpcionalQueryOptions } from '#/server/queries/usuarioActual'
import { estadoTorneoQueryOptions } from '#/server/queries/torneo'
import {
  actividadRecienteQueryOptions,
  beneficiosUsadosQueryOptions,
  estadisticasProblemasQueryOptions,
  actividadEnVivoQueryOptions,
} from '#/server/queries/tablero'
import { LeaderboardTable } from '#/components/LeaderboardTable'
import { FiltroCategorias } from '#/components/FiltroCategorias'
import { CountdownTorneo } from '#/components/CountdownTorneo'
import { ActividadRecienteFeed } from '#/components/ActividadRecienteFeed'
import { BeneficiosUsadosPanel } from '#/components/BeneficiosUsadosPanel'
import { IaRestantePanel } from '#/components/IaRestantePanel'
import { EstadisticasProblemasPanel } from '#/components/EstadisticasProblemasPanel'
import { ProblemaEnLlamasPanel } from '#/components/ProblemaEnLlamasPanel'
import { ActividadEnVivoPanel } from '#/components/ActividadEnVivoPanel'
import { grupoDeCategoria } from '#/server/problems/grupo'
import { CATEGORIAS } from '#/shared/dominio'
import type { Categoria, Grupo } from '#/shared/dominio'
import { GRADIENT_TEXT } from '#/components/brandStyles'
import { BrandDivider } from '#/components/BrandDivider'

export const Route = createFileRoute('/clasificacion')({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(clasificacionQueryOptions()),
      context.queryClient.ensureQueryData(usuarioActualOpcionalQueryOptions()),
      context.queryClient.ensureQueryData(estadoTorneoQueryOptions()),
      context.queryClient.ensureQueryData(actividadRecienteQueryOptions()),
      context.queryClient.ensureQueryData(beneficiosUsadosQueryOptions()),
      context.queryClient.ensureQueryData(estadisticasProblemasQueryOptions()),
      context.queryClient.ensureQueryData(actividadEnVivoQueryOptions()),
    ]),
  component: LeaderboardPage,
})

const GRID_COLS_POR_CANTIDAD: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 lg:grid-cols-2',
  3: 'grid-cols-1 lg:grid-cols-3',
}

const TABLAS_CATEGORIA: { categoria: Categoria; titulo: string }[] = [
  { categoria: 'invitado', titulo: 'Invitados' },
  { categoria: 'junior', titulo: 'Junior' },
  { categoria: 'senior', titulo: 'Senior' },
]

function LeaderboardPage() {
  const [categoriasActivas, setCategoriasActivas] = useState<Set<Categoria>>(
    () => new Set(CATEGORIAS),
  )

  const { data } = useSuspenseQuery(clasificacionQueryOptions())
  const { data: usuario } = useSuspenseQuery(
    usuarioActualOpcionalQueryOptions(),
  )
  const { data: estado } = useSuspenseQuery(estadoTorneoQueryOptions())
  const { data: actividadReciente } = useSuspenseQuery(
    actividadRecienteQueryOptions(),
  )
  const { data: beneficiosYCupoIa } = useSuspenseQuery(
    beneficiosUsadosQueryOptions(),
  )
  const { data: estadisticasProblemas } = useSuspenseQuery(
    estadisticasProblemasQueryOptions(),
  )
  const { data: actividadEnVivo } = useSuspenseQuery(
    actividadEnVivoQueryOptions(),
  )

  function alternarCategoria(categoria: Categoria) {
    setCategoriasActivas((previo) => {
      const siguiente = new Set(previo)
      if (siguiente.has(categoria)) {
        if (siguiente.size === 1) return previo
        siguiente.delete(categoria)
      } else {
        siguiente.add(categoria)
      }
      return siguiente
    })
  }

  function grupoVisible(grupo: Grupo) {
    return CATEGORIAS.some(
      (categoria) =>
        categoriasActivas.has(categoria) &&
        grupoDeCategoria(categoria) === grupo,
    )
  }

  if (!data.iniciado)
    return <p className="p-8 text-ink-soft">El torneo aún no ha comenzado.</p>

  const tablasVisibles = TABLAS_CATEGORIA.filter((t) =>
    categoriasActivas.has(t.categoria),
  )

  return (
    <div className="mx-auto max-w-[1320px] px-6 py-8">
      <h1
        className={`font-display text-2xl font-bold tracking-wide uppercase ${GRADIENT_TEXT}`}
      >
        Tabla de Clasificación
      </h1>
      <div className="mt-2 mb-6 flex items-center gap-3">
        <BrandDivider />
        <p className="text-sm text-ink-soft italic">
          Puntos acumulados por problemas resueltos
        </p>
      </div>

      <div className="mb-8 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <FiltroCategorias
          activas={categoriasActivas}
          onToggle={alternarCategoria}
        />
        <CountdownTorneo
          iniciadoEn={estado?.iniciadoEn ? new Date(estado.iniciadoEn) : null}
          finalizadoEn={
            estado?.finalizadoEn ? new Date(estado.finalizadoEn) : null
          }
        />
      </div>

      <div
        className={`grid ${GRID_COLS_POR_CANTIDAD[tablasVisibles.length] ?? 'grid-cols-1'} gap-8`}
      >
        {tablasVisibles.map((t) => (
          <LeaderboardTable
            key={t.categoria}
            title={t.titulo}
            rows={data[t.categoria]}
            usuarioActualId={usuario?.id}
          />
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        <ActividadRecienteFeed
          items={actividadReciente}
          categoriasActivas={categoriasActivas}
        />
        <BeneficiosUsadosPanel
          items={beneficiosYCupoIa.beneficios}
          categoriasActivas={categoriasActivas}
        />
        {categoriasActivas.has('invitado') && (
          <IaRestantePanel items={beneficiosYCupoIa.cupoIa} />
        )}
        <EstadisticasProblemasPanel
          resueltosPorTodos={estadisticasProblemas.resueltosPorTodos}
          resueltosPorNadie={estadisticasProblemas.resueltosPorNadie}
          grupoVisible={grupoVisible}
        />
        <ProblemaEnLlamasPanel
          porGrupo={estadisticasProblemas.enLlamasPorGrupo}
          grupoVisible={grupoVisible}
        />
        <ActividadEnVivoPanel
          items={actividadEnVivo}
          categoriasActivas={categoriasActivas}
        />
      </div>
    </div>
  )
}

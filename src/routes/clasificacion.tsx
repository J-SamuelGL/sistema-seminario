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
import { NavbarParticipante } from '#/components/NavbarParticipante'
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

const TABLAS_CATEGORIA: { categoria: Categoria; titulo: string }[] = [
  { categoria: 'invitado', titulo: 'Invitados' },
  { categoria: 'junior', titulo: 'Junior' },
  { categoria: 'senior', titulo: 'Senior' },
]

function LeaderboardPage() {
  // Solo una categoría visible a la vez: con las tres tablas en un grid de 3
  // columnas era difícil seguir cualquiera de ellas. Se mantiene como `Set`
  // (en vez de un solo valor) porque los paneles secundarios de abajo
  // (actividad reciente, ventajas/desventajas, etc.) ya filtran recibiendo un
  // `Set<Categoria>` — así no hace falta tocar esa lógica, solo garantizar
  // que este Set nunca tenga más de un elemento.
  const [categoriasActivas, setCategoriasActivas] = useState<Set<Categoria>>(
    () => new Set(['invitado']),
  )
  const categoriaActiva = [...categoriasActivas][0]

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

  function seleccionarCategoria(categoria: Categoria) {
    setCategoriasActivas(new Set([categoria]))
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

  const tablaActiva = TABLAS_CATEGORIA.find(
    (t) => t.categoria === categoriaActiva,
  )!

  return (
    <div>
      <NavbarParticipante />
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
            activa={categoriaActiva}
            onSeleccionar={seleccionarCategoria}
          />
          <CountdownTorneo
            iniciadoEn={estado?.iniciadoEn ? new Date(estado.iniciadoEn) : null}
            finalizadoEn={
              estado?.finalizadoEn ? new Date(estado.finalizadoEn) : null
            }
          />
        </div>

        <LeaderboardTable
          key={tablaActiva.categoria}
          title={tablaActiva.titulo}
          rows={data[tablaActiva.categoria]}
          usuarioActualId={usuario?.id}
        />

        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
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
    </div>
  )
}

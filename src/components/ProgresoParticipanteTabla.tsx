import { Fragment, useState } from 'react'
import { formatearArgumentos } from '#/components/labels'
import { Spinner } from '#/components/Spinner'
import {
  CLASE_TABLA,
  CLASE_FILA_ADMIN,
  CLASE_ENCABEZADO_ADMIN,
} from '#/components/tableStyles'
import {
  ADMIN_CARD,
  ADMIN_LINK,
  ADMIN_INPUT_BASE,
} from '#/components/adminBrandStyles'

const ETIQUETAS_ESTADO: Record<string, string> = {
  pendiente: 'Pendiente',
  completado: 'Completado',
  aprobado_manual: 'Aprobado manual',
}

export type ProblemaConProgreso = {
  problemaId: string
  titulo: string
  dificultad: string
  categoriaProblema: string
  estadoProgreso: 'pendiente' | 'completado' | 'aprobado_manual'
  creadoEn: string | Date | null
  duracionMinutos: number | null
  codigo: string | null
  lenguaje: string | null
  resultados: Array<{
    argumentos: unknown[]
    salidaEsperada: unknown
    salidaObtenida?: string
    salidaError?: string
    aprobado: boolean
  }> | null
}

export function ProgresoParticipanteTabla(props: {
  problemas: ProblemaConProgreso[]
  modoEdicion: boolean
  onCambiarEstado?: (
    problemaId: string,
    estadoProgreso: 'pendiente' | 'completado' | 'aprobado_manual',
  ) => void
  cambiandoEstadoProblemaId?: string | null
}) {
  const [expandido, setExpandido] = useState<string | null>(null)
  const columnas = props.modoEdicion ? 7 : 6

  return (
    <div className={`${ADMIN_CARD} overflow-x-auto`}>
      <table className={CLASE_TABLA}>
        <thead>
          <tr className={CLASE_ENCABEZADO_ADMIN}>
            <th className="p-3">Problema</th>
            <th className="p-3">Dificultad</th>
            <th className="p-3">Categoría</th>
            <th className="p-3">Estado</th>
            <th className="p-3">Duración</th>
            <th className="p-3">Enviado en</th>
            {props.modoEdicion && <th className="p-3">Acciones</th>}
          </tr>
        </thead>
        <tbody>
          {props.problemas.map((p) => (
            <Fragment key={p.problemaId}>
              <tr className={CLASE_FILA_ADMIN}>
                <td className="p-3 text-admin-ink">
                  {p.codigo && (
                    <button
                      className={`mr-2 ${ADMIN_LINK}`}
                      onClick={() =>
                        setExpandido(
                          expandido === p.problemaId ? null : p.problemaId,
                        )
                      }
                    >
                      {expandido === p.problemaId ? '▾' : '▸'}
                    </button>
                  )}
                  {p.titulo}
                </td>
                <td className="p-3 text-admin-ink-soft">{p.dificultad}</td>
                <td className="p-3 text-admin-ink-soft">
                  {p.categoriaProblema}
                </td>
                <td className="p-3 text-admin-ink-soft">
                  {ETIQUETAS_ESTADO[p.estadoProgreso]}
                </td>
                <td className="p-3 text-admin-ink-soft">
                  {p.duracionMinutos !== null
                    ? `${p.duracionMinutos} min`
                    : '—'}
                </td>
                <td className="p-3 text-admin-ink-soft">
                  {p.creadoEn ? new Date(p.creadoEn).toLocaleString() : '—'}
                </td>
                {props.modoEdicion && (
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <select
                        className={`${ADMIN_INPUT_BASE} px-2 py-1 text-sm`}
                        value={p.estadoProgreso}
                        disabled={
                          props.cambiandoEstadoProblemaId === p.problemaId
                        }
                        onChange={(e) =>
                          props.onCambiarEstado?.(
                            p.problemaId,
                            e.target.value as
                              'pendiente' | 'completado' | 'aprobado_manual',
                          )
                        }
                      >
                        <option value="pendiente">Pendiente</option>
                        <option value="completado">Completado</option>
                        <option value="aprobado_manual">Aprobado manual</option>
                      </select>
                      {props.cambiandoEstadoProblemaId === p.problemaId && (
                        <Spinner />
                      )}
                    </div>
                  </td>
                )}
              </tr>
              {expandido === p.problemaId && p.codigo && (
                <tr className={`${CLASE_FILA_ADMIN} bg-admin-paper-soft`}>
                  <td colSpan={columnas} className="p-3">
                    <p className="text-sm text-admin-ink-soft">
                      Lenguaje: {p.lenguaje}
                    </p>
                    <pre className="mt-1 rounded border border-admin-line/40 bg-admin-paper p-2 font-mono text-sm whitespace-pre-wrap text-admin-ink">
                      {p.codigo}
                    </pre>
                    {p.resultados && (
                      <ul className="mt-2 flex flex-col gap-1 text-sm">
                        {p.resultados.map((r, i) => (
                          <li key={i} className="text-admin-ink-soft">
                            <code>{formatearArgumentos(r.argumentos)}</code> —
                            Esperado: <code>{String(r.salidaEsperada)}</code> —
                            Obtenido:{' '}
                            <code>{r.salidaObtenida || r.salidaError}</code> —{' '}
                            {r.aprobado ? '✅' : '❌'}
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}

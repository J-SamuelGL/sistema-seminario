import { Fragment, useState } from 'react'
import { formatearArgumentos } from '#/components/labels'
import { Spinner } from '#/components/Spinner'
import { CLASE_TABLA, CLASE_FILA } from '#/components/tableStyles'

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
    <table className={CLASE_TABLA}>
      <thead>
        <tr className={CLASE_FILA}>
          <th className="p-2">Problema</th>
          <th className="p-2">Dificultad</th>
          <th className="p-2">Categoría</th>
          <th className="p-2">Estado</th>
          <th className="p-2">Duración</th>
          <th className="p-2">Enviado en</th>
          {props.modoEdicion && <th className="p-2">Acciones</th>}
        </tr>
      </thead>
      <tbody>
        {props.problemas.map((p) => (
          <Fragment key={p.problemaId}>
            <tr className={CLASE_FILA}>
              <td className="p-2">
                {p.codigo && (
                  <button
                    className="mr-2 text-blue-600 underline"
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
              <td className="p-2">{p.dificultad}</td>
              <td className="p-2">{p.categoriaProblema}</td>
              <td className="p-2">{ETIQUETAS_ESTADO[p.estadoProgreso]}</td>
              <td className="p-2">
                {p.duracionMinutos !== null ? `${p.duracionMinutos} min` : '—'}
              </td>
              <td className="p-2">
                {p.creadoEn ? new Date(p.creadoEn).toLocaleString() : '—'}
              </td>
              {props.modoEdicion && (
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    <select
                      className="border p-1 text-sm"
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
              <tr className={`${CLASE_FILA} bg-gray-50`}>
                <td colSpan={columnas} className="p-2">
                  <p className="text-sm text-gray-600">
                    Lenguaje: {p.lenguaje}
                  </p>
                  <pre className="mt-1 whitespace-pre-wrap rounded bg-white p-2 text-sm">
                    {p.codigo}
                  </pre>
                  {p.resultados && (
                    <ul className="mt-2 flex flex-col gap-1 text-sm">
                      {p.resultados.map((r, i) => (
                        <li key={i}>
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
  )
}

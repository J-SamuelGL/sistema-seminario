import type { FilaClasificacion } from '#/server/standings/calculate'
import { CLASE_TABLA, CLASE_FILA } from '#/components/tableStyles'

export function LeaderboardTable({
  title,
  rows,
}: {
  title: string
  rows: Array<FilaClasificacion>
}) {
  return (
    <div>
      <h2 className="text-lg font-bold">{title}</h2>
      <table className={CLASE_TABLA}>
        <thead>
          <tr className={CLASE_FILA}>
            <th className="p-2">#</th>
            <th className="p-2">Nombre</th>
            <th className="p-2">Puntos</th>
            <th className="p-2">Resueltos</th>
            <th className="p-2">Tiempo</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.usuarioId} className={CLASE_FILA}>
              <td className="p-2">{i + 1}</td>
              <td className="p-2">{row.nombre}</td>
              <td className="p-2">{row.puntosTotales}</td>
              <td className="p-2">{row.cantidadResueltos}</td>
              <td className="p-2">
                {Math.round(row.minutosPenalizacionTotal)} min
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

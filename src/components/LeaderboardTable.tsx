import type { FilaClasificacion } from '#/server/standings/calculate'

export function LeaderboardTable({ title, rows }: { title: string; rows: Array<FilaClasificacion> }) {
  return (
    <div>
      <h2 className="text-lg font-bold">{title}</h2>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="border p-2 text-left">#</th>
            <th className="border p-2 text-left">Nombre</th>
            <th className="border p-2 text-left">Puntos</th>
            <th className="border p-2 text-left">Resueltos</th>
            <th className="border p-2 text-left">Tiempo</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.usuarioId}>
              <td className="border p-2">{i + 1}</td>
              <td className="border p-2">{row.nombre}</td>
              <td className="border p-2">{row.puntosTotales}</td>
              <td className="border p-2">{row.cantidadResueltos}</td>
              <td className="border p-2">{Math.round(row.minutosPenalizacionTotal)} min</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

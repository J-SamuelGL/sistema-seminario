import type { StandingRow } from '#/server/standings/calculate'

export function LeaderboardTable({ title, rows }: { title: string; rows: Array<StandingRow> }) {
  return (
    <div>
      <h2 className="text-lg font-bold">{title}</h2>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="border p-2 text-left">#</th>
            <th className="border p-2 text-left">Nombre</th>
            <th className="border p-2 text-left">Resueltos</th>
            <th className="border p-2 text-left">Tiempo</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.userId}>
              <td className="border p-2">{i + 1}</td>
              <td className="border p-2">{row.name}</td>
              <td className="border p-2">{row.solvedCount}</td>
              <td className="border p-2">{Math.round(row.totalPenaltyMinutes)} min</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

import 'dotenv/config'
import { eq } from 'drizzle-orm'
import { db } from '../src/server/db/client'
import {
  torneos,
  usuarios,
  problemas,
  estadoTorneo,
} from '../src/server/db/schema'

async function main() {
  const torneosExistentes = await db.select().from(torneos)
  if (torneosExistentes.length > 0) {
    console.log('Ya existe al menos un torneo — no se hace nada.')
    return
  }

  const anioArg = process.argv[2]
  if (!anioArg || Number.isNaN(Number(anioArg))) {
    console.error('Uso: tsx scripts/backfill-torneos.ts <anio>')
    process.exitCode = 1
    return
  }
  const anio = Number(anioArg)

  const [estadoPrevio] = await db
    .select()
    .from(estadoTorneo)
    .where(eq(estadoTorneo.id, 1))

  const id = crypto.randomUUID()
  await db.insert(torneos).values({
    id,
    anio,
    iniciadoEn: estadoPrevio?.iniciadoEn ?? null,
    finalizadoEn: estadoPrevio?.finalizadoEn ?? null,
  })
  console.log(`Torneo ${anio} creado con id ${id}.`)

  const participantesActualizados = await db
    .update(usuarios)
    .set({ torneoId: id })
    .where(eq(usuarios.rol, 'participante'))
  console.log(
    'Participantes actualizados:',
    participantesActualizados[0].affectedRows,
  )

  const problemasActualizados = await db
    .update(problemas)
    .set({ torneoId: id })
  console.log('Problemas actualizados:', problemasActualizados[0].affectedRows)

  console.log('Backfill completo.')
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })

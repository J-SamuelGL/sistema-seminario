// Script de un solo uso, corrido durante la migración a soporte multi-torneo
// (2026-07). Lee la fila legacy de `estado_torneo` para crear el primer
// `torneos` — ya no es ejecutable tal cual porque `estadoTorneo` se quitó de
// schema.ts en el mismo cambio; se conserva como referencia del proceso.
import 'dotenv/config'
import { eq } from 'drizzle-orm'
import { db } from '../src/server/db/client'
import { torneos, usuarios, problemas } from '../src/server/db/schema'

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

  // Originalmente aquí se leía la fila legacy `estado_torneo` (id fijo 1) vía
  // `db.select().from(estadoTorneo).where(eq(estadoTorneo.id, 1))` y se
  // copiaban sus columnas `iniciado_en`/`finalizado_en` al nuevo `torneos`,
  // para no perder el estado del torneo en curso al migrar. Esa tabla ya no
  // existe en el esquema (ver comentario de cabecera).

  const id = crypto.randomUUID()
  await db.insert(torneos).values({
    id,
    anio,
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

  const problemasActualizados = await db.update(problemas).set({ torneoId: id })
  console.log('Problemas actualizados:', problemasActualizados[0].affectedRows)

  console.log('Backfill completo.')
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })

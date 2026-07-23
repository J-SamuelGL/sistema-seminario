import { describe, it, expect } from 'vitest'
import { db } from '../src/server/db/client'
import { torneos, usuarios, problemas, corridas } from '../src/server/db/schema'
import { cargarActividadEnVivo } from '../src/server/standings/actividadEnVivoDatos'

describe('cargarActividadEnVivo', () => {
  it('incluye solo corridas recientes del torneo dado', async () => {
    const torneoId = crypto.randomUUID()
    await db.insert(torneos).values({
      id: torneoId,
      anio: 1500 + Math.floor(Math.random() * 100),
    })

    const usuarioReciente = crypto.randomUUID()
    const usuarioViejo = crypto.randomUUID()
    await db.insert(usuarios).values([
      {
        id: usuarioReciente,
        name: 'Reciente',
        email: `r-${usuarioReciente}@example.com`,
        categoria: 'invitado',
        torneoId,
      },
      {
        id: usuarioViejo,
        name: 'Viejo',
        email: `v-${usuarioViejo}@example.com`,
        categoria: 'invitado',
        torneoId,
      },
    ])

    const problemaId = crypto.randomUUID()
    await db.insert(problemas).values({
      id: problemaId,
      titulo: 'Suma',
      descripcion: 'd',
      dificultad: 'Fácil',
      grupo: 'invitado_junior',
      puntos: 10,
      parametros: [],
      tipoRetorno: 'int',
      torneoId,
    })

    const ahora = new Date()
    const haceUnMinuto = new Date(ahora.getTime() - 60000)
    const haceUnaHora = new Date(ahora.getTime() - 3600000)

    await db.insert(corridas).values([
      {
        usuarioId: usuarioReciente,
        problemaId,
        contador: 1,
        ultimaEjecucionEn: haceUnMinuto,
      },
      {
        usuarioId: usuarioViejo,
        problemaId,
        contador: 1,
        ultimaEjecucionEn: haceUnaHora,
      },
    ])

    const resultado = await cargarActividadEnVivo(torneoId)
    expect(resultado.map((r) => r.usuarioId)).toEqual([usuarioReciente])
  })
})

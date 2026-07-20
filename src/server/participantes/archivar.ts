import { and, eq } from 'drizzle-orm'
import { db } from '../db/client'
import { usuarios, cuentas, sesiones } from '../db/schema'

// El correo se mangla con el sufijo reservado por RFC 2606 (`.invalid`), que
// nunca resuelve a un dominio real — así el correo queda liberado para que el
// admin registre a la misma persona el año siguiente sin chocar con el
// índice único de `usuarios.email`, y la cuenta archivada queda imposible de
// autenticar (contraseña invalidada) aunque alguien conserve la original.
export async function archivarParticipantesDeTorneo(
  torneoId: string,
): Promise<void> {
  const participantes = await db
    .select({ id: usuarios.id, email: usuarios.email })
    .from(usuarios)
    .where(
      and(eq(usuarios.torneoId, torneoId), eq(usuarios.rol, 'participante')),
    )

  for (const participante of participantes) {
    const correoArchivado = `${participante.id}@torneo.invalid`
    await db.transaction(async (tx) => {
      await tx
        .update(usuarios)
        .set({ email: correoArchivado, correoOriginal: participante.email })
        .where(eq(usuarios.id, participante.id))
      await tx
        .update(cuentas)
        .set({ password: null })
        .where(
          and(
            eq(cuentas.userId, participante.id),
            eq(cuentas.providerId, 'credential'),
          ),
        )
      // Cierra sesiones activas: sin esto, un token de sesión vigente sigue
      // pasando requerirParticipanteIngresado (que solo valida la sesión, no
      // la contraseña) y podría seguir leyendo el torneo ya concluido.
      await tx.delete(sesiones).where(eq(sesiones.userId, participante.id))
    })
  }
}

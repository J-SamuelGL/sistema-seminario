import { createFileRoute, Outlet } from '@tanstack/react-router'
import { NavbarParticipante } from '#/components/NavbarParticipante'
import { usuarioActualOpcionalQueryOptions } from '#/server/queries/usuarioActual'

export const Route = createFileRoute('/_app')({
  loader: ({ context }) => context.queryClient.ensureQueryData(usuarioActualOpcionalQueryOptions()),
  component: AppLayout,
})

function AppLayout() {
  return (
    <div>
      <NavbarParticipante />
      <Outlet />
    </div>
  )
}

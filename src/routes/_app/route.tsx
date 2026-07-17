import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { NavbarParticipante } from '#/components/NavbarParticipante'
import { usuarioActualOpcionalQueryOptions } from '#/server/queries/usuarioActual'

export const Route = createFileRoute('/_app')({
  beforeLoad: async ({ context }) => {
    const usuario = await context.queryClient.ensureQueryData(
      usuarioActualOpcionalQueryOptions(),
    )
    if (!usuario) throw redirect({ to: '/' })
  },
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(usuarioActualOpcionalQueryOptions()),
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

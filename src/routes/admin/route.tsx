import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { NavbarAdmin } from '#/components/NavbarAdmin'
import { usuarioActualOpcionalQueryOptions } from '#/server/queries/usuarioActual'

export const Route = createFileRoute('/admin')({
  beforeLoad: async ({ context }) => {
    const usuario = await context.queryClient.ensureQueryData(
      usuarioActualOpcionalQueryOptions(),
    )
    if (!usuario) throw redirect({ to: '/' })
    if (usuario.rol !== 'admin') throw redirect({ to: '/perfil' })
  },
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(usuarioActualOpcionalQueryOptions()),
  component: AdminLayout,
})

function AdminLayout() {
  return (
    <div>
      <NavbarAdmin />
      <Outlet />
    </div>
  )
}

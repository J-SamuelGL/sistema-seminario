import { createFileRoute, Outlet } from '@tanstack/react-router'
import { NavbarAdmin } from '#/components/NavbarAdmin'
import { usuarioActualOpcionalQueryOptions } from '#/server/queries/usuarioActual'

export const Route = createFileRoute('/admin')({
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

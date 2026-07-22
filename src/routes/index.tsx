import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { authClient } from '#/components/authClient'
import { LoadingButton } from '#/components/LoadingButton'
import { useToastMutation } from '#/components/useToastMutation'
import { CornerFrame } from '#/components/CornerFrame'
import { BrandDivider } from '#/components/BrandDivider'
import {
  GRADIENT_TEXT,
  CARD,
  BUTTON_PRIMARY,
  INPUT_BASE,
  LABEL_BASE,
  OUTLINE_PILL,
} from '#/components/brandStyles'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  const navigate = useNavigate()
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')

  const iniciarSesion = useToastMutation({
    mutationFn: async (credenciales: { email: string; password: string }) => {
      const { data, error } = await authClient.signIn.email(credenciales)
      if (error) throw new Error('Correo o contraseña incorrectos.')
      return data
    },
    onSuccess: (data) => {
      const esAdmin = data.user.rol === 'admin'
      navigate({ to: esAdmin ? '/admin/participantes' : '/perfil' })
    },
  })

  function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    iniciarSesion.mutate({ email: correo, password: contrasena })
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-[1160px] px-8 pt-6 pb-24">
        <div className="flex flex-col items-center gap-5 pt-3 pb-12 text-center">
          <CornerFrame className={`${CARD} p-4`}>
            <img
              src="/logo.jpeg"
              alt="CodeFest 2026"
              className="block h-auto w-[220px]"
            />
          </CornerFrame>

          <h1
            className={`max-w-2xl font-display text-[38px] leading-tight font-bold tracking-tight ${GRADIENT_TEXT}`}
          >
            Tu código es tu arma.
            <br />
            El torneo es tu campo de batalla.
          </h1>

          <BrandDivider />

          <p className="max-w-xl text-[16.5px] leading-relaxed text-ink-soft italic">
            Resuelve problemas, sube en la clasificación y demuestra de qué está
            hecho tu código. Un torneo para todos los niveles.
          </p>

          <div className="mt-2 flex flex-wrap justify-center gap-3">
            <span className={OUTLINE_PILL}>Modalidad individual</span>
            <span className={OUTLINE_PILL}>Todos los niveles</span>
          </div>
        </div>

        <div className={`${CARD} mx-auto max-w-[460px] p-8`}>
          <h2
            className={`font-display text-xl font-semibold tracking-wide uppercase ${GRADIENT_TEXT}`}
          >
            Inicia sesión
          </h2>
          <p className="mt-1.5 mb-6 text-[13.5px] text-ink-soft">
            Usa el correo y la contraseña que te llegaron por correo cuando te
            registraste.
          </p>
          <form className="flex flex-col gap-4" onSubmit={handleLogin}>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="login-correo" className={LABEL_BASE}>
                Correo electrónico
              </label>
              <input
                id="login-correo"
                className={INPUT_BASE}
                type="email"
                placeholder="tu@correo.com"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                maxLength={255}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="login-password" className={LABEL_BASE}>
                Contraseña
              </label>
              <input
                id="login-password"
                className={INPUT_BASE}
                type="password"
                placeholder="••••••••"
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
                required
              />
            </div>
            <LoadingButton
              className={`mt-2 ${BUTTON_PRIMARY}`}
              type="submit"
              isPending={iniciarSesion.isPending}
              label="Iniciar sesión"
              pendingLabel="Ingresando..."
            />
          </form>
        </div>
      </div>
    </div>
  )
}

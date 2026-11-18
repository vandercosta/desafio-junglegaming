import { Dialog } from 'radix-ui'
import { useState, type SubmitEvent } from 'react'
import { Button } from '@/components/ui/button'
import type { RegisterErrors, RegisterInput } from './auth-api'

type Props = {
  pending: boolean
  errors?: RegisterErrors
  hasError: boolean
  onSubmit: (input: RegisterInput) => void
}

const fields = [
  {
    name: 'username',
    label: 'Nome de usuário',
    type: 'text',
    autoComplete: 'username',
  },
  {
    name: 'email',
    label: 'E-mail',
    type: 'email',
    autoComplete: 'email',
  },
  {
    name: 'password',
    label: 'Senha',
    type: 'password',
    autoComplete: 'new-password',
  },
  {
    name: 'confirmation',
    label: 'Confirmar senha',
    type: 'password',
    autoComplete: 'new-password',
  },
] as const

export default function RegisterForm({
  pending,
  errors,
  hasError,
  onSubmit,
}: Props) {
  const [confirmationError, setConfirmationError] = useState('')

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return

    const values = new FormData(event.currentTarget)
    const password = String(values.get('password') ?? '')

    if (password !== values.get('confirmation')) {
      setConfirmationError('As senhas precisam ser iguais.')
      return
    }

    setConfirmationError('')
    onSubmit({
      username: String(values.get('username') ?? ''),
      email: String(values.get('email') ?? ''),
      password,
    })
  }

  return (
    <form onSubmit={handleSubmit} aria-busy={pending} className="grid gap-3">
      {fields.map(({ name, label, type, autoComplete }) => {
        const id = `register-${name}`
        const message =
          name === 'confirmation' ? confirmationError : errors?.[name]

        return (
          <div key={name} className="grid gap-1">
            <label htmlFor={id}>{label}</label>
            <input
              id={id}
              name={name}
              type={type}
              autoComplete={autoComplete}
              required
              readOnly={pending}
              aria-invalid={Boolean(message)}
              aria-describedby={message ? `${id}-error` : undefined}
              className="rounded-md border p-2"
            />
            {message && (
              <p id={`${id}-error`} role="alert" className="text-sm">
                {message}
              </p>
            )}
          </div>
        )
      })}

      {hasError && !errors && (
        <p role="alert">Não foi possível criar a conta. Tente novamente.</p>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        <Dialog.Close asChild>
          <Button type="button" variant="outline" disabled={pending}>
            Cancelar
          </Button>
        </Dialog.Close>
        <Button type="submit" disabled={pending}>
          {pending ? 'Criando conta…' : 'Criar conta'}
        </Button>
      </div>
    </form>
  )
}

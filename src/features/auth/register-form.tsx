import { useState, type SubmitEvent } from 'react'
import { Button } from '@/components/ui/button'
import type { RegisterErrors, RegisterInput } from './auth-api'
import AuthField from './auth-field'

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
    placeholder: 'Nome de usuário',
    type: 'text',
    autoComplete: 'username',
  },
  {
    name: 'email',
    label: 'E-mail',
    placeholder: 'Digite seu e-mail',
    type: 'email',
    autoComplete: 'email',
  },
  {
    name: 'password',
    label: 'Senha',
    placeholder: 'Senha',
    type: 'password',
    autoComplete: 'new-password',
  },
  {
    name: 'confirmation',
    label: 'Confirmar senha',
    placeholder: 'Confirmar senha',
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
      {fields.map(({ name, label, placeholder, type, autoComplete }) => {
        const id = `register-${name}`
        const message =
          name === 'confirmation' ? confirmationError : errors?.[name]

        return (
          <div key={name} className="grid gap-1">
            <AuthField
              id={id}
              name={name}
              label={label}
              placeholder={placeholder}
              type={type}
              autoComplete={autoComplete}
              required
              readOnly={pending}
              aria-invalid={Boolean(message)}
              aria-describedby={message ? `${id}-error` : undefined}
              className={
                name === 'username'
                  ? 'placeholder:text-center lg:placeholder:text-left'
                  : undefined
              }
            />
            {message && (
              <p
                id={`${id}-error`}
                role="alert"
                className="text-sm text-destructive"
              >
                {message}
              </p>
            )}
          </div>
        )
      })}

      {hasError && !errors && (
        <p role="alert" className="text-sm text-destructive">
          Não foi possível criar a conta. Tente novamente.
        </p>
      )}

      <Button
        type="submit"
        disabled={pending}
        className="mt-7 h-[60px] w-full cursor-pointer rounded-[10px] text-base font-bold lg:mt-3 lg:h-[45px] lg:rounded-[5px]"
      >
        {pending ? (
          'Criando conta…'
        ) : (
          <>
            <span className="lg:hidden">Criar perfil</span>
            <span className="hidden lg:inline">Criar conta</span>
          </>
        )}
      </Button>
    </form>
  )
}

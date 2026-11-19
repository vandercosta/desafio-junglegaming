import { Link } from '@tanstack/react-router'
import { Popover } from 'radix-ui'
import avatarIcon from '@/assets/icons/avatar.svg'
import logoutIcon from '@/assets/icons/logout.svg'
import userIcon from '@/assets/icons/user.svg'
import type { Session } from './auth-api'

const optionClass =
  'flex min-h-10 w-full items-center gap-3 rounded-sm px-3 text-left text-sm text-text-accent hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-primary'

export default function AccountPopover({
  user,
  signingOut,
  onSignOut,
}: {
  user: Session['user']
  signingOut: boolean
  onSignOut: () => void
}) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={`Conta de ${user.displayName}`}
          className="grid size-10 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-full border bg-[#2f1d15] hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary lg:ml-4 lg:size-[35px]"
        >
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            <img src={avatarIcon} alt="" width={20} height={20} />
          )}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          collisionPadding={12}
          aria-label="Conta do usuário"
          className="z-30 w-56 max-w-[calc(100vw-24px)] rounded-md border bg-surface-card p-1.5 font-mono text-foreground shadow-lg"
        >
          <p className="wrap-anywhere border-b px-3 py-2 text-sm font-bold">
            {user.displayName}
          </p>
          <Popover.Close asChild>
            <Link to="/perfil" className={optionClass}>
              <img src={userIcon} alt="" className="size-[18px] shrink-0" />
              Meu perfil
            </Link>
          </Popover.Close>
          <button
            type="button"
            disabled={signingOut}
            onClick={onSignOut}
            className={`${optionClass} cursor-pointer disabled:cursor-default disabled:opacity-50`}
          >
            <img src={logoutIcon} alt="" className="size-[18px] shrink-0" />
            {signingOut ? 'Saindo…' : 'Sair'}
          </button>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

import { Link } from '@tanstack/react-router'
import activityIcon from '@/assets/icons/activity.svg'
import cartIcon from '@/assets/icons/cart-2.svg'
import dangerIcon from '@/assets/icons/danger.svg'
import downloadIcon from '@/assets/icons/download.svg'
import heartIcon from '@/assets/icons/heart.svg'
import locationIcon from '@/assets/icons/location.svg'
import logoutIcon from '@/assets/icons/logout.svg'
import userIcon from '@/assets/icons/user.svg'

const items = [
  { label: 'Dados do perfil', icon: userIcon, to: '/perfil' },
  { label: 'Carteiras', icon: locationIcon, to: '/perfil/carteiras' },
  { label: 'Atividade', icon: cartIcon },
  {
    label: 'Lista de interesse',
    icon: heartIcon,
    to: '/favoritos',
    private: true,
  },
  { label: 'Ofertas', icon: activityIcon },
  { label: 'Arquivos baixados', icon: downloadIcon },
  { label: 'Suporte', icon: dangerIcon },
] as const satisfies ReadonlyArray<{
  label: string
  icon: string
  to?: string
  private?: boolean
}>

const rowStyle =
  'flex min-h-[45px] items-center gap-3 border-l-[6px] border-transparent pr-2 pl-2 text-[15px] leading-tight md:gap-4 md:pr-4 md:pl-2.5'

export default function AccountNavigation({
  signedIn,
  signingOut,
  onSignOut,
}: {
  signedIn: boolean
  signingOut: boolean
  onSignOut: () => void
}) {
  return (
    <aside className="self-start bg-surface-card py-2 font-mono">
      <h2 className="px-2.5 pt-2.5 pb-2 text-lg/4 font-bold">Meu perfil</h2>
      <nav aria-label="Conta do colecionador">
        <ul className="grid grid-cols-2 md:grid-cols-1">
          {items.map((item) => {
            if ('private' in item && !signedIn) return null

            const content = (
              <>
                <img
                  src={item.icon}
                  alt=""
                  className="size-[18px] shrink-0 object-contain"
                />
                {item.label}
              </>
            )

            return (
              <li key={item.label}>
                {'to' in item ? (
                  <Link
                    to={item.to}
                    activeOptions={{ exact: true, includeSearch: false }}
                    className={`${rowStyle} text-text-accent hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-primary aria-[current=page]:border-l-primary`}
                  >
                    {content}
                  </Link>
                ) : (
                  <span className={`${rowStyle} text-text-accent`}>
                    {content}
                    <span className="sr-only"> (indisponível)</span>
                  </span>
                )}
              </li>
            )
          })}
        </ul>
        {signedIn && (
          <div className="border-t border-primary/50">
            <button
              type="button"
              disabled={signingOut}
              onClick={onSignOut}
              className={`${rowStyle} w-full cursor-pointer text-left font-bold text-text-accent hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-default disabled:opacity-50`}
            >
              <img
                src={logoutIcon}
                alt=""
                className="size-[18px] shrink-0 object-contain"
              />
              {signingOut ? 'Saindo…' : 'Sair'}
            </button>
          </div>
        )}
      </nav>
    </aside>
  )
}

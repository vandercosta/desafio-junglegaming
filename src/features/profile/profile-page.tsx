import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { sessionQueryOptions } from '@/features/auth/auth-api'
import { Button } from '@/components/ui/button'
import { getProfile, profileQueryKey } from './profile-api'
import { PasswordForm, ProfileForm } from './profile-forms'
import AccountNavigation from './account-navigation'

export default function ProfilePage() {
  const session = useQuery(sessionQueryOptions)
  const userId = session.data?.session?.user.id
  return (
    <main className="mx-auto grid max-w-5xl gap-6 p-6 md:grid-cols-[13rem_minmax(0,1fr)]">
      <AccountNavigation signedIn={Boolean(userId)} />
      <section
        aria-labelledby="profile-heading"
        className="grid content-start gap-5"
      >
        <h1 id="profile-heading" className="text-2xl font-semibold">
          Perfil do colecionador
        </h1>
        {userId ? (
          <AccountProfile key={userId} userId={userId} />
        ) : session.data !== undefined ? (
          <Button asChild className="w-fit">
            <Link to="/perfil" search={{ auth: 'entrar' }}>
              Entrar para ver o perfil
            </Link>
          </Button>
        ) : null}
      </section>
    </main>
  )
}

function AccountProfile({ userId }: { userId: string }) {
  const profile = useQuery({
    queryKey: profileQueryKey(userId),
    queryFn: ({ signal }) => getProfile(userId, signal),
    retry: false,
  })

  return (
    <>
      {profile.isPending && <p role="status">Carregando perfil…</p>}
      {profile.isError && (
        <div>
          <p role="alert">Não foi possível carregar o perfil.</p>
          <Button
            type="button"
            disabled={profile.isFetching}
            onClick={() => void profile.refetch()}
          >
            Tentar carregar perfil
          </Button>
        </div>
      )}
      {profile.data && (
        <>
          <ProfileForm profile={profile.data} />
          <PasswordForm userId={userId} />
        </>
      )}
    </>
  )
}

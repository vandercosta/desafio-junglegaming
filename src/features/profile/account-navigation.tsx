import { Link } from '@tanstack/react-router'

export default function AccountNavigation({ signedIn }: { signedIn: boolean }) {
  return (
    <aside className="grid content-start gap-3 rounded-md border p-4">
      <p className="font-semibold">Meu perfil</p>
      <nav
        aria-label="Conta do colecionador"
        className="flex flex-wrap gap-3 md:grid"
      >
        <Link
          to="/perfil"
          activeOptions={{ exact: true }}
          className="underline"
        >
          Dados do perfil
        </Link>
        <Link to="/perfil/carteiras" className="underline">
          Carteiras
        </Link>
        {signedIn && (
          <Link to="/favoritos" className="underline">
            Lista de interesse
          </Link>
        )}
        <Link to="/" className="underline">
          Voltar ao catálogo
        </Link>
      </nav>
    </aside>
  )
}

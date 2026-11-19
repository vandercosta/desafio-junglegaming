import { Link } from '@tanstack/react-router'

export default function NotFoundPage() {
  return (
    <main className="page-shell py-6">
      <h1>Página não encontrada</h1>
      <Link to="/" className="underline">
        Voltar ao início
      </Link>
    </main>
  )
}

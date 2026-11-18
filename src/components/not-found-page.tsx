import { Link } from '@tanstack/react-router'

export default function NotFoundPage() {
  return (
    <main>
      <h1>Página não encontrada</h1>
      <Link to="/" className="underline">
        Voltar ao início
      </Link>
    </main>
  )
}

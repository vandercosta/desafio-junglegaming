import { createRootRoute } from '@tanstack/react-router'
import NotFoundPage from '@/components/not-found-page'
import SessionLayout from '@/features/auth/session-layout'

export const Route = createRootRoute({
  validateSearch: (
    search: Record<string, unknown>,
  ): { auth?: 'entrar' | 'cadastrar' } => {
    const auth = search.auth

    return {
      auth: auth === 'entrar' || auth === 'cadastrar' ? auth : undefined,
    }
  },
  component: SessionLayout,
  notFoundComponent: NotFoundPage,
})

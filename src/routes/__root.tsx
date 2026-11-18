import { createRootRoute } from '@tanstack/react-router'
import NotFoundPage from '@/components/not-found-page'
import SessionLayout from '@/features/auth/session-layout'

export const Route = createRootRoute({
  validateSearch: (search: Record<string, unknown>): { auth?: 'entrar' } => ({
    auth: search.auth === 'entrar' ? 'entrar' : undefined,
  }),
  component: SessionLayout,
  notFoundComponent: NotFoundPage,
})

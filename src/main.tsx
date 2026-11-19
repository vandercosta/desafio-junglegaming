import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { router } from './router'

const queryClient = new QueryClient()
const root = createRoot(document.getElementById('root')!)

async function bootstrap() {
  if (import.meta.env.VITE_ENABLE_MOCKS === 'true') {
    const { worker } = await import('./mocks/browser')
    await worker.start({ quiet: true })
  }

  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  )
}

void bootstrap().catch((error: unknown) => {
  console.error('Falha ao iniciar a aplicação', error)
  root.render(
    <p role="alert">
      Não foi possível iniciar a aplicação. Atualize a página.
    </p>,
  )
})

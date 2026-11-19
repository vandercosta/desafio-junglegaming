import { useNavigate, useRouter, useSearch } from '@tanstack/react-router'
import { useEffect, useLayoutEffect, useRef } from 'react'
import { catalogFiltersHash, parseCatalogSearch } from './catalog-search'

const searchDebounceMs = 350

export default function CatalogDesktopSearch() {
  const router = useRouter()
  const navigate = useNavigate({ from: '/' })
  const query = useSearch({ from: '/', select: (search) => search.q ?? '' })
  const input = useRef<HTMLInputElement>(null)
  const pendingSearch = useRef<number | undefined>(undefined)

  useLayoutEffect(() => {
    if (input.current && pendingSearch.current === undefined) {
      input.current.value = query
    }
  }, [query])

  useEffect(() => {
    const unsubscribe = router.history.subscribe(({ location, action }) => {
      if (action.type === 'PUSH' || action.type === 'REPLACE') return

      window.clearTimeout(pendingSearch.current)
      pendingSearch.current = undefined
      if (input.current) {
        const params = new URLSearchParams(location.search)
        input.current.value = params.get('q')?.trim() ?? ''
      }
    })

    return () => {
      window.clearTimeout(pendingSearch.current)
      unsubscribe()
    }
  }, [router])

  function scheduleSearch(value: string) {
    window.clearTimeout(pendingSearch.current)
    pendingSearch.current = window.setTimeout(() => {
      pendingSearch.current = undefined
      const location = router.latestLocation
      if (location.pathname !== '/' || location.hash !== catalogFiltersHash)
        return

      const q = parseCatalogSearch({ q: value }).q
      if (q === parseCatalogSearch(location.search).q) return

      void navigate({
        search: (previous) => ({ ...previous, q, page: undefined }),
        hash: true,
        hashScrollIntoView: false,
        resetScroll: false,
      })
    }, searchDebounceMs)
  }

  return (
    <div role="search" className="mb-4">
      <label htmlFor="catalog-search" className="grid max-w-md gap-1">
        Buscar NFTs
        <input
          ref={input}
          id="catalog-search"
          type="search"
          name="q"
          defaultValue={query}
          onChange={(event) => scheduleSearch(event.currentTarget.value)}
          className="min-w-0 rounded-md border border-input bg-background p-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        />
      </label>
    </div>
  )
}

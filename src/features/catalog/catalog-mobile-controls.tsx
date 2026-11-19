import { useLocation, useNavigate } from '@tanstack/react-router'
import { X } from 'lucide-react'
import { Dialog } from 'radix-ui'
import { useState, type SubmitEvent } from 'react'
import filterIcon from '@/assets/icons/filter.svg'
import searchIcon from '@/assets/icons/search-mobile.svg'
import { Button } from '@/components/ui/button'
import CatalogFilters from './catalog-filters'
import { parseCatalogSearch, type CatalogSearch } from './catalog-search'

export default function CatalogMobileControls() {
  const navigate = useNavigate({ from: '/' })
  const search = useLocation({
    select: (location) => parseCatalogSearch(location.search),
  })
  const [filtersOpen, setFiltersOpen] = useState(false)

  function updateSearch(nextSearch: CatalogSearch) {
    void navigate({
      search: (previous) => ({ ...previous, ...nextSearch, page: undefined }),
      hash: true,
      hashScrollIntoView: false,
      resetScroll: false,
    })
  }

  function handleSearch(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    const { q } = parseCatalogSearch({ q: fields.get('q') })
    updateSearch({ q })
  }

  return (
    <div className="flex min-w-0 items-center gap-2 pt-10 lg:hidden">
      <form
        role="search"
        onSubmit={handleSearch}
        className="flex min-w-0 flex-1 items-center rounded-xl bg-card text-metadata-foreground focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary dark:bg-border/40"
      >
        <button
          type="submit"
          aria-label="Buscar NFTs"
          className="flex size-11 shrink-0 items-center justify-center rounded-xl focus-visible:outline-2 focus-visible:outline-primary"
        >
          <img src={searchIcon} alt="" className="size-5" />
        </button>
        <label htmlFor="catalog-mobile-search" className="sr-only">
          Explorar coleções
        </label>
        <input
          key={search.q ?? ''}
          id="catalog-mobile-search"
          type="search"
          name="q"
          enterKeyHint="search"
          defaultValue={search.q}
          placeholder="Explorar coleções"
          className="min-h-11 min-w-0 flex-1 bg-transparent pr-3 text-base font-semibold text-foreground outline-none placeholder:text-metadata-foreground"
        />
      </form>

      <Dialog.Root open={filtersOpen} onOpenChange={setFiltersOpen}>
        <Dialog.Trigger asChild>
          <Button
            type="button"
            size="icon-lg"
            aria-label="Abrir filtros"
            className="size-11 rounded-xl"
          >
            <img src={filterIcon} alt="" className="size-5" />
          </Button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/70" />
          <Dialog.Content className="fixed inset-x-3 bottom-3 z-50 mx-auto max-h-[calc(100dvh-1.5rem)] max-w-lg overflow-y-auto rounded-2xl border bg-card p-5 text-card-foreground">
            <div className="flex items-center justify-between gap-2">
              <Dialog.Title className="text-lg font-semibold">
                Filtros do catálogo
              </Dialog.Title>
              <Dialog.Close asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-lg"
                  aria-label="Fechar filtros"
                  className="size-11"
                >
                  <X aria-hidden="true" />
                </Button>
              </Dialog.Close>
            </div>
            <Dialog.Description className="sr-only">
              Combine coleção, rede, faixa de preço e ordem dos resultados.
            </Dialog.Description>

            <CatalogFilters
              search={search}
              onApply={(nextSearch) => {
                setFiltersOpen(false)
                updateSearch(nextSearch)
              }}
            />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}

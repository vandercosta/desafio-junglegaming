import { Search, X } from 'lucide-react'
import { Dialog } from 'radix-ui'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

const views = [
  { label: 'Imagem completa', scale: 1, origin: 'center' },
  { label: 'Detalhe superior', scale: 1.35, origin: 'center top' },
  { label: 'Detalhe central', scale: 1.55, origin: 'center' },
  { label: 'Detalhe inferior', scale: 1.4, origin: 'center bottom' },
]

export default function NftGallery({
  src,
  name,
}: {
  src: string
  name: string
}) {
  const [selected, setSelected] = useState(0)
  const view = views[selected]

  return (
    <section
      aria-label="Galeria do NFT"
      className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,100px)_minmax(0,1fr)] lg:items-start lg:gap-7"
    >
      <div className="hidden gap-4 lg:grid">
        {views.map(({ label, scale, origin }, index) => (
          <button
            key={label}
            type="button"
            aria-label={label}
            aria-pressed={selected === index}
            onClick={() => setSelected(index)}
            className="aspect-square cursor-pointer overflow-hidden rounded-lg border border-transparent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-pressed:border-primary"
          >
            <img
              src={src}
              alt=""
              className="size-full object-cover"
              style={{ transform: `scale(${scale})`, transformOrigin: origin }}
            />
          </button>
        ))}
      </div>

      <Dialog.Root>
        <Dialog.Trigger asChild>
          <button
            type="button"
            aria-label="Ampliar imagem"
            className="relative block aspect-square w-full max-w-[444px] cursor-zoom-in justify-self-center rounded-md bg-surface-card p-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring lg:p-4"
          >
            <span className="block size-full overflow-hidden rounded-2xl">
              <img
                src={src}
                alt={`${name} — ${view.label.toLowerCase()}`}
                width={250}
                height={250}
                className="size-full object-cover"
                style={{
                  transform: `scale(${view.scale})`,
                  transformOrigin: view.origin,
                }}
              />
            </span>
            <span
              aria-hidden="true"
              className="absolute top-3 right-3 grid size-8 place-items-center rounded-full bg-secondary text-secondary-foreground"
            >
              <Search className="size-4" />
            </span>
          </button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/80" />
          <Dialog.Content className="fixed top-1/2 left-1/2 z-50 grid w-[calc(100%-2rem)] max-w-3xl -translate-1/2 gap-3 rounded-xl bg-surface-card p-4">
            <div className="flex items-center justify-between gap-2">
              <Dialog.Title className="font-semibold">
                Imagem ampliada
              </Dialog.Title>
              <Dialog.Close asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Fechar imagem ampliada"
                >
                  <X aria-hidden="true" />
                </Button>
              </Dialog.Close>
            </div>
            <Dialog.Description className="sr-only">
              {name} — {view.label}
            </Dialog.Description>
            <div className="aspect-square w-full max-w-[min(70vh,100%)] justify-self-center overflow-hidden rounded-lg">
              <img
                src={src}
                alt={name}
                className="size-full object-cover"
                style={{
                  transform: `scale(${view.scale * 1.2})`,
                  transformOrigin: view.origin,
                }}
              />
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  )
}

import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useState } from 'react'
import banner from '@/assets/images/banner.png'
import { Button } from '@/components/ui/button'
import { parseCatalogSearch } from '@/features/catalog/catalog-search'

const featuredSlide = {
  desktopTitle: 'Seja dono do futuro da arte digital',
  mobileTitle: 'Seja dono da cultura digital',
  desktopDescription:
    'Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie artistas e tenha uma parte da cultura da internet.',
  mobileDescription: 'Descubra NFTs selecionados de criadores do mundo todo.',
  image: banner,
}

const slides = [featuredSlide, featuredSlide, featuredSlide]

export default function HomeCarousel() {
  const [current, setCurrent] = useState(0)
  const slide = slides[current]

  return (
    <section
      aria-label="Destaques da Kurio"
      aria-roledescription="carrossel"
      className="relative mb-8 rounded-[30px] bg-surface-dark bg-[radial-gradient(ellipse_at_top_left,color-mix(in_srgb,var(--primary)_40%,transparent),transparent)] lg:mb-24 lg:bg-transparent lg:bg-none"
    >
      <div
        id="destaque-atual"
        role="group"
        aria-roledescription="slide"
        aria-label={`${current + 1} de ${slides.length}`}
        className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] items-start gap-2 p-4 pb-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,37.5%)] lg:items-center lg:gap-12 lg:p-0 lg:pl-10"
      >
        <div className="min-w-0">
          <p className="text-xs font-medium lg:text-sm lg:tracking-widest">
            Bem-vindo à Kurio
          </p>
          <h1 className="mt-2 text-lg leading-relaxed font-bold uppercase lg:mt-4 lg:max-w-[600px] lg:text-[43px]/[70px]">
            <span className="lg:hidden">{slide.mobileTitle}</span>
            <span className="hidden lg:inline">{slide.desktopTitle}</span>
          </h1>
          <p className="mt-2 text-xs/relaxed text-muted-foreground lg:mt-3 lg:max-w-[557px] lg:text-sm/6">
            <span className="lg:hidden">{slide.mobileDescription}</span>
            <span className="hidden lg:inline">{slide.desktopDescription}</span>
          </p>
          <Button
            asChild
            variant="link"
            className="h-9 px-0 font-bold uppercase lg:mt-8 lg:h-10 lg:min-w-35 lg:bg-primary lg:px-5 lg:text-primary-foreground lg:hover:no-underline"
          >
            <Link to="/" hash="catalogo" search={parseCatalogSearch}>
              Explorar <ArrowRight aria-hidden="true" className="lg:hidden" />
            </Link>
          </Button>
        </div>

        <img
          src={slide.image}
          alt="Emerald Ape com óculos escuros e jaqueta verde"
          width={450}
          height={450}
          fetchPriority="high"
          className="aspect-square w-full rounded-2xl object-cover lg:rounded-3xl"
        />
      </div>

      <div
        role="group"
        aria-label="Selecionar slide"
        className="flex justify-center lg:absolute lg:bottom-3 lg:left-1/2 lg:-translate-x-1/2"
      >
        {slides.map((_, index) => (
          <button
            key={index}
            type="button"
            aria-label={`Slide ${index + 1} de ${slides.length}`}
            aria-controls="destaque-atual"
            aria-pressed={current === index}
            onClick={() => setCurrent(index)}
            className="group grid size-8 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-primary"
          >
            <span
              aria-hidden="true"
              className="size-2 rounded-full border border-primary group-aria-pressed:bg-primary"
            />
          </button>
        ))}
      </div>
    </section>
  )
}

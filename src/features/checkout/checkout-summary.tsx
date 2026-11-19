import { Link } from '@tanstack/react-router'
import { formatEth } from '@/lib/eth'
import type { CartResponse } from '@/features/cart/cart-api'
import type { CatalogSearch } from '@/features/catalog/catalog-search'

export default function CheckoutSummary({
  cart,
  label,
  compactOnMobile = false,
  cartSearch,
}: {
  cart: CartResponse
  label: string
  compactOnMobile?: boolean
  cartSearch?: CatalogSearch
}) {
  return (
    <section
      aria-label={label}
      className={
        compactOnMobile
          ? 'hidden min-w-0 content-start gap-3 lg:grid'
          : 'grid min-w-0 content-start gap-3'
      }
    >
      <h2 className="text-lg font-bold">{label}</h2>
      <div
        aria-hidden="true"
        className="flex justify-between border-b border-primary/50 pb-2 text-base font-bold"
      >
        <span>NFTs</span>
        <span>Subtotal</span>
      </div>
      <ul className="grid gap-3">
        {cart.items.map((item) => (
          <li
            key={item.id}
            className="grid min-h-[70px] grid-cols-[1fr_auto] items-center gap-2 bg-surface-card pr-3"
          >
            <div className="flex min-w-0 items-center gap-2">
              {item.imageUrl && (
                <img
                  src={item.imageUrl}
                  alt=""
                  width={70}
                  height={70}
                  className="size-14 shrink-0 rounded-md object-cover xl:size-[70px]"
                />
              )}
              <div className="min-w-0">
                <p className="wrap-anywhere text-sm font-bold xl:text-base">
                  {item.nftName}
                </p>
                <p className="text-xs text-metadata-foreground xl:text-sm">
                  ID do token: #{item.nftId}
                </p>
              </div>
            </div>
            <span className="flex flex-wrap items-baseline justify-end gap-x-2 text-right">
              <span className="text-xs text-muted-foreground">
                (x {item.quantity})
              </span>
              <span className="text-sm font-bold whitespace-nowrap text-text-accent xl:text-base">
                {formatEth(item.lineTotalEth)}
              </span>
            </span>
          </li>
        ))}
      </ul>
      {cartSearch && (
        <Link
          to="/carrinho"
          search={cartSearch}
          className="text-center text-sm hover:text-text-accent hover:underline"
        >
          Tem um código promocional? Aplique aqui
        </Link>
      )}
      {cart.couponCode && (
        <p className="text-sm">Cupom aplicado: {cart.couponCode}</p>
      )}
      <dl className="grid gap-3 text-sm lg:text-[15px]">
        <div className="flex flex-wrap justify-between gap-2">
          <dt>Subtotal</dt>
          <dd>{formatEth(cart.subtotalEth)}</dd>
        </div>
        <div className="flex flex-wrap justify-between gap-2">
          <dt>Desconto do lançamento</dt>
          <dd>
            {cart.discountEth !== '0' ? '−' : ''}
            {formatEth(cart.discountEth)}
          </dd>
        </div>
        <div className="flex flex-wrap justify-between gap-2">
          <dt>Taxa de rede</dt>
          <dd className="text-right">
            <span>{formatEth(cart.networkFeeEth)}</span>
            {cartSearch && (
              <span className="mt-1 block text-xs text-text-accent">
                Taxa estimada
              </span>
            )}
          </dd>
        </div>
        <div className="flex flex-wrap justify-between gap-2 border-t border-primary/50 pt-3 text-base font-bold">
          <dt>Total</dt>
          <dd className="text-lg text-text-accent">
            {formatEth(cart.totalEth)}
          </dd>
        </div>
      </dl>
    </section>
  )
}

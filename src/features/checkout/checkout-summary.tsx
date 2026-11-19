import type { CartResponse } from '@/features/cart/cart-api'

function eth(value: string) {
  return `${value.replace('.', ',')} ETH`
}

export default function CheckoutSummary({
  cart,
  label,
}: {
  cart: CartResponse
  label: string
}) {
  return (
    <section aria-label={label} className="grid min-w-0 content-start gap-4">
      <h2 className="text-lg font-semibold">{label}</h2>
      <ul className="grid gap-2">
        {cart.items.map((item) => (
          <li
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
          >
            <div>
              <p className="font-semibold">{item.nftName}</p>
              <p className="text-sm text-muted-foreground">
                {item.editionLabel} · {item.quantity}{' '}
                {item.quantity === 1 ? 'edição' : 'edições'}
              </p>
            </div>
            <span className="shrink-0">{eth(item.lineTotalEth)}</span>
          </li>
        ))}
      </ul>
      {cart.couponCode && (
        <p className="text-sm">Cupom aplicado: {cart.couponCode}</p>
      )}
      <dl className="grid gap-2 border-t pt-3">
        <div className="flex flex-wrap justify-between gap-2">
          <dt>Subtotal</dt>
          <dd>{eth(cart.subtotalEth)}</dd>
        </div>
        <div className="flex flex-wrap justify-between gap-2">
          <dt>Desconto</dt>
          <dd>
            {cart.discountEth !== '0' && '−'}
            {eth(cart.discountEth)}
          </dd>
        </div>
        <div className="flex flex-wrap justify-between gap-2">
          <dt>Taxa de rede</dt>
          <dd>{eth(cart.networkFeeEth)}</dd>
        </div>
        <div className="flex flex-wrap justify-between gap-2 border-t pt-2 font-semibold">
          <dt>Total</dt>
          <dd>{eth(cart.totalEth)}</dd>
        </div>
      </dl>
    </section>
  )
}

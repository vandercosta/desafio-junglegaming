export function toWei(decimal: string): bigint {
  const [whole = '0', fraction = ''] = decimal.split('.')
  return BigInt(`${whole}${fraction.padEnd(18, '0')}`)
}

export function fromWei(value: bigint): string {
  const digits = value.toString().padStart(19, '0')
  const whole = digits.slice(0, -18)
  const fraction = digits.slice(-18).replace(/0+$/, '')

  return fraction ? `${whole}.${fraction}` : whole
}

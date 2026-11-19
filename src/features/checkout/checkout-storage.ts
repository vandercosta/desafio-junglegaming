import type { Wallet } from '@/features/wallets/wallets-api'
import type {
  CheckoutWalletSlot,
  CollectorInput,
  OrderInput,
} from './checkout-api'

export type CheckoutDraft = {
  collector: CollectorInput
  walletSlot: CheckoutWalletSlot | ''
  network: Wallet['network'] | ''
}

export type CheckoutAttempt = {
  key: string
  input: OrderInput
  orderId?: string
}

function storageKey(kind: 'attempt' | 'draft', userId: string) {
  return `kurio:checkout-${kind}:v1:${userId}`
}

function read<T>(key: string): T | null {
  try {
    return JSON.parse(sessionStorage.getItem(key) ?? 'null') as T | null
  } catch {
    return null
  }
}

export function readCheckoutDraft(userId: string) {
  const draft = read<CheckoutDraft>(storageKey('draft', userId))
  return draft?.collector && typeof draft.walletSlot === 'string' ? draft : null
}

export function saveCheckoutDraft(userId: string, draft: CheckoutDraft) {
  try {
    sessionStorage.setItem(storageKey('draft', userId), JSON.stringify(draft))
  } catch {
    // Editing remains usable when storage is unavailable.
  }
}

export function readCheckoutAttempt(userId: string) {
  const saved = read<CheckoutAttempt>(storageKey('attempt', userId))
  return typeof saved?.key === 'string' &&
    typeof saved.input?.quoteId === 'string'
    ? saved
    : null
}

export function saveCheckoutAttempt(userId: string, attempt: CheckoutAttempt) {
  sessionStorage.setItem(storageKey('attempt', userId), JSON.stringify(attempt))
}

export function removeCheckoutAttempt(userId: string, key: string) {
  if (readCheckoutAttempt(userId)?.key === key) {
    sessionStorage.removeItem(storageKey('attempt', userId))
  }
}

export function removeCheckoutDraft(userId: string) {
  sessionStorage.removeItem(storageKey('draft', userId))
}

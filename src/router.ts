import {
  createRouter,
  defaultParseSearch,
  defaultStringifySearch,
} from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

const textKeys = ['q', 'minEth', 'maxEth'] as const

export const router = createRouter({
  routeTree,

  parseSearch(searchString) {
    const parsed: Record<string, unknown> = {
      ...defaultParseSearch(searchString),
    }
    const params = new URLSearchParams(searchString)

    for (const key of textKeys) {
      const value = params.get(key)
      if (value !== null) parsed[key] = value
    }

    return parsed
  },

  stringifySearch(search) {
    const params = new URLSearchParams(defaultStringifySearch(search))

    for (const key of textKeys) {
      const value: unknown = search[key]
      if (typeof value === 'string') params.set(key, value)
    }

    const query = params.toString()
    return query ? `?${query}` : ''
  },
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

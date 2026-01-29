import { test, describe, expect, vi } from 'vitest'
import { defineProxy, isProxy } from 'comctx'
import type { Adapter } from 'comctx'

const createMockAdapter = (): Adapter => ({
  sendMessage: vi.fn(),
  onMessage: vi.fn()
})

describe('isProxy', () => {
  test('should return false for non-RPC objects', () => {
    expect(isProxy(null)).toBe(false)
    expect(isProxy({})).toBe(false)
    expect(isProxy([])).toBe(false)
    expect(isProxy(() => {})).toBe(false)
  })

  test('should return true for injected RPC proxy', () => {
    const [, inject] = defineProxy(() => ({ getValue: () => 42 }))
    const proxy = inject(createMockAdapter())
    expect(isProxy(proxy)).toBe(true)
  })

  test('should return false for provider object', () => {
    const [provide] = defineProxy(() => ({ getValue: () => 42 }))
    const provided = provide(createMockAdapter())
    expect(isProxy(provided)).toBe(false)
  })

  test('should detect nested proxy (proxy wrapping proxy)', () => {
    // Create first proxy (like background counter)
    const [, injectBackground] = defineProxy(() => ({ getValue: () => 42 }))
    const backgroundCounter = injectBackground(createMockAdapter())

    // Create second proxy that wraps the first one (like content-script bridge)
    const [, injectContent] = defineProxy(() => backgroundCounter)
    const contentCounter = injectContent(createMockAdapter())

    expect(isProxy(backgroundCounter)).toBe(true)
    expect(isProxy(contentCounter)).toBe(true)
  })
})

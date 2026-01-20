import { test, describe, expect, vi } from 'vitest'
import { defineProxy, isRPCProxy } from 'core'
import type { Adapter } from 'core'

const createMockAdapter = (): Adapter => ({
  sendMessage: vi.fn(),
  onMessage: vi.fn()
})

describe('isRPCProxy', () => {
  test('should return false for non-RPC objects', () => {
    expect(isRPCProxy(null)).toBe(false)
    expect(isRPCProxy({})).toBe(false)
    expect(isRPCProxy([])).toBe(false)
    expect(isRPCProxy(() => {})).toBe(false)
  })

  test('should return true for injected RPC proxy', () => {
    const [, inject] = defineProxy(() => ({ getValue: () => 42 }))
    const proxy = inject(createMockAdapter())
    expect(isRPCProxy(proxy)).toBe(true)
  })

  test('should return false for provider object', () => {
    const [provide] = defineProxy(() => ({ getValue: () => 42 }))
    const provided = provide(createMockAdapter())
    expect(isRPCProxy(provided)).toBe(false)
  })

  test('should detect nested proxy (proxy wrapping proxy)', () => {
    // Create first proxy (like background counter)
    const [, injectBackground] = defineProxy(() => ({ getValue: () => 42 }))
    const backgroundCounter = injectBackground(createMockAdapter())

    // Create second proxy that wraps the first one (like content-script bridge)
    const [, injectContent] = defineProxy(() => backgroundCounter)
    const contentCounter = injectContent(createMockAdapter())

    expect(isRPCProxy(backgroundCounter)).toBe(true)
    expect(isRPCProxy(contentCounter)).toBe(true)
  })
})

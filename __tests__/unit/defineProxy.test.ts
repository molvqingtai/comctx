import { test, describe, expect, vi } from 'vitest'
import { defineProxy } from 'comctx'
import type { Adapter } from 'comctx'

describe('defineProxy', () => {
  test('should create provider and injector functions', () => {
    const [provide, inject] = defineProxy(() => ({ getValue: () => 42 }))

    expect(typeof provide).toBe('function')
    expect(typeof inject).toBe('function')
  })

  test('should throw error for invalid heartbeat config', () => {
    expect(() => {
      defineProxy(() => ({}), {
        heartbeatInterval: 1000,
        heartbeatTimeout: 500 // timeout <= interval
      })
    }).toThrow('Invalid heartbeat config')
  })

  test('should accept custom namespace option', () => {
    const [provide] = defineProxy(() => ({}), { namespace: 'custom-ns' })
    expect(typeof provide).toBe('function')
  })

  test('should support Reflect.has with backup option', () => {
    const mockAdapter: Adapter = {
      sendMessage: vi.fn(),
      onMessage: vi.fn()
    }

    // Without backup: empty object, has no properties
    const [, injectWithoutBackup] = defineProxy(() => ({ test: () => 1 }), { backup: false })
    const proxyWithoutBackup = injectWithoutBackup(mockAdapter)
    expect(Reflect.has(proxyWithoutBackup, 'test')).toBe(false)

    // With backup: frozen copy as template, has properties
    const [, injectWithBackup] = defineProxy(() => ({ test: () => 1 }), { backup: true })
    const proxyWithBackup = injectWithBackup(mockAdapter)
    expect(Reflect.has(proxyWithBackup, 'test')).toBe(true)
  })

  test('should create bridge with nested proxy', () => {
    const mockAdapter: Adapter = {
      sendMessage: vi.fn(),
      onMessage: vi.fn()
    }

    // First level: inject from background
    const [, injectBackground] = defineProxy(() => ({ getValue: () => 42 }))
    const backgroundProxy = injectBackground(mockAdapter)

    // Second level: provide the injected proxy as bridge
    const [provideBridge] = defineProxy(() => backgroundProxy)
    const bridgeProxy = provideBridge(mockAdapter)

    // Bridge should return the same proxy
    expect(bridgeProxy).toBe(backgroundProxy)
  })
})

import { test, describe, expect, vi } from 'vitest'
import { defineProxy } from 'comctx'
import type { Adapter } from 'comctx'
import EventHub from '@resreq/event-hub'

describe('defineProxy', () => {
  test('should communicate between provider and injector', async () => {
    const eventHub = new EventHub()

    const providerAdapter: Adapter = {
      sendMessage: (message) => eventHub.emit('provider-to-injector', message),
      onMessage: (callback) => {
        eventHub.on('injector-to-provider', callback)
        return () => eventHub.off('injector-to-provider', callback)
      }
    }

    const injectorAdapter: Adapter = {
      sendMessage: (message) => eventHub.emit('injector-to-provider', message),
      onMessage: (callback) => {
        eventHub.on('provider-to-injector', callback)
        return () => eventHub.off('provider-to-injector', callback)
      }
    }

    const [provide, inject] = defineProxy(
      () => ({
        getValue: async () => 42,
        add: async (a: number, b: number) => a + b
      }),
      { heartbeatCheck: false }
    )

    provide(providerAdapter)
    const proxy = inject(injectorAdapter)

    const result = await proxy.getValue()
    expect(result).toBe(42)

    const sum = await proxy.add(10, 20)
    expect(sum).toBe(30)
  })

  test('should throw error for invalid heartbeat config', () => {
    expect(() => {
      defineProxy(() => ({}), {
        heartbeatInterval: 1000,
        heartbeatTimeout: 500
      })
    }).toThrow('Invalid heartbeat config')
  })

  test('should support Reflect.has with backup option', () => {
    const mockAdapter: Adapter = {
      sendMessage: vi.fn(),
      onMessage: vi.fn()
    }

    const [, injectWithoutBackup] = defineProxy(() => ({ test: () => 1 }), { backup: false })
    const proxyWithoutBackup = injectWithoutBackup(mockAdapter)
    expect(Reflect.has(proxyWithoutBackup, 'test')).toBe(false)

    const [, injectWithBackup] = defineProxy(() => ({ test: () => 1 }), { backup: true })
    const proxyWithBackup = injectWithBackup(mockAdapter)
    expect(Reflect.has(proxyWithBackup, 'test')).toBe(true)
  })

  test('should support callback functions', async () => {
    const eventHub = new EventHub()

    const providerAdapter: Adapter = {
      sendMessage: (message) => eventHub.emit('provider-to-injector', message),
      onMessage: (callback) => {
        eventHub.on('injector-to-provider', callback)
        return () => eventHub.off('injector-to-provider', callback)
      }
    }

    const injectorAdapter: Adapter = {
      sendMessage: (message) => eventHub.emit('injector-to-provider', message),
      onMessage: (callback) => {
        eventHub.on('provider-to-injector', callback)
        return () => eventHub.off('provider-to-injector', callback)
      }
    }

    const [provide, inject] = defineProxy(
      () => ({
        onChange: (callback: (value: number) => void) => {
          callback(100)
        }
      }),
      { heartbeatCheck: false }
    )

    provide(providerAdapter)
    const proxy = inject(injectorAdapter)

    const mockCallback = vi.fn()
    proxy.onChange(mockCallback)

    await vi.waitFor(() => {
      expect(mockCallback).toHaveBeenCalledWith(100)
    })
  })

  test('should timeout when provider is unavailable', async () => {
    const injectorAdapter: Adapter = {
      sendMessage: vi.fn(),
      onMessage: vi.fn()
    }

    const [, inject] = defineProxy(() => ({ getValue: () => 42 }), {
      heartbeatCheck: true,
      heartbeatInterval: 100,
      heartbeatTimeout: 200
    })

    const proxy = inject(injectorAdapter)

    await expect(proxy.getValue()).rejects.toThrow('Provider unavailable: heartbeat check timeout 200ms')
  })

  test('should support deep property access', async () => {
    const eventHub = new EventHub()

    const providerAdapter: Adapter = {
      sendMessage: (message) => eventHub.emit('provider-to-injector', message),
      onMessage: (callback) => {
        eventHub.on('injector-to-provider', callback)
        return () => eventHub.off('injector-to-provider', callback)
      }
    }

    const injectorAdapter: Adapter = {
      sendMessage: (message) => eventHub.emit('injector-to-provider', message),
      onMessage: (callback) => {
        eventHub.on('provider-to-injector', callback)
        return () => eventHub.off('provider-to-injector', callback)
      }
    }

    const [provide, inject] = defineProxy(
      () => ({
        foo: {
          bar: {
            getValue: async () => 123
          }
        }
      }),
      { heartbeatCheck: false }
    )

    provide(providerAdapter)
    const proxy = inject(injectorAdapter)

    const result = await proxy.foo.bar.getValue()
    expect(result).toBe(123)
  })
})

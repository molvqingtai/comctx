import { test, describe, expect, vi } from 'vitest'
import { defineProxy, MESSAGE_SENDER_TYPE, MESSAGE_TYPE } from 'comctx'
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

  test('should support nested proxy (proxy wrapping proxy)', async () => {
    const backgroundEventHub = new EventHub()
    const contentScriptEventHub = new EventHub()

    // Background <-> Content Script adapters
    const backgroundProviderAdapter: Adapter = {
      sendMessage: (message) => backgroundEventHub.emit('background-to-content-script', message),
      onMessage: (callback) => {
        backgroundEventHub.on('content-script-to-background', callback)
        return () => backgroundEventHub.off('content-script-to-background', callback)
      }
    }

    const backgroundInjectorAdapter: Adapter = {
      sendMessage: (message) => backgroundEventHub.emit('content-script-to-background', message),
      onMessage: (callback) => {
        backgroundEventHub.on('background-to-content-script', callback)
        return () => backgroundEventHub.off('background-to-content-script', callback)
      }
    }

    // Content Script <-> Page adapters
    const contentScriptProviderAdapter: Adapter = {
      sendMessage: (message) => contentScriptEventHub.emit('content-script-to-page', message),
      onMessage: (callback) => {
        contentScriptEventHub.on('page-to-content-script', callback)
        return () => contentScriptEventHub.off('page-to-content-script', callback)
      }
    }

    const pageInjectorAdapter: Adapter = {
      sendMessage: (message) => contentScriptEventHub.emit('page-to-content-script', message),
      onMessage: (callback) => {
        contentScriptEventHub.on('content-script-to-page', callback)
        return () => contentScriptEventHub.off('content-script-to-page', callback)
      }
    }

    // Background provides actual implementation
    const [provideBackground, injectBackground] = defineProxy(
      () => ({
        getValue: async () => 42,
        add: async (a: number, b: number) => a + b
      }),
      { heartbeatCheck: false }
    )

    provideBackground(backgroundProviderAdapter)
    const backgroundProxy = injectBackground(backgroundInjectorAdapter)

    // Content Script bridges background proxy to page
    const [provideContentScript, injectContentScript] = defineProxy(() => backgroundProxy, { heartbeatCheck: false })

    provideContentScript(contentScriptProviderAdapter)
    const pageProxy = injectContentScript(pageInjectorAdapter)

    // Page calls through the chain: Page -> Content Script -> Background
    const result = await pageProxy.getValue()
    expect(result).toBe(42)

    const sum = await pageProxy.add(10, 20)
    expect(sum).toBe(30)
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

  test('should log message and event messages when debug is enabled', async () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
    const eventHub = new EventHub()

    const providerAdapter: Adapter = {
      name: 'provider-test',
      sendMessage: (message) => eventHub.emit('provider-to-injector', message),
      onMessage: (callback) => {
        eventHub.on('injector-to-provider', callback)
        return () => eventHub.off('injector-to-provider', callback)
      }
    }

    const injectorAdapter: Adapter = {
      name: 'injector-test',
      sendMessage: (message) => eventHub.emit('injector-to-provider', message),
      onMessage: (callback) => {
        eventHub.on('provider-to-injector', callback)
        return () => eventHub.off('provider-to-injector', callback)
      }
    }

    const [provide, inject] = defineProxy(() => ({ getValue: () => 42 }), {
      heartbeatCheck: false,
      debug: true
    })

    try {
      provide(providerAdapter)
      const proxy = inject(injectorAdapter)

      await expect(proxy.getValue()).resolves.toBe(42)
      expect(debugSpy).toHaveBeenCalledWith(
        '%ccomctx:message%c %cinjector%c %csendMessage%c %capply%c',
        'color: #0ea5e9',
        '',
        'color: #0891b2',
        '',
        'color: #f97316',
        '',
        'color: #2563eb',
        '',
        expect.objectContaining({
          sender: expect.objectContaining({ type: MESSAGE_SENDER_TYPE.INJECTOR, name: 'injector-test' }),
          type: MESSAGE_TYPE.APPLY,
          path: ['getValue']
        })
      )
      expect(debugSpy).toHaveBeenCalledWith(
        '%ccomctx:event%c %cinjector%c %csendMessage%c %capply%c',
        'color: #fff; background: #0ea5e9; border-radius: 3px; padding: 1px 4px;',
        '',
        'color: #fff; background: #0891b2; border-radius: 3px; padding: 1px 4px;',
        '',
        'color: #fff; background: #f97316; border-radius: 3px; padding: 1px 4px;',
        '',
        'color: #2563eb',
        '',
        expect.objectContaining({
          sender: expect.objectContaining({ type: MESSAGE_SENDER_TYPE.INJECTOR, name: 'injector-test' }),
          type: MESSAGE_TYPE.APPLY,
          path: ['getValue']
        })
      )
      expect(debugSpy).toHaveBeenCalledWith(
        '%ccomctx:message%c %cprovider%c %conMessage%c %capply%c',
        'color: #0ea5e9',
        '',
        'color: #8b5cf6',
        '',
        'color: #22c55e',
        '',
        'color: #2563eb',
        '',
        expect.objectContaining({
          sender: expect.objectContaining({ type: MESSAGE_SENDER_TYPE.INJECTOR, name: 'injector-test' }),
          type: MESSAGE_TYPE.APPLY,
          path: ['getValue']
        })
      )
      expect(debugSpy).toHaveBeenCalledWith(
        '%ccomctx:message%c %cprovider%c %csendMessage%c %capply%c',
        'color: #0ea5e9',
        '',
        'color: #8b5cf6',
        '',
        'color: #f97316',
        '',
        'color: #2563eb',
        '',
        expect.objectContaining({
          sender: expect.objectContaining({ type: MESSAGE_SENDER_TYPE.PROVIDER, name: 'provider-test' }),
          type: MESSAGE_TYPE.APPLY,
          path: ['getValue'],
          data: 42
        })
      )
      expect(debugSpy).toHaveBeenCalledWith(
        '%ccomctx:event%c %cprovider%c %conMessage%c %capply%c',
        'color: #fff; background: #0ea5e9; border-radius: 3px; padding: 1px 4px;',
        '',
        'color: #fff; background: #8b5cf6; border-radius: 3px; padding: 1px 4px;',
        '',
        'color: #fff; background: #22c55e; border-radius: 3px; padding: 1px 4px;',
        '',
        'color: #2563eb',
        '',
        expect.objectContaining({
          sender: expect.objectContaining({ type: MESSAGE_SENDER_TYPE.INJECTOR, name: 'injector-test' }),
          type: MESSAGE_TYPE.APPLY,
          path: ['getValue']
        })
      )
      expect(debugSpy).toHaveBeenCalledWith(
        '%ccomctx:message%c %cinjector%c %conMessage%c %capply%c',
        'color: #0ea5e9',
        '',
        'color: #0891b2',
        '',
        'color: #22c55e',
        '',
        'color: #2563eb',
        '',
        expect.objectContaining({
          sender: expect.objectContaining({ type: MESSAGE_SENDER_TYPE.PROVIDER, name: 'provider-test' }),
          type: MESSAGE_TYPE.APPLY,
          path: ['getValue'],
          data: 42
        })
      )
      expect(debugSpy).toHaveBeenCalledWith(
        '%ccomctx:event%c %cinjector%c %conMessage%c %capply%c',
        'color: #fff; background: #0ea5e9; border-radius: 3px; padding: 1px 4px;',
        '',
        'color: #fff; background: #0891b2; border-radius: 3px; padding: 1px 4px;',
        '',
        'color: #fff; background: #22c55e; border-radius: 3px; padding: 1px 4px;',
        '',
        'color: #2563eb',
        '',
        expect.objectContaining({
          sender: expect.objectContaining({ type: MESSAGE_SENDER_TYPE.PROVIDER, name: 'provider-test' }),
          type: MESSAGE_TYPE.APPLY,
          path: ['getValue'],
          data: 42
        })
      )
    } finally {
      debugSpy.mockRestore()
    }
  })

  test('should log event onMessage actor instead of message sender', async () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
    const eventHub = new EventHub()

    const providerAdapter: Adapter = {
      name: 'provider-test',
      sendMessage: (message) => eventHub.emit('provider-to-injector', message),
      onMessage: (callback) => {
        eventHub.on('injector-to-provider', callback)
        return () => eventHub.off('injector-to-provider', callback)
      }
    }

    const injectorAdapter: Adapter = {
      name: 'injector-test',
      sendMessage: (message) => eventHub.emit('injector-to-provider', message),
      onMessage: (callback) => {
        eventHub.on('provider-to-injector', callback)
        return () => eventHub.off('provider-to-injector', callback)
      }
    }

    const [provide, inject] = defineProxy(() => ({ getValue: () => 42 }), {
      heartbeatInterval: 10,
      heartbeatTimeout: 100,
      debug: true
    })

    try {
      provide(providerAdapter)
      const proxy = inject(injectorAdapter)

      await expect(proxy.getValue()).resolves.toBe(42)
      expect(debugSpy).toHaveBeenCalledWith(
        '%ccomctx:message%c %cprovider%c %conMessage%c %cping%c',
        'color: #0ea5e9',
        '',
        'color: #8b5cf6',
        '',
        'color: #22c55e',
        '',
        'color: #eab308',
        '',
        expect.objectContaining({
          sender: expect.objectContaining({ type: MESSAGE_SENDER_TYPE.INJECTOR, name: 'injector-test' }),
          type: MESSAGE_TYPE.PING
        })
      )
      expect(debugSpy).toHaveBeenCalledWith(
        '%ccomctx:event%c %cprovider%c %conMessage%c %cping%c',
        'color: #fff; background: #0ea5e9; border-radius: 3px; padding: 1px 4px;',
        '',
        'color: #fff; background: #8b5cf6; border-radius: 3px; padding: 1px 4px;',
        '',
        'color: #fff; background: #22c55e; border-radius: 3px; padding: 1px 4px;',
        '',
        'color: #eab308',
        '',
        expect.objectContaining({
          sender: expect.objectContaining({ type: MESSAGE_SENDER_TYPE.INJECTOR, name: 'injector-test' }),
          type: MESSAGE_TYPE.PING
        })
      )
      expect(debugSpy).toHaveBeenCalledWith(
        '%ccomctx:message%c %cinjector%c %conMessage%c %cpong%c',
        'color: #0ea5e9',
        '',
        'color: #0891b2',
        '',
        'color: #22c55e',
        '',
        'color: #14b8a6',
        '',
        expect.objectContaining({
          sender: expect.objectContaining({ type: MESSAGE_SENDER_TYPE.PROVIDER, name: 'provider-test' }),
          type: MESSAGE_TYPE.PONG
        })
      )
      expect(debugSpy).toHaveBeenCalledWith(
        '%ccomctx:event%c %cinjector%c %conMessage%c %cpong%c',
        'color: #fff; background: #0ea5e9; border-radius: 3px; padding: 1px 4px;',
        '',
        'color: #fff; background: #0891b2; border-radius: 3px; padding: 1px 4px;',
        '',
        'color: #fff; background: #22c55e; border-radius: 3px; padding: 1px 4px;',
        '',
        'color: #14b8a6',
        '',
        expect.objectContaining({
          sender: expect.objectContaining({ type: MESSAGE_SENDER_TYPE.PROVIDER, name: 'provider-test' }),
          type: MESSAGE_TYPE.PONG
        })
      )
    } finally {
      debugSpy.mockRestore()
    }
  })

  test('should filter debug logs by event level', async () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
    const eventHub = new EventHub()

    const providerAdapter: Adapter = {
      name: 'provider-test',
      sendMessage: (message) => eventHub.emit('provider-to-injector', message),
      onMessage: (callback) => {
        eventHub.on('injector-to-provider', callback)
        return () => eventHub.off('injector-to-provider', callback)
      }
    }

    const injectorAdapter: Adapter = {
      name: 'injector-test',
      sendMessage: (message) => eventHub.emit('injector-to-provider', message),
      onMessage: (callback) => {
        eventHub.on('provider-to-injector', callback)
        return () => eventHub.off('provider-to-injector', callback)
      }
    }

    const [provide, inject] = defineProxy(() => ({ getValue: () => 42 }), {
      heartbeatCheck: false,
      debug: 'event'
    })

    try {
      provide(providerAdapter)
      const proxy = inject(injectorAdapter)

      await expect(proxy.getValue()).resolves.toBe(42)
      expect(debugSpy).toHaveBeenCalledWith(
        '%ccomctx:event%c %cinjector%c %csendMessage%c %capply%c',
        'color: #fff; background: #0ea5e9; border-radius: 3px; padding: 1px 4px;',
        '',
        'color: #fff; background: #0891b2; border-radius: 3px; padding: 1px 4px;',
        '',
        'color: #fff; background: #f97316; border-radius: 3px; padding: 1px 4px;',
        '',
        'color: #2563eb',
        '',
        expect.objectContaining({
          sender: expect.objectContaining({ type: MESSAGE_SENDER_TYPE.INJECTOR, name: 'injector-test' }),
          type: MESSAGE_TYPE.APPLY,
          path: ['getValue']
        })
      )
      expect(debugSpy.mock.calls.some(([format]) => String(format).includes('comctx:message'))).toBe(false)
    } finally {
      debugSpy.mockRestore()
    }
  })

  test('should filter debug logs by message level', async () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
    const eventHub = new EventHub()

    const providerAdapter: Adapter = {
      name: 'provider-test',
      sendMessage: (message) => eventHub.emit('provider-to-injector', message),
      onMessage: (callback) => {
        eventHub.on('injector-to-provider', callback)
        return () => eventHub.off('injector-to-provider', callback)
      }
    }

    const injectorAdapter: Adapter = {
      name: 'injector-test',
      sendMessage: (message) => eventHub.emit('injector-to-provider', message),
      onMessage: (callback) => {
        eventHub.on('provider-to-injector', callback)
        return () => eventHub.off('provider-to-injector', callback)
      }
    }

    const [provide, inject] = defineProxy(() => ({ getValue: () => 42 }), {
      heartbeatCheck: false,
      debug: 'message'
    })

    try {
      provide(providerAdapter)
      const proxy = inject(injectorAdapter)

      await expect(proxy.getValue()).resolves.toBe(42)
      expect(debugSpy).toHaveBeenCalledWith(
        '%ccomctx:message%c %cinjector%c %csendMessage%c %capply%c',
        'color: #0ea5e9',
        '',
        'color: #0891b2',
        '',
        'color: #f97316',
        '',
        'color: #2563eb',
        '',
        expect.objectContaining({
          sender: expect.objectContaining({ type: MESSAGE_SENDER_TYPE.INJECTOR, name: 'injector-test' }),
          type: MESSAGE_TYPE.APPLY,
          path: ['getValue']
        })
      )
      expect(debugSpy.mock.calls.some(([format]) => String(format).includes('comctx:event'))).toBe(false)
    } finally {
      debugSpy.mockRestore()
    }
  })
})

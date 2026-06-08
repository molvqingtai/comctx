import uuid from '@/utils/uuid'
import setIntervalImmediate from '@/utils/setIntervalImmediate'
import extractTransfer from '@/utils/extractTransfer'
import { checkMessage, Message, MESSAGE_SENDER, MESSAGE_TYPE, MessageMeta } from './protocol'

const PROXY_MARKER = Symbol('PROXY_MARKER')

type MaybePromise<T> = T | Promise<T>

export type OffMessage = () => MaybePromise<void>

export type SendMessage<T extends MessageMeta = MessageMeta> = (
  message: Message<T>,
  transfer: Transferable[]
) => MaybePromise<void>

export type OnMessage<T extends MessageMeta = MessageMeta> = (
  callback: (message?: Partial<Message<T>>) => void
) => MaybePromise<OffMessage | void>

export interface Adapter<T extends MessageMeta = MessageMeta> {
  sendMessage: SendMessage<T>
  onMessage: OnMessage<T>
}

export type Context<T extends Record<string, any> = Record<string, any>> = (...args: any[]) => T

export interface Options {
  namespace?: string
  heartbeatCheck?: boolean
  heartbeatInterval?: number
  heartbeatTimeout?: number
  transfer?: boolean
  backup?: boolean
  debug?: boolean
}

export const isProxy = (target: any) => {
  return (
    target !== null && (typeof target === 'object' || typeof target === 'function') && target[PROXY_MARKER] === true
  )
}

const checkHeartbeat = async (adapter: Adapter, options: Required<Options>) => {
  const { promise, resolve, reject } = Promise.withResolvers<void>()
  const offMessages = new Set<OffMessage>()

  const clearHeartbeatInterval = setIntervalImmediate(async () => {
    try {
      const messageId = uuid()
      const offMessage = await adapter.onMessage((message) => {
        const _message = message as Message
        if (_message.namespace !== options.namespace) return
        if (_message.sender !== MESSAGE_SENDER.PROVIDER) return
        if (_message.type !== MESSAGE_TYPE.PONG) return
        if (_message.id !== messageId) return
        resolve()
      })

      offMessage && offMessages.add(offMessage)

      const pingMessage: Message = {
        type: MESSAGE_TYPE.PING,
        sender: MESSAGE_SENDER.INJECTOR,
        id: messageId,
        path: [],
        meta: {},
        namespace: options.namespace,
        timeStamp: Date.now()
      }
      adapter.sendMessage(pingMessage, [])
    } catch (error) {
      reject(error)
    }
  }, options.heartbeatInterval)

  const heartbeatTimeout = setTimeout(
    () => reject(new Error(`Provider unavailable: heartbeat check timeout ${options.heartbeatTimeout}ms.`)),
    options.heartbeatTimeout
  )

  await promise.finally(() => {
    clearHeartbeatInterval()
    clearTimeout(heartbeatTimeout)
    offMessages.forEach((offMessage) => offMessage())
    offMessages.clear()
  })
}

const withCheckMessage = (adapter: Adapter): Adapter => ({
  sendMessage: (message, transfer) => {
    return adapter.sendMessage(message, transfer)
  },
  onMessage: (callback) => {
    return adapter.onMessage((message) => {
      if (!checkMessage(message)) return
      return callback(message)
    })
  }
})

const withExtractTransfer = (adapter: Adapter, options: Required<Options>): Adapter => ({
  sendMessage: (message, transfer) => {
    return adapter.sendMessage(message, options.transfer ? extractTransfer(message) : transfer)
  },
  onMessage: (callback) => {
    return adapter.onMessage(callback)
  }
})

const withDebugLogger = (adapter: Adapter, options: Required<Options>): Adapter => ({
  sendMessage: (message, transfer) => {
    options.debug && console.debug('[comctx] sendMessage:', message, transfer)
    return adapter.sendMessage(message, transfer)
  },
  onMessage: (callback) => {
    return adapter.onMessage((message) => {
      options.debug && console.debug('[comctx] onMessage:', message)
      return callback(message)
    })
  }
})

const withCheckHeartbeat = (adapter: Adapter, options: Required<Options>): Adapter => ({
  sendMessage: async (message, transfer) => {
    if (options.heartbeatCheck && message.sender === MESSAGE_SENDER.INJECTOR && message.type === MESSAGE_TYPE.APPLY) {
      await checkHeartbeat(adapter, options)
    }

    return adapter.sendMessage(message, transfer)
  },
  onMessage: (callback) => {
    return adapter.onMessage(callback)
  }
})

const composeAdapter = (adapter: Adapter, options: Required<Options>) => {
  return withCheckHeartbeat(withDebugLogger(withExtractTransfer(withCheckMessage(adapter), options), options), options)
}

const createProvide = <T extends Record<string, any>>(target: T, adapter: Adapter, options: Required<Options>) => {
  adapter.onMessage(async (message) => {
    const _message = message as Message
    if (_message.namespace !== options.namespace) return
    if (_message.sender !== MESSAGE_SENDER.INJECTOR) return

    switch (_message!.type) {
      case MESSAGE_TYPE.PING: {
        const pongMessage: Message = {
          type: MESSAGE_TYPE.PONG,
          sender: MESSAGE_SENDER.PROVIDER,
          id: _message.id,
          path: _message.path,
          meta: _message.meta,
          namespace: options.namespace,
          timeStamp: Date.now()
        }
        adapter.sendMessage(pongMessage, [])
        break
      }
      case MESSAGE_TYPE.APPLY: {
        try {
          const mapArgs = _message.args?.map((arg) => {
            if (_message.callbackIds?.includes(arg)) {
              return (...args: any[]) => {
                const callbackMessage: Message = {
                  type: MESSAGE_TYPE.CALLBACK,
                  sender: MESSAGE_SENDER.PROVIDER,
                  id: arg,
                  path: _message.path,
                  meta: _message.meta,
                  data: args,
                  namespace: options.namespace,
                  timeStamp: Date.now()
                }
                adapter.sendMessage(callbackMessage, [])
              }
            } else {
              return arg
            }
          })
          // @ts-expect-error: initial write
          _message.data = await (
            _message.path?.reduce((acc, key) => acc[key], target) as unknown as (...args: any[]) => any
          ).apply(target, mapArgs || [])
        } catch (error) {
          // @ts-expect-error: initial write
          _message.error = (error as Error).message
        }
        const responseMessage: Message = {
          type: MESSAGE_TYPE.APPLY,
          sender: MESSAGE_SENDER.PROVIDER,
          id: _message.id,
          path: _message.path,
          data: _message.data,
          error: _message.error,
          meta: _message.meta,
          namespace: options.namespace,
          timeStamp: Date.now()
        }
        adapter.sendMessage(responseMessage, [])
        break
      }
    }
  })
  return target
}

const createInject = <T extends Record<string, any>>(source: T, adapter: Adapter, options: Required<Options>) => {
  const createProxy = (target: T, path: string[]) => {
    const proxy = new Proxy<T>(target, {
      get(_target, key, receiver) {
        if (key === PROXY_MARKER) {
          return true
        }
        /**
         * Return built-in function properties directly to support the apply trap.
         *
         * Problem: When the apply trap is invoked, JavaScript engine needs to verify that
         * the target is callable by checking function properties (apply, call, bind, etc.).
         * If we create a new proxy for these properties, the apply trap will fail with:
         * "Function.prototype.apply was called on an object that is not a function"
         *
         * Solution: Directly return these built-in properties from the function target,
         * allowing the apply trap to work correctly for RPC method calls.
         *
         * This enables:
         * 1. Deep property access: counter.foo.bar.getValue()
         * 2. Bridge pattern: defineProxy(() => proxy)
         */
        if (
          typeof _target === 'function' &&
          (key === 'apply' || key === 'call' || key === 'bind' || key === 'length' || key === 'name')
        ) {
          return Reflect.get(_target, key, receiver)
        }
        // Create new proxy node for deep access
        return createProxy((() => {}) as unknown as T, [...path, key] as string[])
      },
      apply(_target, _this, args) {
        return new Promise<Message>(async (resolve, reject) => {
          try {
            const callbackIds: string[] = []
            const mapArgs = args.map((arg) => {
              if (typeof arg === 'function') {
                const callbackId = uuid()
                callbackIds.push(callbackId)
                adapter.onMessage((message) => {
                  const _message = message as Message
                  if (_message.namespace !== options.namespace) return
                  if (_message.sender !== MESSAGE_SENDER.PROVIDER) return
                  if (_message.type !== MESSAGE_TYPE.CALLBACK) return
                  if (_message.id !== callbackId) return
                  arg(..._message.data)
                })
                return callbackId
              } else {
                return arg
              }
            })

            const messageId = uuid()
            const offMessage = await adapter.onMessage((message) => {
              const _message = message as Message
              if (_message.namespace !== options.namespace) return
              if (_message.sender !== MESSAGE_SENDER.PROVIDER) return
              if (_message.type !== MESSAGE_TYPE.APPLY) return
              if (_message.id !== messageId) return
              _message.error ? reject(new Error(_message.error)) : resolve(_message.data)
              offMessage?.()
            })

            const applyMessage: Message = {
              type: MESSAGE_TYPE.APPLY,
              sender: MESSAGE_SENDER.INJECTOR,
              id: messageId,
              path,
              args: mapArgs,
              meta: {},
              callbackIds,
              timeStamp: Date.now(),
              namespace: options.namespace
            }
            await adapter.sendMessage(applyMessage, [])
          } catch (error) {
            reject(error)
          }
        })
      }
    })

    return proxy
  }

  return createProxy(source, [])
}

const provideProxy = <T extends Context>(context: T, options: Required<Options>) => {
  let target: ReturnType<T>
  return <M extends MessageMeta = MessageMeta>(adapter: Adapter<M>, ...args: Parameters<T>) =>
    (target ??= createProvide(context(...args) as ReturnType<T>, composeAdapter(adapter as Adapter, options), options))
}

const injectProxy = <T extends Context>(context: T, options: Required<Options>) => {
  let target: ReturnType<T>
  return <M extends MessageMeta = MessageMeta>(adapter: Adapter<M>) =>
    (target ??= createInject(
      (options.backup ? Object.freeze(context()) : {}) as ReturnType<T>,
      composeAdapter(adapter as Adapter, options),
      options
    ))
}

/**
 * Creates a pair of proxies for the provider (provide) and injector (inject) to facilitate method calls and callbacks across communication layers.
 *
 * @param context - A factory function that returns the target object to be proxied:
 *   - For the provider: Returns an object containing the actual method implementations that handle remote calls from injectors.
 *   - For the injector: Returns an object used for TypeScript type inference (actual calls are made through RPC proxy).
 * @param options - Configuration options:
 *   - namespace: The communication namespace used to isolate messages between different proxy instances (default is '__comctx__').
 *   - heartbeatCheck: Enable provider readiness check (default: true).
 *   - heartbeatInterval: The frequency at which to request heartbeats in milliseconds (default: 300).
 *   - heartbeatTimeout: Max wait time for heartbeat response in milliseconds (default: 1000).
 *   - transfer: Whether to use transferable objects for message transfer (default is false).
 *   - backup: Whether to use a backup implementation of the original object in the injector (default is false).
 *   - debug: Whether to log adapter messages for debugging (default is false).
 * @returns Returns a tuple containing two elements:
 *   - [0] provideProxy: Accepts an adapter and creates a provider proxy.
 *   - [1] injectProxy: Accepts an adapter and creates an injector proxy.
 *
 * @example
 * const [provide, inject] = defineProxy(() => ({
 *   add: (a, b) => a + b
 * }), { namespace: 'math' })
 *
 * // Provider
 * provide(providerAdapter)
 *
 * // Injector
 * const math = inject(injectorAdapter)
 * await math.add(2, 3) // 5
 */
export const defineProxy = <T extends Context>(context: T, options?: Options) => {
  const mergedOptions = {
    namespace: options?.namespace ?? '__comctx__',
    heartbeatCheck: options?.heartbeatCheck ?? true,
    heartbeatInterval: options?.heartbeatInterval ?? 300,
    heartbeatTimeout: options?.heartbeatTimeout ?? 1000,
    transfer: options?.transfer ?? false,
    backup: options?.backup ?? false,
    debug: options?.debug ?? false
  }

  if (mergedOptions.heartbeatTimeout <= mergedOptions.heartbeatInterval) {
    throw new Error(
      `Invalid heartbeat config: timeout (${mergedOptions.heartbeatTimeout}ms) must exceed interval (${mergedOptions.heartbeatInterval}ms).`
    )
  }

  return [provideProxy(context, mergedOptions), injectProxy(context, mergedOptions)] as const
}

export default defineProxy

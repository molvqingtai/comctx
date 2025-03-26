import uuid from '@/utils/uuid'
import setIntervalImmediate from '@/utils/setIntervalImmediate'

type MaybePromise<T> = T | Promise<T>

export interface Options {
  namespace?: string
  heartbeatCheck?: boolean
  heartbeatInterval?: number
  heartbeatTimeout?: number
  backup?: boolean
}

export interface Message {
  type: 'apply' | 'callback' | 'ping' | 'pong'
  id: string
  path: string[]
  sender: 'provide' | 'inject'
  callbackIds?: string[]
  args: any[]
  error?: string
  data?: any
  namespace: string
  timeStamp: number
}

export type OffMessage = () => MaybePromise<void>

export type SendMessage<M extends Message = Message> = (message: M) => MaybePromise<void>

export type OnMessage<M extends Message = Message> = (
  callback: (message?: Partial<M>) => void
) => MaybePromise<OffMessage | void>

export interface Adapter<M extends Message = Message> {
  sendMessage: SendMessage<M>
  onMessage: OnMessage<M>
}

const isInvalidMessage = (message?: Partial<Message>) => {
  return (
    !message ||
    !message.type ||
    !message.id ||
    !message.path ||
    !message.sender ||
    !message.args ||
    !message.namespace ||
    !message.timeStamp
  )
}

const heartbeatCheck = async (adapter: Adapter, options: Required<Options>) => {
  let clearIntervalImmediate: (() => void) | undefined

  const heartbeatInterval = new Promise<void>((resolve, reject) => {
    clearIntervalImmediate = setIntervalImmediate(async () => {
      try {
        const messageId = uuid()
        const offMessage = await adapter.onMessage((message) => {
          if (isInvalidMessage(message)) return
          const _message = message as Message
          if (_message.namespace !== options.namespace) return
          if (_message.sender !== 'provide') return
          if (_message.type !== 'pong') return
          if (_message.id !== messageId) return
          clearIntervalImmediate?.()
          offMessage?.()
          resolve()
        })
        adapter.sendMessage({
          type: 'ping',
          id: messageId,
          path: [],
          sender: 'inject',
          args: [],
          namespace: options.namespace,
          timeStamp: Date.now()
        })
      } catch (error) {
        clearIntervalImmediate?.()
        reject(error)
      }
    }, options.heartbeatInterval)
  })

  const heartbeatTimeout = new Promise<void>((_, reject) => {
    setTimeout(
      () => reject(new Error(`Provider unavailable: heartbeat check timeout ${options.heartbeatTimeout}ms.`)),
      options.heartbeatTimeout
    )
  })

  await Promise.race([heartbeatInterval, heartbeatTimeout]).finally(() => clearIntervalImmediate?.())
}

const createProvide = <T extends Record<string, any>>(target: T, adapter: Adapter, options: Required<Options>) => {
  adapter.onMessage(async (message) => {
    if (isInvalidMessage(message)) return
    const _message = message as Message
    if (_message.namespace !== options.namespace) return
    if (_message.sender !== 'inject') return

    switch (_message!.type) {
      case 'ping': {
        adapter.sendMessage({
          ..._message!,
          type: 'pong',
          sender: 'provide',
          namespace: options.namespace,
          timeStamp: Date.now()
        })
        break
      }
      case 'apply': {
        try {
          const mapArgs = _message.args?.map((arg) => {
            if (_message.callbackIds?.includes(arg)) {
              return (...args: any[]) => {
                adapter.sendMessage({
                  ..._message,
                  id: arg,
                  data: args,
                  type: 'callback',
                  sender: 'provide',
                  namespace: options.namespace,
                  timeStamp: Date.now()
                })
              }
            } else {
              return arg
            }
          })
          _message.data = await (
            _message.path?.reduce((acc, key) => acc[key], target) as unknown as (...args: any[]) => any
          ).apply(target, mapArgs)
        } catch (error) {
          _message.error = (error as Error).message
        }
        adapter.sendMessage({
          ..._message,
          type: 'apply',
          sender: 'provide',
          namespace: options.namespace,
          timeStamp: Date.now()
        })
        break
      }
    }
  })
  return target
}

const createInject = <T extends Record<string, any>>(source: T, adapter: Adapter, options: Required<Options>) => {
  const createProxy = (target: T, path: string[]) => {
    const proxy = new Proxy<T>(target, {
      get(_target, key: string) {
        return createProxy((() => {}) as unknown as T, [...path, key] as string[])
      },
      apply(_target, _thisArg, args) {
        return new Promise<Message>(async (resolve, reject) => {
          try {
            options.heartbeatCheck && (await heartbeatCheck(adapter, options))

            const callbackIds: string[] = []
            const mapArgs = args.map((arg) => {
              if (typeof arg === 'function') {
                const callbackId = uuid()
                callbackIds.push(callbackId)
                adapter.onMessage((message) => {
                  if (isInvalidMessage(message)) return
                  const _message = message as Message
                  if (_message.namespace !== options.namespace) return
                  if (_message.sender !== 'provide') return
                  if (_message.type !== 'callback') return
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
              if (isInvalidMessage(message)) return
              const _message = message as Message
              if (_message.namespace !== options.namespace) return
              if (_message.sender !== 'provide') return
              if (_message.type !== 'apply') return
              if (_message.id !== messageId) return
              _message.error ? reject(new Error(_message.error)) : resolve(_message.data)
              offMessage?.()
            })

            adapter.sendMessage({
              type: 'apply',
              id: messageId,
              path,
              sender: 'inject',
              callbackIds,
              args: mapArgs,
              timeStamp: Date.now(),
              namespace: options.namespace
            })
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

const provideProxy = <T extends Record<string, any>>(context: () => T, options: Required<Options>) => {
  let target: T
  return <M extends Message = Message>(adapter: Adapter<M>) =>
    (target ??= createProvide(context(), adapter as unknown as Adapter, options))
}

const injectProxy = <T extends Record<string, any>>(context: () => T, options: Required<Options>) => {
  let target: T
  return <M extends Message = Message>(adapter: Adapter<M>) =>
    (target ??= createInject(
      options.backup ? Object.freeze(context()) : ({} as unknown as T),
      adapter as unknown as Adapter,
      options
    ))
}

/**
 * Creates a pair of proxies for the provider (provide) and injector (inject) to facilitate method calls and callbacks across communication layers.
 *
 * @param context - A factory function for the context that returns the target object to be proxied:
 *   - For the provider: This object directly handles remote calls.
 *   - For the injector: When the backup option is enabled, it serves as a local fallback implementation.
 * @param options - Configuration options:
 *   - namespace: The communication namespace used to isolate messages between different proxy instances (default is '__comctx__').
 *   - heartbeatCheck: Enable provider readiness check (default: true).
 *   - heartbeatInterval: The frequency at which to request heartbeats in milliseconds (default: 300).
 *   - heartbeatTimeout: Max wait time for heartbeat response in milliseconds (default: 1000).
 *   - backup: Whether to use a backup implementation of the original object in the injector (default is false).
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
export const defineProxy = <T extends Record<string, any>>(context: () => T, options?: Options) => {
  const mergedOptions = {
    namespace: options?.namespace ?? '__comctx__',
    heartbeatCheck: options?.heartbeatCheck ?? true,
    heartbeatInterval: options?.heartbeatInterval ?? 300,
    heartbeatTimeout: options?.heartbeatTimeout ?? 1000,
    backup: options?.backup ?? false
  }

  if (mergedOptions.heartbeatTimeout <= mergedOptions.heartbeatInterval) {
    throw new Error(
      `Invalid heartbeat config: timeout (${mergedOptions.heartbeatTimeout}ms) must exceed interval (${mergedOptions.heartbeatInterval}ms).`
    )
  }

  return [provideProxy(context, mergedOptions), injectProxy(context, mergedOptions)] as const
}

export default defineProxy

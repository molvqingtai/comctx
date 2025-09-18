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
}

const heartbeatCheck = async (adapter: Adapter, options: Required<Options>) => {
  let clearHeartbeatInterval: () => void
  let clearHeartbeatTimeout: () => void
  const offMessages = new Set<OffMessage>()

  const heartbeatInterval = new Promise<void>((resolve, reject) => {
    clearHeartbeatInterval = setIntervalImmediate(async () => {
      try {
        const messageId = uuid()
        const offMessage = await adapter.onMessage((message) => {
          if (!checkMessage(message)) return
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
        adapter.sendMessage(pingMessage, options.transfer ? extractTransfer(pingMessage) : [])
      } catch (error) {
        reject(error)
      }
    }, options.heartbeatInterval)
  })

  const heartbeatTimeout = new Promise<void>((_, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Provider unavailable: heartbeat check timeout ${options.heartbeatTimeout}ms.`)),
      options.heartbeatTimeout
    )
    clearHeartbeatTimeout = () => clearTimeout(timer)
  })

  await Promise.race([heartbeatInterval, heartbeatTimeout]).finally(() => {
    clearHeartbeatInterval()
    clearHeartbeatTimeout()
    offMessages.forEach((offMessage) => offMessage())
    offMessages.clear()
  })
}

const createProvide = <T extends Record<string, any>>(target: T, adapter: Adapter, options: Required<Options>) => {
  adapter.onMessage(async (message) => {
    if (!checkMessage(message)) return
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
        adapter.sendMessage(pongMessage, options.transfer ? extractTransfer(pongMessage) : [])
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
                adapter.sendMessage(callbackMessage, options.transfer ? extractTransfer(callbackMessage) : [])
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
        adapter.sendMessage(responseMessage, options.transfer ? extractTransfer(responseMessage) : [])
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
        if (_target[PROXY_MARKER as keyof typeof _target]) {
          return Reflect.get(_target, key, receiver)
        }
        const noop = () => {}
        noop[PROXY_MARKER] = true
        return createProxy(noop as unknown as T, [...path, key] as string[])
      },
      apply(_target, _this, args) {
        return new Promise<Message>(async (resolve, reject) => {
          try {
            options.heartbeatCheck && (await heartbeatCheck(adapter, options))

            const callbackIds: string[] = []
            const mapArgs = args.map((arg) => {
              if (typeof arg === 'function') {
                const callbackId = uuid()
                callbackIds.push(callbackId)
                adapter.onMessage((message) => {
                  if (!checkMessage(message)) return
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
              if (!checkMessage(message)) return
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
            adapter.sendMessage(applyMessage, options.transfer ? extractTransfer(applyMessage) : [])
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
    (target ??= createProvide(context(...args) as ReturnType<T>, adapter as Adapter, options))
}

const injectProxy = <T extends Context>(context: T, options: Required<Options>) => {
  let target: ReturnType<T>
  return <M extends MessageMeta = MessageMeta>(adapter: Adapter<M>) =>
    (target ??= createInject<ReturnType<T>>(
      (options.backup ? Object.freeze(context()) : {}) as ReturnType<T>,
      adapter as Adapter,
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
 *   - transfer: Whether to use transferable objects for message transfer (default is false).
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
export const defineProxy = <T extends Context>(context: T, options?: Options) => {
  const mergedOptions = {
    namespace: options?.namespace ?? '__comctx__',
    heartbeatCheck: options?.heartbeatCheck ?? true,
    heartbeatInterval: options?.heartbeatInterval ?? 300,
    heartbeatTimeout: options?.heartbeatTimeout ?? 1000,
    transfer: options?.transfer ?? false,
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

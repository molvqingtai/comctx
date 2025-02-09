import uuid from '@/utils/uuid'
import setIntervalImmediate from '@/utils/setIntervalImmediate'

type MaybePromise<T> = T | Promise<T>

export interface Options {
  backup?: boolean
  waitProvide?: boolean
  waitInterval?: number
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
  timeStamp: number
}

export type OffMessage = () => MaybePromise<void>

export type OnMessage = (callback: (message: Message) => void) => MaybePromise<OffMessage | void>

export type SendMessage = (message: Message) => MaybePromise<void>

export interface Adapter {
  onMessage: OnMessage
  sendMessage: SendMessage
}

const waitProvide = async (adapter: Adapter, interval: number = 0) => {
  await new Promise<void>((resolve, reject) => {
    const clearIntervalImmediate = setIntervalImmediate(async () => {
      try {
        const id = uuid()
        adapter.sendMessage({
          type: 'ping',
          id,
          path: [],
          sender: 'inject',
          args: [],
          timeStamp: Date.now()
        })
        const offMessage = await adapter.onMessage((message) => {
          if (message.sender !== 'provide') return
          if (message.type !== 'pong') return
          if (message.id !== id) return
          clearIntervalImmediate()
          resolve()
          offMessage?.()
        })
      } catch (error) {
        clearIntervalImmediate()
        reject(error)
      }
    }, interval)
  })
}

const createProvide = <T extends Record<string, any>>(target: T, adapter: Adapter) => {
  adapter.onMessage(async (message) => {
    if (message.sender !== 'inject') return

    switch (message.type) {
      case 'ping': {
        adapter.sendMessage({
          ...message,
          type: 'pong',
          sender: 'provide',
          timeStamp: Date.now()
        })
        break
      }
      case 'apply': {
        const mapArgs = message.args.map((arg) => {
          if (message.callbackIds?.includes(arg)) {
            return (...args: any[]) => {
              adapter.sendMessage({
                ...message,
                id: arg,
                data: args,
                type: 'callback',
                sender: 'provide',
                timeStamp: Date.now()
              })
            }
          } else {
            return arg
          }
        })
        try {
          message.data = await (message.path.reduce((acc, key) => acc[key], target) as unknown as Function).apply(
            target,
            mapArgs
          )
        } catch (error) {
          message.error = (error as Error).message
        }
        adapter.sendMessage({
          ...message,
          type: 'apply',
          sender: 'provide',
          timeStamp: Date.now()
        })
        break
      }
    }
  })
  return target
}

const createInject = <T extends Record<string, any>>(source: T, adapter: Adapter, options: Options) => {
  const createProxy = (target: T, path: string[]) => {
    const proxy = new Proxy<T>(target, {
      get(target, key: string) {
        return createProxy(options.backup ? target[key] : ((() => {}) as unknown as T), [...path, key] as string[])
      },
      apply(_target, _thisArg, args) {
        return new Promise<Message>(async (resolve, reject) => {
          try {
            options.waitProvide && (await waitProvide(adapter, options.waitInterval))

            const callbackIds: string[] = []
            const mapArgs = args.map((arg) => {
              if (typeof arg === 'function') {
                const callbackId = uuid()
                callbackIds.push(callbackId)
                adapter.onMessage((_message) => {
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

            const id = uuid()

            const offMessage = await adapter.onMessage((_message) => {
              if (_message.sender !== 'provide') return
              if (_message.type !== 'apply') return
              if (_message.id !== id) return
              _message.error ? reject(new Error(_message.error)) : resolve(_message.data)
              offMessage?.()
            })

            adapter.sendMessage({
              type: 'apply',
              id,
              path,
              sender: 'inject',
              callbackIds,
              args: mapArgs,
              timeStamp: Date.now()
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

const provideProxy = <T extends Record<string, any>>(context: () => T) => {
  let target: T
  return (adapter: Adapter) => (target ??= createProvide(context(), adapter))
}

const injectProxy = <T extends Record<string, any>>(context: () => T, options: Options) => {
  let target: T
  return (adapter: Adapter) =>
    (target ??= createInject(options.backup ? context() : ((() => {}) as unknown as T), adapter, options))
}

export const defineProxy = <T extends Record<string, any>>(context: () => T, options?: Options) => {
  return [
    provideProxy(context),
    injectProxy(context, { backup: false, waitProvide: true, waitInterval: 300, ...options })
  ] as const
}

export default defineProxy

export const MESSAGE_TYPE = {
  APPLY: 'apply',
  CALLBACK: 'callback',
  PING: 'ping',
  PONG: 'pong'
} as const

export const MESSAGE_SENDER_TYPE = {
  PROVIDER: 'provider',
  INJECTOR: 'injector'
} as const

export type MessageType = (typeof MESSAGE_TYPE)[keyof typeof MESSAGE_TYPE]

export type MessageSenderType = (typeof MESSAGE_SENDER_TYPE)[keyof typeof MESSAGE_SENDER_TYPE]

export interface MessageSender {
  readonly type: MessageSenderType
  readonly name?: string
}

export type MessageMeta = object

export interface Message<T extends MessageMeta = MessageMeta> {
  readonly type: MessageType
  readonly id: string
  readonly path: string[]
  readonly sender: MessageSender
  readonly callbackIds?: string[]
  readonly args?: any[]
  readonly data?: any
  readonly error?: string
  readonly meta: T
  readonly namespace: string
  readonly timeStamp: number
}

export const checkMessage = (message?: Partial<Message>) => {
  const isType = !!message?.type && Object.values(MESSAGE_TYPE).includes(message.type)

  const isId = !!message?.id && typeof message.id === 'string'

  const isPath =
    !!message?.path && Array.isArray(message.path) && message.path.every((path) => typeof path === 'string')

  const isSender =
    !!message?.sender &&
    typeof message.sender === 'object' &&
    !!message.sender.type &&
    Object.values(MESSAGE_SENDER_TYPE).includes(message.sender.type) &&
    (typeof message.sender.name === 'undefined' || typeof message.sender.name === 'string')

  const isCallbackIds =
    typeof message?.callbackIds === 'undefined' ||
    (Array.isArray(message.callbackIds) && message.callbackIds.every((id) => typeof id === 'string'))

  const isArgs = typeof message?.args === 'undefined' || Array.isArray(message.args)

  const isError = typeof message?.error === 'undefined' || typeof message.error === 'string'

  const isMeta = !!message?.meta && message.meta !== null && typeof message.meta === 'object'

  const isNamespace = !!message?.namespace && typeof message.namespace === 'string'

  const isTimeStamp = !!message?.timeStamp && typeof message.timeStamp === 'number'

  return (
    isType && isId && isPath && isSender && isCallbackIds && isArgs && isError && isMeta && isNamespace && isTimeStamp
  )
}

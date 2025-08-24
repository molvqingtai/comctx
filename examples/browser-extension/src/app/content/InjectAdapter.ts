import { browser } from '#imports'
import { Adapter, Message, SendMessage, OnMessage } from 'comctx'

export interface MessageMeta {
  url: string
}

export default class InjectAdapter implements Adapter<MessageMeta> {
  sendMessage: SendMessage<MessageMeta> = (message) => {
    browser.runtime.sendMessage(browser.runtime.id, { ...message, meta: { url: document.location.href } })
  }
  onMessage: OnMessage<MessageMeta> = (callback) => {
    const handler = (message: Message<MessageMeta>): undefined => {
      callback(message)
    }
    browser.runtime.onMessage.addListener(handler)
    return () => browser.runtime.onMessage.removeListener(handler)
  }
}

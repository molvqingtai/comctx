import { browser } from '#imports'
import { Adapter, Message, SendMessage, OnMessage } from 'comctx'

export interface MessageMeta {
  url: string
}

export default class ProvideAdapter implements Adapter<MessageMeta> {
  sendMessage: SendMessage<MessageMeta> = async (message) => {
    const tabs = await browser.tabs.query({ url: message.meta.url })
    tabs.map((tab) => browser.tabs.sendMessage(tab.id!, message))
  }

  onMessage: OnMessage<MessageMeta> = (callback) => {
    const handler = (message: Message<MessageMeta>): undefined => {
      callback(message)
    }
    browser.runtime.onMessage.addListener(handler)
    return () => browser.runtime.onMessage.removeListener(handler)
  }
}

import { browser } from '#imports'
import type { Adapter, Message, SendMessage, OnMessage } from 'comctx'

export interface MessageMeta {
  url: string
}

export class ProvideAdapter implements Adapter<MessageMeta> {
  sendMessage: SendMessage<MessageMeta> = async (message) => {
    const tabs = await browser.tabs.query({ url: message.meta.url })
    // console.log('RuntimeProvideAdapter SendMessage', message)
    tabs.map((tab) => browser.tabs.sendMessage(tab.id!, message))
  }

  onMessage: OnMessage<MessageMeta> = (callback) => {
    const handler = (message?: Partial<Message<MessageMeta>>): undefined => {
      // console.log('RuntimeProvideAdapter onMessage', message)
      callback(message)
    }
    browser.runtime.onMessage.addListener(handler)
    return () => browser.runtime.onMessage.removeListener(handler)
  }
}

export class InjectAdapter implements Adapter<MessageMeta> {
  sendMessage: SendMessage<MessageMeta> = (message) => {
    // console.log('RuntimeInjectAdapter SendMessage', message)
    browser.runtime.sendMessage(browser.runtime.id, { ...message, meta: { url: document.location.href } })
  }
  onMessage: OnMessage<MessageMeta> = (callback) => {
    const handler = (message?: Partial<Message<MessageMeta>>): undefined => {
      // console.log('RuntimeInjectAdapter onMessage', message)
      callback(message)
    }
    browser.runtime.onMessage.addListener(handler)
    return () => browser.runtime.onMessage.removeListener(handler)
  }
}

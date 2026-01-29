import { browser } from '#imports'
import type { Adapter, Message, SendMessage, OnMessage } from 'comctx'

export interface MessageMeta {
  url: string
  injector?: 'content' | 'popup'
}

export class ProvideAdapter implements Adapter<MessageMeta> {
  sendMessage: SendMessage<MessageMeta> = async (message) => {
    switch (message.meta.injector) {
      case 'content': {
        const tabs = await browser.tabs.query({ url: message.meta.url })
        // Send a message to the content-script
        tabs.map((tab) => browser.tabs.sendMessage(tab.id!, message))
        break
      }
      case 'popup': {
        // Send a message to the popup or other internal pages
        await browser.runtime.sendMessage(message).catch((error) => {
          /**
           * When the popup page is closed, sending a message to the popup will cause an error.
           * In the pub/sub pattern, we can assume that the subscriber doesn’t exist,
           * so we can safely ignore the error here.
           */
          if (error.message.includes('Receiving end does not exist')) {
            return
          }
          throw error
        })
        break
      }
    }
  }

  onMessage: OnMessage<MessageMeta> = (callback) => {
    const handler = (message?: Partial<Message<MessageMeta>>) => {
      callback(message)
    }
    browser.runtime.onMessage.addListener(handler)
    return () => browser.runtime.onMessage.removeListener(handler)
  }
}

export class InjectAdapter implements Adapter<MessageMeta> {
  injector?: 'content' | 'popup'
  constructor(injector?: 'content' | 'popup') {
    this.injector = injector
  }
  sendMessage: SendMessage<MessageMeta> = (message) => {
    browser.runtime.sendMessage(browser.runtime.id, {
      ...message,
      meta: { url: document.location.href, injector: this.injector }
    })
  }
  onMessage: OnMessage<MessageMeta> = (callback) => {
    const handler = (message?: Partial<Message<MessageMeta>>) => {
      callback(message)
    }
    browser.runtime.onMessage.addListener(handler)
    return () => browser.runtime.onMessage.removeListener(handler)
  }
}

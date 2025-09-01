import { Workbox, WorkboxMessageEvent } from 'workbox-window'
import { Adapter, SendMessage, OnMessage } from 'comctx'

declare const self: ServiceWorkerGlobalScope

export class ProvideAdapter implements Adapter {
  sendMessage: SendMessage = (message) => {
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => client.postMessage(message))
    })
  }
  onMessage: OnMessage = (callback) => {
    const handler = (event: ExtendableMessageEvent) => callback(event.data)
    self.addEventListener('message', handler)
    return () => self.removeEventListener('message', handler)
  }
}

export class InjectAdapter implements Adapter {
  workbox: Workbox
  constructor(path: string) {
    this.workbox = new Workbox(path, { type: import.meta.env.MODE === 'production' ? 'classic' : 'module' })
    this.workbox.register()
  }
  sendMessage: SendMessage = (message) => {
    this.workbox.messageSW(message)
  }
  onMessage: OnMessage = (callback) => {
    const handler = (event: WorkboxMessageEvent) => callback(event.data)
    this.workbox.addEventListener('message', handler)
    return () => this.workbox.removeEventListener('message', handler)
  }
}

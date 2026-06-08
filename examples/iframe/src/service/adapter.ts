import { Adapter, SendMessage, OnMessage } from 'comctx'

export default class ProvideAdapter implements Adapter {
  name = 'iframe-provider'

  sendMessage: SendMessage = (message) => {
    window.parent.postMessage(message, '*')
  }
  onMessage: OnMessage = (callback) => {
    const handler = (event: MessageEvent) => callback(event.data)
    window.parent.addEventListener('message', handler)
    return () => window.parent.removeEventListener('message', handler)
  }
}

export class InjectAdapter implements Adapter {
  name = 'iframe-injector'

  sendMessage: SendMessage = (message) => {
    window.postMessage(message, '*')
  }
  onMessage: OnMessage = (callback) => {
    const handler = (event: MessageEvent) => {
      callback(event.data)
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }
}

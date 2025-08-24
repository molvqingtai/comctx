import { Adapter, SendMessage, OnMessage } from 'comctx'

export default class InjectAdapter implements Adapter {
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

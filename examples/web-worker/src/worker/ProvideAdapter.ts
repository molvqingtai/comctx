import { Adapter, SendMessage, OnMessage } from 'comctx'

declare const self: DedicatedWorkerGlobalScope

export default class ProvideAdapter implements Adapter {
  sendMessage: SendMessage = (message) => {
    self.postMessage(message)
  }
  onMessage: OnMessage = (callback) => {
    const handler = (event: MessageEvent) => callback(event.data)
    self.addEventListener('message', handler)
    return () => self.removeEventListener('message', handler)
  }
}

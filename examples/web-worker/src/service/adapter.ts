import { Adapter, SendMessage, OnMessage } from 'core'

declare const self: DedicatedWorkerGlobalScope

export class ProvideAdapter implements Adapter {
  sendMessage: SendMessage = (message) => {
    self.postMessage(message)
  }
  onMessage: OnMessage = (callback) => {
    const handler = (event: MessageEvent) => callback(event.data)
    self.addEventListener('message', handler)
    return () => self.removeEventListener('message', handler)
  }
}

export class InjectAdapter implements Adapter {
  worker: Worker
  constructor(path: string | URL) {
    this.worker = new Worker(path, { type: 'module' })
  }
  sendMessage: SendMessage = (message) => {
    this.worker.postMessage(message)
  }
  onMessage: OnMessage = (callback) => {
    const handler = (event: MessageEvent) => callback(event.data)
    this.worker.addEventListener('message', handler)
    return () => this.worker.removeEventListener('message', handler)
  }
}

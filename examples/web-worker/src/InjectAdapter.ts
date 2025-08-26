import { Adapter, SendMessage, OnMessage } from 'comctx'

export default class InjectAdapter implements Adapter {
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

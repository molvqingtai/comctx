import { Adapter, SendMessage, OnMessage } from 'comctx'

export default class InjectAdapter implements Adapter {
  worker: SharedWorker
  constructor(path: string | URL) {
    this.worker = new SharedWorker(path, { type: 'module' })
    this.worker.port.start()
  }
  sendMessage: SendMessage = (message) => {
    this.worker.port.postMessage(message)
  }
  onMessage: OnMessage = (callback) => {
    const handler = (event: MessageEvent) => callback(event.data)
    this.worker.port.addEventListener('message', handler)
    return () => {
      this.worker.port.removeEventListener('message', handler)
    }
  }
}

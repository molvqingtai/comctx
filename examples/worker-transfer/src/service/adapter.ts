import { Adapter, SendMessage, OnMessage } from 'comctx'

export type WorkerEndpoint = Pick<Worker, 'postMessage' | 'addEventListener' | 'removeEventListener'>

export class WorkerAdapter implements Adapter {
  constructor(
    private worker: WorkerEndpoint,
    public name?: string
  ) {}

  sendMessage: SendMessage = (message, transfer) => {
    // Core will automatically extract transferables and pass as second parameter
    this.worker.postMessage(message, transfer)
  }

  onMessage: OnMessage = (callback) => {
    const handler = (event: MessageEvent) => {
      callback(event.data)
    }
    this.worker.addEventListener('message', handler)
    return () => this.worker.removeEventListener('message', handler)
  }
}

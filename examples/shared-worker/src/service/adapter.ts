import { Adapter, SendMessage, OnMessage } from 'core'

declare const self: SharedWorkerGlobalScope

export class ProvideAdapter implements Adapter {
  private clients = new Set<MessagePort>()

  sendMessage: SendMessage = (message) => {
    this.clients.forEach((client) => client.postMessage(message))
  }

  onMessage: OnMessage = (callback) => {
    const handler = (event: MessageEvent) => callback(event.data)

    self.addEventListener('connect', (event: MessageEvent) => {
      const [port] = event.ports
      port.addEventListener('message', handler)
      port.addEventListener('close', () => this.clients.delete(port))
      port.start()
      this.clients.add(port)
    })

    return () => {
      this.clients.forEach((client) => client.removeEventListener('message', handler))
      this.clients.clear()
    }
  }
}

export class InjectAdapter implements Adapter {
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

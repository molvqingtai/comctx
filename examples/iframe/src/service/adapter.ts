import { Adapter, SendMessage, OnMessage } from 'comctx'

export type WindowEndpoint = Pick<Window, 'postMessage' | 'addEventListener' | 'removeEventListener'>

export class WindowAdapter implements Adapter {
  constructor(
    private window: WindowEndpoint,
    public name?: string,
    private targetOrigin = '*'
  ) {}

  sendMessage: SendMessage = (message) => {
    this.window.postMessage(message, this.targetOrigin)
  }

  onMessage: OnMessage = (callback) => {
    const handler = (event: MessageEvent) => {
      callback(event.data)
    }
    this.window.addEventListener('message', handler)
    return () => this.window.removeEventListener('message', handler)
  }
}

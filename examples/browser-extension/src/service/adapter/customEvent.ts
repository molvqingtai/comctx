import type { Adapter, Message, OnMessage, SendMessage } from 'comctx'

export class ProvideAdapter implements Adapter {
  sendMessage: SendMessage = (message) => {
    /**
     * Compatible with Firefox
     * https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Sharing_objects_with_page_scripts#cloneinto
     */
    const detail = typeof cloneInto === 'function' ? cloneInto(message, document.defaultView) : message

    document.dispatchEvent(new CustomEvent('message', { detail }))
    // console.log('EventProvideAdapter SendMessage', message)
  }
  onMessage: OnMessage = (callback) => {
    const handler = (event: Event) => {
      callback((event as CustomEvent<Partial<Message> | undefined>).detail)
      // console.log('EventProvideAdapter SendMessage', event.detail)
    }
    document.addEventListener('message', handler)
    return () => document.removeEventListener('message', handler)
  }
}

export const InjectAdapter = ProvideAdapter

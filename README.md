# Comctx

Cross-context RPC solution with type safety and flexible adapters.

[![version](https://img.shields.io/github/v/release/molvqingtai/comctx)](https://www.npmjs.com/package/comctx) [![workflow](https://github.com/molvqingtai/comctx/actions/workflows/ci.yml/badge.svg)](https://github.com/molvqingtai/comctx/actions) [![download](https://img.shields.io/npm/dt/comctx)](https://www.npmjs.com/package/comctx) [![npm package minimized gzipped size](https://img.shields.io/bundlejs/size/comctx)](https://www.npmjs.com/package/comctx) [![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/molvqingtai/comctx)

```shell
$ pnpm install comctx
```

## ✨Introduction

[Comctx](https://github.com/molvqingtai/comctx) shares the same goal as [Comlink](https://github.com/GoogleChromeLabs/comlink), but it is not reinventing the wheel. Since [Comlink](https://github.com/GoogleChromeLabs/comlink) relies on [MessagePort](https://developer.mozilla.org/en-US/docs/Web/API/MessagePort), which is not supported in all environments, this project implements a more flexible RPC approach that can more easily and effectively adapt to different runtime environments.

## 💡Features

- **Environment Agnostic** - Works across Web Workers, Browser Extensions, iframes, Electron, and more
- **Bidirectional Communication** - Method calls & callback support
- **Zero Copy** - Automatic extraction and zero-copy transfer of transferable objects
- **Type Safety** - Full TypeScript integration
- **Lightweight** - 1KB gzipped core
- **Fault Tolerance** - Backup implementations & connection heartbeat checks

## 🚀 Quick Start

**Define a Shared Service**

```typescript
import { defineProxy } from 'comctx'

class Counter {
  public value: number
  constructor(initialValue: number = 0) {
    this.value = initialValue
  }
  async getValue() {
    return this.value
  }
  async onChange(callback: (value: number) => void) {
    let oldValue = this.value
    setInterval(() => {
      const newValue = this.value
      if (oldValue !== newValue) {
        callback(newValue)
        oldValue = newValue
      }
    })
  }
  async increment() {
    return ++this.value
  }
  async decrement() {
    return --this.value
  }
}

export const [provideCounter, injectCounter] = defineProxy((initialValue: number = 0) => new Counter(initialValue), {
  namespace: '__comctx-example__'
})
```

**Provider (Service Provider)**

```typescript
// Provider side, typically for web-workers, background, etc.
import type { Adapter, SendMessage, OnMessage } from 'comctx'
import { provideCounter } from './shared'

export default class ProvideAdapter implements Adapter {
  // Implement message sending
  sendMessage: SendMessage = (message) => {
    postMessage(message)
  }
  // Implement message listener
  onMessage: OnMessage = (callback) => {
    const handler = (event: MessageEvent) => callback(event.data)
    addEventListener('message', handler)
    return () => removeEventListener('message', handler)
  }
}

const originCounter = provideCounter(new ProvideAdapter(), 10)

originCounter.onChange(console.log)
```

**Injector (Service Injector)**

```typescript
// Injector side, typically for the main page, content-script, etc.
import type { Adapter, SendMessage, OnMessage } from 'comctx'
import { injectCounter } from './shared'

export default class InjectAdapter implements Adapter {
  // Implement message sending
  sendMessage: SendMessage = (message) => {
    postMessage(message)
  }
  // Implement message listener
  onMessage: OnMessage = (callback) => {
    const handler = (event: MessageEvent) => callback(event.data)
    addEventListener('message', handler)
    return () => removeEventListener('message', handler)
  }
}

const proxyCounter = injectCounter(new InjectAdapter())

// Support for callbacks
proxyCounter.onChange(console.log)

// Transparently call remote methods
await proxyCounter.increment()
const count = await proxyCounter.getValue()
```

- `originCounter` and `proxyCounter` share the same `Counter` instance. `proxyCounter` is a virtual proxy that forwards requests to the `Counter` on the provider side, while `originCounter` directly references the `Counter` itself.

- The injector side cannot directly use `get` and `set`; it must interact with `Counter` via asynchronous methods, but callbacks are supported.

- Since the injector is a virtual proxy, to support operations like `Reflect.has(proxyCounter, 'value')`, you can set `backup` to `true`, which creates a static copy on the injector side that serves as a template without actually running.

- `provideCounter` and `injectCounter` require user-defined adapters for different environments that implement `onMessage` and `sendMessage` methods.

## 🧩 Advanced Usage

### Separate Inject and Provide Definitions

For multi-package architectures, you can define inject and provide proxies separately to avoid bundling shared code in both packages.

By default, both provider and injector would bundle the same implementation code, but the injector only needs it for type safety:

```typescript
// packages/provider/src/index.ts
import { defineProxy } from 'comctx'

class Counter {
  public value = 0
  async increment() {
    return ++this.value
  }
}

const counter = new Counter()
export const [provideCounter] = defineProxy(() => counter, {
  namespace: '__comctx-example__'
})
```

```typescript
// packages/injector/src/index.ts
import { defineProxy } from 'comctx'

// Define type-only counter for type safety
interface Counter {
  value: number
  increment(): Promise<number>
}

// Since the injector side is a virtual proxy that doesn't actually run, we can pass an empty object
const counter = {} as Counter
export const [, injectCounter] = defineProxy(() => counter, {
  namespace: '__comctx-example__'
})
```

### Transfer and Transferable Objects

By default, every method parameter, return value and object property value is copied ([structured cloning](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm)). Comctx performs no internal serialization and natively supports [transferable objects](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects).

If you want a value to be transferred rather than copied — provided the value is or contains a [Transferable](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects#supported_objects) — you can enable the `transfer` option. When enabled, transferable objects are automatically extracted and transferred using zero-copy semantics:

```typescript
class Counter {
  public value = new ArrayBuffer(4)

  async transfer() {
    return this.value // Zero-copy transfer, this.value becomes detached
  }

  async increment() {
    // Error: Cannot access this.value after transfer (detached ArrayBuffer)
    new Int32Array(this.value)[0]++
  }
}

export const [provideCounter, injectCounter] = defineProxy(() => new Counter(), {
  namespace: '__worker-transfer-example__',
  transfer: true // Automatically extract and transfer transferable objects
})

// Usage - receive transferred ArrayBuffer
const counter = injectCounter(adapter)
const value = await counter.transfer() // ✅ Return: zero-copy ArrayBuffer
new Int32Array(value)[0]++ // ✅ Modify transferred ArrayBuffer directly

await counter.increment() // ❌ Error: Cannot perform Construct on a detached ArrayBuffer
await counter.transfer() // ❌ Error: Failed to execute 'postMessage' on 'DedicatedWorkerGlobalScope': ArrayBuffer at index 0 is already detached.
```

#### Adapter Implementation

When transfer is enabled, transferable objects are automatically extracted from messages and passed as the transfer parameter to `SendMessage`:

```typescript
// Transfer-enabled adapter
export default class TransferAdapter implements Adapter {
  sendMessage: SendMessage = (message, transfer) => {
    this.worker.postMessage(message, transfer)
  }
  // ... rest of implementation
}
```

## 🔌 Adapter Interface

To adapt to different communication channels, implement the following interface:

```typescript
interface Adapter<T extends MessageMeta = MessageMeta> {
  /** Send a message to the other side */
  sendMessage: (message: M, transfer: Transferable[]) => MaybePromise<void>

  /** Register a message listener */
  onMessage: (callback: (message?: Partial<Message<T>>) => void) => MaybePromise<OffMessage | void>
}
```

## 📖Examples

- [web-worker-example](https://github.com/molvqingtai/comctx/tree/master/examples/web-worker)
- [shared-worker-example](https://github.com/molvqingtai/comctx/tree/master/examples/shared-worker)
- [service-worker-example](https://github.com/molvqingtai/comctx/tree/master/examples/service-worker)
- [worker-transfer-example](https://github.com/molvqingtai/comctx/tree/master/examples/worker-transfer)
- [browser-extension-example](https://github.com/molvqingtai/comctx/tree/master/examples/browser-extension)
- [iframe-example](https://github.com/molvqingtai/comctx/tree/master/examples/iframe)

### Web Worker

This is an example of communication between the main page and a web worker.

see: [web-worker-example](https://github.com/molvqingtai/comctx/tree/master/examples/web-worker)

**InjectAdapter.ts**

```typescript
import { Adapter, SendMessage, OnMessage, Message } from 'comctx'

export default class InjectAdapter implements Adapter {
  worker: Worker
  constructor(path: string | URL) {
    this.worker = new Worker(path, { type: 'module' })
  }
  sendMessage: SendMessage = (message) => {
    this.worker.postMessage(message)
  }
  onMessage: OnMessage = (callback) => {
    const handler = (event: MessageEvent<Message>) => callback(event.data)
    this.worker.addEventListener('message', handler)
    return () => this.worker.removeEventListener('message', handler)
  }
}
```

**ProvideAdapter.ts**

```typescript
import { Adapter, SendMessage, OnMessage, Message } from 'comctx'

declare const self: DedicatedWorkerGlobalScope

export default class ProvideAdapter implements Adapter {
  sendMessage: SendMessage = (message) => {
    self.postMessage(message)
  }
  onMessage: OnMessage = (callback) => {
    const handler = (event: MessageEvent<Message>) => callback(event.data)
    self.addEventListener('message', handler)
    return () => self.removeEventListener('message', handler)
  }
}
```

**web-worker.ts**

```typescript
import { provideCounter } from './shared'
import ProvideAdapter from './ProvideAdapter'

const counter = provideCounter(new ProvideAdapter())

counter.onChange((value) => {
  console.log('WebWorker Value:', value)
})
```

**main.ts**

```typescript
import { injectCounter } from './shared'
import InjectAdapter from './InjectAdapter'

const counter = injectCounter(new InjectAdapter(new URL('./web-worker.ts', import.meta.url)))

counter.onChange((value) => {
  console.log('WebWorker Value:', value) // 1,0
})

await counter.getValue() // 0

await counter.increment() // 1

await counter.decrement() // 0
```

### Browser Extension

This is an example of communication between the content-script and background script.

see: [browser-extension-example](https://github.com/molvqingtai/comctx/tree/master/examples/browser-extension)

**InjectAdapter.ts**

```typescript
import browser from 'webextension-polyfill'
import { Adapter, Message, SendMessage, OnMessage } from 'comctx'

export interface MessageMeta {
  url: string
}

export default class InjectAdapter implements Adapter<MessageMeta> {
  sendMessage: SendMessage<MessageMeta> = (message) => {
    browser.runtime.sendMessage(browser.runtime.id, { ...message, meta: { url: document.location.href } })
  }
  onMessage: OnMessage<MessageMeta> = (callback) => {
    const handler = (message: Message<MessageMeta>): undefined => {
      callback(message)
    }
    browser.runtime.onMessage.addListener(handler)
    return () => browser.runtime.onMessage.removeListener(handler)
  }
}
```

**ProvideAdapter.ts**

```typescript
import browser from 'webextension-polyfill'
import { Adapter, Message, SendMessage, OnMessage } from 'comctx'

export interface MessageMeta {
  url: string
}

export default class ProvideAdapter implements Adapter<MessageMeta> {
  sendMessage: SendMessage<MessageMeta> = async (message) => {
    const tabs = await browser.tabs.query({ url: message.meta.url })
    tabs.map((tab) => browser.tabs.sendMessage(tab.id!, message))
  }

  onMessage: OnMessage<MessageMeta> = (callback) => {
    const handler = (message: Message<MessageMeta>): undefined => {
      callback(message)
    }
    browser.runtime.onMessage.addListener(handler)
    return () => browser.runtime.onMessage.removeListener(handler)
  }
}
```

**background.ts**

```typescript
import { provideCounter } from './shared'
import ProvideAdapter from './ProvideAdapter'

const counter = provideCounter(new ProvideAdapter())

counter.onChange((value) => {
  console.log('Background Value:', value) // 1,0
})
```

**content-script.ts**

```typescript
import { injectCounter } from './shared'
import InjectAdapter from './InjectAdapter'

const counter = injectCounter(new InjectAdapter())

counter.onChange((value) => {
  console.log('Background Value:', value) // 1,0
})

await counter.getValue() // 0

await counter.increment() // 1

await counter.decrement() // 0
```

### IFrame

This is an example of communication between the main page and an iframe.

see: [iframe-example](https://github.com/molvqingtai/comctx/tree/master/examples/iframe)

**InjectAdapter.ts**

```typescript
import { Adapter, SendMessage, OnMessage } from 'comctx'

export default class InjectAdapter implements Adapter {
  sendMessage: SendMessage = (message) => {
    window.postMessage(message, '*')
  }
  onMessage: OnMessage = (callback) => {
    const handler = (event: MessageEvent) => callback(event.data)
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }
}
```

**ProvideAdapter.ts**

```typescript
import { Adapter, SendMessage, OnMessage } from 'comctx'

export default class ProvideAdapter implements Adapter {
  sendMessage: SendMessage = (message) => {
    window.parent.postMessage(message, '*')
  }
  onMessage: OnMessage = (callback) => {
    const handler = (event: MessageEvent) => callback(event.data)
    window.parent.addEventListener('message', handler)
    return () => window.parent.removeEventListener('message', handler)
  }
}
```

**iframe.ts**

```typescript
import { provideCounter } from './shared'
import ProvideAdapter from './ProvideAdapter'

const counter = provideCounter(new ProvideAdapter())

counter.onChange((value) => {
  console.log('iframe Value:', value) // 1,0
})
```

**main.ts**

```typescript
import { injectCounter } from './shared'
import InjectAdapter from './InjectAdapter'

const counter = injectCounter(new InjectAdapter())

counter.onChange((value) => {
  console.log('iframe Value:', value) // 1,0
})

await counter.getValue() // 0

await counter.increment() // 1

await counter.decrement() // 0
```

## 📖 Articles

- [Comctx: A Better Cross-Context Communication Library Than Comlink (English)](./docs/ARTICLE-en.md)
- [Comctx：比 Comlink 更好的跨上下文通信库 (中文)](./docs/ARTICLE-zh.md)

## 🩷Thanks

The inspiration for this project comes from [@webext-core/proxy-service](https://webext-core.aklinker1.io/proxy-service/installation/), but [Comctx](https://github.com/molvqingtai/comctx) aims to be a better version of it.

## 📃License

This project is licensed under the MIT License - see the [LICENSE](https://github.com/molvqingtai/comctx/blob/master/LICENSE) file for details

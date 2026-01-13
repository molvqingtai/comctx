import { defineProxy } from 'comctx'

class Counter {
  public value: number
  private stream: ReadableStream<number>
  private writer: WritableStreamDefaultWriter<number>

  constructor(initialValue: number = 0) {
    this.value = initialValue
    const { readable, writable } = new TransformStream<number, number>()
    this.stream = readable
    this.writer = writable.getWriter()
  }

  async getValue() {
    return this.value
  }

  async getStream() {
    return this.stream
  }

  async increment() {
    return await this.writer.write(++this.value)
  }

  async decrement() {
    return await this.writer.write(--this.value)
  }
}

export const [provideCounter, injectCounter] = defineProxy((initialValue) => new Counter(initialValue), {
  namespace: '__worker-transfer-example__',
  transfer: true // Use zero-copy transfer (transferable objects). If false, use structured clone
})

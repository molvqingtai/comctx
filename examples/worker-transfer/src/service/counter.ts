import { defineProxy } from 'comctx'

class Counter {
  public value = new ArrayBuffer(4)

  constructor(initialValue: number = 0) {
    const view = new Int32Array(this.value)
    view[0] = initialValue
  }

  async getValue() {
    // Return a copy of the buffer
    const copy = new ArrayBuffer(4)
    new Int32Array(copy)[0] = new Int32Array(this.value)[0]
    return copy // Zero-copy transferred

    // return this.value
  }

  async onChange(callback: (value: ArrayBuffer) => void) {
    let oldValue = new Int32Array(this.value)[0]

    setInterval(async () => {
      const newValue = new Int32Array(this.value)[0]
      if (oldValue !== newValue) {
        callback(await this.getValue())
        oldValue = newValue
      }
    }, 100)
  }

  async increment() {
    new Int32Array(this.value)[0]++
    return this.getValue()
  }

  async decrement() {
    new Int32Array(this.value)[0]--
    return this.getValue()
  }
}

export const [provideCounter, injectCounter] = defineProxy((initialValue) => new Counter(initialValue), {
  namespace: '__worker-transfer-example__',
  transfer: true // Use zero-copy transfer (transferable objects). If false, use structured clone
})

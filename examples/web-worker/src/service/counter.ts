import defineProxy from 'comctx'

export class Counter {
  private value: number
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
  namespace: '__web-worker-example__'
})

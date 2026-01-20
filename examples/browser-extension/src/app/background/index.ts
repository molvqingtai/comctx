import { browser, defineBackground } from '#imports'
import { Counter } from '@/service/counter'

import { ProvideAdapter } from '@/service/adapter/browserRuntime'
import { defineProxy } from 'core'

export default defineBackground({
  type: 'module',
  main() {
    // This allows the service-worker to remain resident in the background.
    browser.webNavigation.onHistoryStateUpdated.addListener(() => {
      console.log('background active')
    })

    const [provideBackgroundCounter] = defineProxy((initialValue: number) => new Counter(initialValue), {
      namespace: browser.runtime.id
    })

    const counter = provideBackgroundCounter(new ProvideAdapter(), 0)

    counter.onChange((value) => {
      console.log('background Value:', value)
    })
  }
})

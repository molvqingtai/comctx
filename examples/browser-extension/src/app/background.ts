import { browser, defineBackground } from '#imports'
import { Counter } from '@/service/counter'

import { ProvideAdapter } from '@/service/adapter/browserRuntime'
import defineProxy from 'comctx'

export default defineBackground({
  type: 'module',
  main() {
    // This allows the service-worker to remain resident in the background.
    browser.webNavigation.onHistoryStateUpdated.addListener(() => {
      console.log('background active')
    })

    const [provideCounter] = defineProxy((initialValue: number = 0) => new Counter(initialValue), {
      namespace: '__comctx-example__'
    })

    const counter = provideCounter(new ProvideAdapter())

    counter.onChange((value) => {
      console.log('Background Value:', value)
    })
  }
})

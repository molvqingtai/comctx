import { name } from '@/../package.json'
import { browser, createShadowRootUi, defineContentScript } from '#imports'
import createElement from '@/utils/createElement'
import '@/assets/style.css'

import { defineProxy } from 'core'
import { InjectAdapter as BrowserRuntimeInjectAdapter } from '@/service/adapter/browserRuntime'
import { ProvideAdapter as CustomEventProvideAdapter } from '@/service/adapter/customEvent'
import type { Counter } from '@/service/counter'

export default defineContentScript({
  world: 'ISOLATED',
  matches: ['*://*.example.com/*'],
  runAt: 'document_end',
  cssInjectionMode: 'ui',
  async main(ctx) {
    const [, injectBackgroundCounter] = defineProxy(() => ({}) as Counter, {
      namespace: browser.runtime.id
    })

    const counter = injectBackgroundCounter(new BrowserRuntimeInjectAdapter('content'))

    // The bridge exposed to injected-script
    const [provideContentCounter] = defineProxy(() => counter, {
      namespace: '__comctx-example__'
    })

    provideContentCounter(new CustomEventProvideAdapter())

    const ui = await createShadowRootUi(ctx, {
      name,
      position: 'inline',
      anchor: 'body',
      append: 'last',
      mode: 'open',
      inheritStyles: true,
      onMount: async (container) => {
        const initValue = await counter.getValue()

        const app = createElement(`
          <div id="app" class="content-app">
            <h1>content-script example</h1>
            <p>content-script -> background</p>
            <div class="card">
              <button id="decrement" type="button">-</button>
                <div id="value">${initValue}</div>
              <button id="increment" type="button">+</button>
            </div>
            <div class="card">
              <h4 id="background-value">Background Value: ${initValue} </h4>
            </div>
          </div>`)

        app.querySelector<HTMLButtonElement>('#decrement')!.addEventListener('click', async () => {
          await counter.decrement()
        })

        app.querySelector<HTMLButtonElement>('#increment')!.addEventListener('click', async () => {
          await counter.increment()
        })

        counter.onChange((value) => {
          console.log('content-script:', value)
          app.querySelector<HTMLDivElement>('#value')!.textContent = value.toString()
          app.querySelector<HTMLDivElement>('#background-value')!.textContent = `Background Value: ${value}`
        })
        container.append(app)
      }
    })
    ui.mount()
  }
})

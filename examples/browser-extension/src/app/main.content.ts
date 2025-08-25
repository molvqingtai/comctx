import { defineContentScript } from '#imports'

import { name } from '@/../package.json'
import createElement from '@/utils/createElement'

import { InjectAdapter as CustomEventInjectAdapter } from '@/service/adapter/customEvent'

import './style.css'
import defineProxy from 'comctx'
import type { Counter } from '@/service/counter'

export default defineContentScript({
  world: 'MAIN',
  runAt: 'document_end',
  matches: ['*://*.example.com/*'],
  main: async () => {
    document.head.querySelectorAll('style').forEach((style) => style.remove())
    document.body.querySelector('div')?.remove()

    const [, injectContentCounter] = defineProxy(() => ({}) as Counter, {
      namespace: '__comctx-example__'
    })

    const counter = injectContentCounter(new CustomEventInjectAdapter())

    const initValue = await counter.getValue()

    const app = createElement(`
            <div id="app" class="inject-app">
              <h1>${name}</h1>
              <p>inject-script -> content-script -> background</p>
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
      app.querySelector<HTMLDivElement>('#value')!.textContent = value.toString()
      app.querySelector<HTMLDivElement>('#background-value')!.textContent = `Background Value: ${value}`
    })
    document.body.append(app)
  }
})

import { browser } from '#imports'
import { defineProxy } from 'comctx'
import { InjectAdapter as BrowserRuntimeInjectAdapter } from '@/service/adapter/browserRuntime'
import type { Counter } from '@/service/counter'
import createElement from '@/utils/createElement'

void (async () => {
  const [, injectBackgroundCounter] = defineProxy(() => ({}) as Counter, {
    namespace: browser.runtime.id
  })

  // Use the proxy object
  const counter = injectBackgroundCounter(new BrowserRuntimeInjectAdapter())

  const initValue = await counter.getValue()

  document.querySelector<HTMLDivElement>('#root')!.replaceWith(
    createElement(`
      <div id="app" class="popup-app">
        <h1>popup-page example</h1>
        <p>popup-page -> background</p>
        <div class="card">
          <button id="decrement" type="button">-</button>
            <div id="value">${initValue}</div>
          <button id="increment" type="button">+</button>
        </div>
        <div class="card">
          <h4 id="background-value">Background Value: ${initValue} </h4>
        </div>
      </div>
    `)
  )

  document.querySelector<HTMLButtonElement>('#decrement')!.addEventListener('click', async () => {
    await counter.decrement()
  })

  document.querySelector<HTMLButtonElement>('#increment')!.addEventListener('click', async () => {
    await counter.increment()
  })

  counter.onChange((value) => {
    console.log('popup-page:', value)
    document.querySelector<HTMLDivElement>('#value')!.textContent = value.toString()
    document.querySelector<HTMLDivElement>('#background-value')!.textContent = `Background Value: ${value}`
  })
})().catch(console.error)

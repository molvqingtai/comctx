import { name, description } from '../package.json'

import './style.css'

import createElement from './utils/createElement'

import { injectCounter } from './service/counter'
import { InjectAdapter } from './service/adapter'

void (async () => {
  // Use the proxy object
  const counter = injectCounter(new InjectAdapter(new URL('./worker.ts', import.meta.url)))

  const initValue = await counter.getValue()

  document.querySelector<HTMLDivElement>('#app')!.appendChild(
    createElement(`
      <div>
        <h1>${name}</h1>
        <p>${description}</p>
        <div class="card">
          <button id="decrement" type="button">-</button>
          <div id="value">${initValue}</div>
          <button id="increment" type="button">+</button>
        </div>
        <div class="card">
          <h4 id="worker-value">SharedWorker Value: ${initValue} </h4>
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
    document.querySelector<HTMLDivElement>('#value')!.textContent = value.toString()
    document.querySelector<HTMLDivElement>('#worker-value')!.textContent = `SharedWorker Value: ${value}`
  })
})().catch(console.error)

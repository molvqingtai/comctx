import { name, description } from '../package.json'

import './style.css'

import createElement from './utils/createElement'

import { InjectAdapter } from './service/adapter'
import { injectCounter } from './service/counter'

void (async () => {
  // Use the proxy object
  const counter = injectCounter(
    new InjectAdapter(import.meta.env.MODE === 'production' ? '/service-worker.js' : '/dev-sw.js?dev-sw')
  )

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
          <h4 id="background-value">ServiceWorker Value: ${initValue} </h4>
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
    document.querySelector<HTMLDivElement>('#background-value')!.textContent = `ServiceWorker Value: ${value}`
  })
})().catch(console.error)

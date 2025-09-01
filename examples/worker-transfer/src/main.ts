import { name, description } from '../package.json'

import './style.css'

import createElement from './utils/createElement'

import { InjectAdapter } from './service/adapter'
import { injectCounter } from './service/counter'

void (async () => {
  // Use the proxy object
  const counter = injectCounter(new InjectAdapter(new URL('./worker.ts', import.meta.url)))

  const initBuffer = await counter.getValue()
  const initValue = new Int32Array(initBuffer)[0]

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
          <h4 id="worker-value">WebWorker Buffer Value: ${initValue} </h4>
        </div>
      </div>
    `)
  )

  document.querySelector<HTMLButtonElement>('#decrement')!.addEventListener('click', async () => {
    const buffer = await counter.decrement()
    const value = new Int32Array(buffer)[0]
    document.querySelector<HTMLDivElement>('#value')!.textContent = value.toString()
  })

  document.querySelector<HTMLButtonElement>('#increment')!.addEventListener('click', async () => {
    const buffer = await counter.increment()
    const value = new Int32Array(buffer)[0]
    document.querySelector<HTMLDivElement>('#value')!.textContent = value.toString()
  })

  counter.onChange((buffer) => {
    const value = new Int32Array(buffer)[0]
    document.querySelector<HTMLDivElement>('#worker-value')!.textContent = `WebWorker Buffer Value: ${value}`
  })
})().catch(console.error)

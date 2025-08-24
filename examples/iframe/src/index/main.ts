import { injectCounter } from '../shared'
import { name, description } from '../../package.json'

import './style.css'

import InjectAdapter from './InjectAdapter'
import createElement from '../utils/createElement'

void (async () => {
  // Use the proxy object
  const counter = injectCounter(new InjectAdapter())

  const initValue = await counter.getValue()

  document.querySelector<HTMLDivElement>('#app')!.insertBefore(
    createElement(`
      <div>
        <h1>${name}</h1>
        <p>${description}</p>
        <div class="card">
          <button data-testid="decrement" id="decrement" type="button">-</button>
          <div data-testid="value" id="value">${initValue}</div>
          <button data-testid="increment" id="increment" type="button">+</button>
        </div>
      </div>
    `),
    document.querySelector<HTMLDivElement>('#iframe')!
  )

  document.querySelector<HTMLButtonElement>('#decrement')!.addEventListener('click', async () => {
    await counter.decrement()
  })

  document.querySelector<HTMLButtonElement>('#increment')!.addEventListener('click', async () => {
    await counter.increment()
  })

  counter.onChange((value) => {
    document.querySelector<HTMLDivElement>('#value')!.textContent = value.toString()
  })
})().catch(console.error)

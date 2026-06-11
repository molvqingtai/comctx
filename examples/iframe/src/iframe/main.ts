import './style.css'
import { defineProxy } from 'comctx'
import Counter from '../service/counter'
import { WindowAdapter } from '../service/adapter'

// Register the proxy object
void (async () => {
  const [provideCounter] = defineProxy(() => new Counter(), {
    namespace: '__iframe-example__',
    debug: import.meta.env.DEV
  })

  const counter = provideCounter(new WindowAdapter(window.parent, 'iframe-provider'))

  document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
    <div>
      <h1>I am an iframe page</h1>
      <div class="card">
        <h4>Value: <span data-testid="value" id="value">${counter.value}</span></h4>
      </div>
    </div>
  `

  counter.onChange((value) => {
    document.querySelector<HTMLSpanElement>('#value')!.textContent = `${value}`
  })
})().catch(console.error)

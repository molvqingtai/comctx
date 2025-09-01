import './style.css'
import defineProxy from 'comctx'
import Counter from '../service/counter'
import ProvideAdapter from '../service/adapter'

// Register the proxy object
void (async () => {
  const [provideCounter] = defineProxy(() => new Counter(), {
    namespace: '__iframe-example__'
  })

  const counter = provideCounter(new ProvideAdapter())

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

import { ProvideAdapter } from './service/adapter'
import { provideCounter } from './service/counter'

const counter = provideCounter(new ProvideAdapter())

counter.onChange((value) => {
  console.log('SharedWorker Value:', value)
})

import { WorkerAdapter } from './service/adapter'
import { provideCounter } from './service/counter'

const counter = provideCounter(new WorkerAdapter(self, 'web-worker-provider'))

counter.onChange((value) => {
  console.log('WebWorker Value:', value)
})

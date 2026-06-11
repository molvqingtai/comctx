import { WorkerAdapter } from './service/adapter'
import { provideCounter } from './service/counter'

// Create the stream provider service in the worker
provideCounter(new WorkerAdapter(self, 'worker-transfer-provider'), 0)

console.log('Buffer provider worker started')

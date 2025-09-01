import { ProvideAdapter } from './service/adapter'
import { provideCounter } from './service/counter'

// Create the buffer provider service in the worker
provideCounter(new ProvideAdapter(), 0)

console.log('Buffer provider worker started')

import { EventEmitter } from 'events'

// Suppress MaxListenersExceededWarning from vitest module transforms.
EventEmitter.defaultMaxListeners = 20

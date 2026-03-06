import {
  createSocketIOClientTransport,
} from '@volley/vgf/client'
import { ClientType } from '@volley/vgf/types'

/**
 * Creates a transport that never connects but doesn't throw.
 *
 * Useful for UI development without a running VGF server — components
 * fall back to loading/empty states gracefully.
 */
export function createMockTransport() {
  return createSocketIOClientTransport({
    url: 'http://localhost:0',
    query: {
      sessionId: 'mock',
      userId: 'mock-display',
      clientType: ClientType.Display,
    },
  })
}

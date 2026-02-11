import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MockRecognitionClient } from '../voice/MockRecognitionClient.js'

describe('MockRecognitionClient', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it('connect() sets status to idle and fires onStateChange', () => {
    const client = new MockRecognitionClient()
    const handler = vi.fn()
    client.onStateChange = handler

    client.connect()

    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ transcriptionStatus: 'idle' }),
    )
  })

  it('sendAudio() sets status to recording and builds pendingTranscript', () => {
    const client = new MockRecognitionClient({ mockTranscript: 'raise two hundred' })
    const handler = vi.fn()
    client.onStateChange = handler

    client.connect()
    client.sendAudio(new ArrayBuffer(0))

    expect(handler).toHaveBeenLastCalledWith(
      expect.objectContaining({
        transcriptionStatus: 'recording',
        pendingTranscript: 'raise',
      }),
    )
  })

  it('multiple sendAudio() calls build transcript word by word', () => {
    const client = new MockRecognitionClient({ mockTranscript: 'raise two hundred' })
    const handler = vi.fn()
    client.onStateChange = handler

    client.connect()
    client.sendAudio(new ArrayBuffer(0))
    expect(handler).toHaveBeenLastCalledWith(
      expect.objectContaining({ pendingTranscript: 'raise' }),
    )

    client.sendAudio(new ArrayBuffer(0))
    expect(handler).toHaveBeenLastCalledWith(
      expect.objectContaining({ pendingTranscript: 'raise two' }),
    )

    client.sendAudio(new ArrayBuffer(0))
    expect(handler).toHaveBeenLastCalledWith(
      expect.objectContaining({ pendingTranscript: 'raise two hundred' }),
    )

    // Extra call should keep showing full transcript
    client.sendAudio(new ArrayBuffer(0))
    expect(handler).toHaveBeenLastCalledWith(
      expect.objectContaining({ pendingTranscript: 'raise two hundred' }),
    )
  })

  it('stopRecording() transitions through processing to complete', () => {
    const client = new MockRecognitionClient({ mockDelayMs: 200 })
    const handler = vi.fn()
    client.onStateChange = handler

    client.connect()
    client.sendAudio(new ArrayBuffer(0))
    client.stopRecording()

    // Should be in processing state
    expect(handler).toHaveBeenLastCalledWith(
      expect.objectContaining({ transcriptionStatus: 'processing' }),
    )

    // After delay, should transition to complete
    vi.advanceTimersByTime(200)

    expect(handler).toHaveBeenLastCalledWith(
      expect.objectContaining({ transcriptionStatus: 'complete' }),
    )
  })

  it('complete state has correct transcript and confidence', () => {
    const client = new MockRecognitionClient({
      mockTranscript: 'check',
      mockConfidence: 0.88,
      mockDelayMs: 50,
    })
    const handler = vi.fn()
    client.onStateChange = handler

    client.connect()
    client.sendAudio(new ArrayBuffer(0))
    client.stopRecording()
    vi.advanceTimersByTime(50)

    expect(handler).toHaveBeenLastCalledWith(
      expect.objectContaining({
        transcriptionStatus: 'complete',
        finalTranscript: 'check',
        finalConfidence: 0.88,
      }),
    )
  })

  it('custom config overrides defaults', () => {
    const client = new MockRecognitionClient({
      mockTranscript: 'all in',
      mockDelayMs: 500,
      mockConfidence: 0.72,
    })
    const handler = vi.fn()
    client.onStateChange = handler

    client.connect()
    client.sendAudio(new ArrayBuffer(0))
    client.sendAudio(new ArrayBuffer(0))
    client.stopRecording()

    // Should still be processing before delay elapses
    vi.advanceTimersByTime(499)
    expect(handler).toHaveBeenLastCalledWith(
      expect.objectContaining({ transcriptionStatus: 'processing' }),
    )

    vi.advanceTimersByTime(1)
    expect(handler).toHaveBeenLastCalledWith(
      expect.objectContaining({
        transcriptionStatus: 'complete',
        finalTranscript: 'all in',
        finalConfidence: 0.72,
      }),
    )
  })

  it('disconnect() resets state and clears timeouts', () => {
    const client = new MockRecognitionClient({ mockDelayMs: 200 })
    const handler = vi.fn()
    client.onStateChange = handler

    client.connect()
    client.sendAudio(new ArrayBuffer(0))
    client.stopRecording()

    // Disconnect before timeout fires
    client.disconnect()
    vi.advanceTimersByTime(200)

    // The handler should NOT have been called with 'complete' after disconnect
    const calls = handler.mock.calls
    const lastCall = calls[calls.length - 1]!
    expect(lastCall[0].transcriptionStatus).toBe('processing')
  })
})

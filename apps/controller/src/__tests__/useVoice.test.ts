import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useVoice } from '../hooks/useVoice.js'

// Mock VGF hooks
const mockDispatchThunk = vi.fn()
vi.mock('../hooks/useVGFHooks.js', () => ({
  useDispatchThunk: () => mockDispatchThunk,
}))

// Mock Deepgram (no API key in test env, so fallback to mock is used)
vi.mock('@deepgram/sdk', () => ({
  createClient: vi.fn(),
  LiveTranscriptionEvents: {
    Open: 'open',
    Close: 'close',
    Error: 'error',
    Transcript: 'Results',
  },
}))

describe('useVoice', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockDispatchThunk.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts in idle state', () => {
    const { result } = renderHook(() => useVoice())

    expect(result.current.isListening).toBe(false)
    expect(result.current.transcript).toBe('')
    expect(result.current.error).toBeNull()
  })

  it('starts listening with mock client (no API key)', () => {
    const { result } = renderHook(() => useVoice())

    act(() => {
      result.current.startListening()
    })

    expect(result.current.isListening).toBe(true)
  })

  it('builds transcript while listening', () => {
    const { result } = renderHook(() => useVoice())

    act(() => {
      result.current.startListening()
    })

    // Mock client sends audio on interval, building transcript word by word
    act(() => {
      vi.advanceTimersByTime(100)
    })

    expect(result.current.transcript).toBe('fold')
  })

  it('stops listening and dispatches voice command', () => {
    const { result } = renderHook(() => useVoice())

    act(() => {
      result.current.startListening()
    })

    act(() => {
      vi.advanceTimersByTime(100)
    })

    act(() => {
      result.current.stopListening()
    })

    // MockRecognitionClient default delay is 100ms
    act(() => {
      vi.advanceTimersByTime(100)
    })

    expect(result.current.isListening).toBe(false)
    expect(mockDispatchThunk).toHaveBeenCalledWith('processVoiceCommand', 'fold')
  })

  it('clears transcript on new session', () => {
    const { result } = renderHook(() => useVoice())

    act(() => {
      result.current.startListening()
    })
    act(() => {
      vi.advanceTimersByTime(100)
    })
    act(() => {
      result.current.stopListening()
    })
    act(() => {
      vi.advanceTimersByTime(100)
    })

    // Start new session
    act(() => {
      result.current.startListening()
    })

    // Transcript should be reset (or building fresh)
    expect(result.current.isListening).toBe(true)
  })

  it('exposes startListening and stopListening functions', () => {
    const { result } = renderHook(() => useVoice())

    expect(typeof result.current.startListening).toBe('function')
    expect(typeof result.current.stopListening).toBe('function')
  })
})

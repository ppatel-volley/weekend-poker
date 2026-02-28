import { useState, useRef, useCallback } from 'react'
import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk'
import type { ListenLiveClient } from '@deepgram/sdk'
import { MockRecognitionClient } from '../voice/MockRecognitionClient.js'
import { useDispatchThunk } from './useVGFHooks.js'

const DEEPGRAM_API_KEY = (import.meta.env['VITE_DEEPGRAM_API_KEY'] as string | undefined) ?? ''

interface UseVoiceResult {
  isListening: boolean
  transcript: string
  error: string | null
  startListening: () => void
  stopListening: () => void
}

/**
 * Voice hook with Deepgram STT integration.
 *
 * Flow: User speaks -> Deepgram STT -> text -> dispatch processVoiceCommand thunk.
 * Falls back to MockRecognitionClient when no DEEPGRAM_API_KEY is available.
 */
export function useVoice(): UseVoiceResult {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const dispatchThunk = useDispatchThunk()

  const deepgramRef = useRef<ListenLiveClient | null>(null)
  const mockRef = useRef<MockRecognitionClient | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const dispatchVoiceCommand = useCallback((text: string) => {
    if (text.trim()) {
      ;(dispatchThunk as (name: string, ...args: unknown[]) => void)(
        'processVoiceCommand', text.trim(),
      )
    }
  }, [dispatchThunk])

  const startListening = useCallback(() => {
    setError(null)
    setTranscript('')

    if (!DEEPGRAM_API_KEY) {
      // Fallback: use mock client
      const mock = new MockRecognitionClient()
      mockRef.current = mock

      mock.onStateChange = (state) => {
        setIsListening(state.transcriptionStatus === 'recording')
        setTranscript(state.pendingTranscript)

        if (state.transcriptionStatus === 'complete') {
          setTranscript(state.finalTranscript)
          dispatchVoiceCommand(state.finalTranscript)
          mock.disconnect()
          mockRef.current = null
          setIsListening(false)
        }
      }

      mock.connect()
      setIsListening(true)

      intervalRef.current = setInterval(() => {
        mock.sendAudio(new ArrayBuffer(0))
      }, 100)
      return
    }

    // Real Deepgram integration
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      mediaStreamRef.current = stream

      const client = createClient(DEEPGRAM_API_KEY)
      const connection = client.listen.live({
        model: 'nova-2',
        language: 'en',
        smart_format: true,
        interim_results: true,
        utterance_end_ms: 1500,
      })

      deepgramRef.current = connection

      connection.on(LiveTranscriptionEvents.Open, () => {
        setIsListening(true)

        const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
        recorderRef.current = recorder

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0 && connection.isConnected()) {
            connection.send(event.data)
          }
        }

        recorder.start(250)
      })

      connection.on(LiveTranscriptionEvents.Transcript, (data: unknown) => {
        const result = data as {
          is_final: boolean
          channel: { alternatives: Array<{ transcript: string }> }
        }
        const text = result.channel.alternatives[0]?.transcript ?? ''
        if (text) {
          setTranscript(text)
          if (result.is_final) {
            dispatchVoiceCommand(text)
          }
        }
      })

      connection.on(LiveTranscriptionEvents.Error, () => {
        setError('Voice recognition error')
        setIsListening(false)
      })

      connection.on(LiveTranscriptionEvents.Close, () => {
        setIsListening(false)
      })
    }).catch(() => {
      setError('Microphone access denied')
    })
  }, [dispatchVoiceCommand])

  const stopListening = useCallback(() => {
    // Mock cleanup
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    mockRef.current?.stopRecording()

    // Deepgram cleanup
    recorderRef.current?.stop()
    recorderRef.current = null

    if (deepgramRef.current?.isConnected()) {
      deepgramRef.current.requestClose()
    }
    deepgramRef.current = null

    // Stop microphone
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop())
    mediaStreamRef.current = null

    setIsListening(false)
  }, [])

  return { isListening, transcript, error, startListening, stopListening }
}

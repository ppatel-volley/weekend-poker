import { useState, useRef, useCallback } from 'react'
import { MockRecognitionClient } from '../voice/MockRecognitionClient.js'
import { useDispatchThunk } from './useVGFHooks.js'

export function useVoiceRecognition() {
  const [status, setStatus] = useState<
    'idle' | 'recording' | 'processing' | 'complete'
  >('idle')
  const [pendingTranscript, setPendingTranscript] = useState('')
  const [finalTranscript, setFinalTranscript] = useState('')
  const clientRef = useRef<MockRecognitionClient | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const dispatchThunk = useDispatchThunk()

  const startRecording = useCallback(() => {
    const client = new MockRecognitionClient()
    clientRef.current = client

    client.onStateChange = (state) => {
      setStatus(state.transcriptionStatus)
      setPendingTranscript(state.pendingTranscript)

      if (state.transcriptionStatus === 'complete') {
        setFinalTranscript(state.finalTranscript)
        ;(dispatchThunk as (name: string, ...args: unknown[]) => void)('processVoiceCommand', state.finalTranscript)
        client.disconnect()
        clientRef.current = null
      }
    }

    client.connect()

    intervalRef.current = setInterval(() => {
      client.sendAudio(new ArrayBuffer(0))
    }, 100)
  }, [dispatchThunk])

  const stopRecording = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    clientRef.current?.stopRecording()
  }, [])

  return { status, pendingTranscript, finalTranscript, startRecording, stopRecording }
}

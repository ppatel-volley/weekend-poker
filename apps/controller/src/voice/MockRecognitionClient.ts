export interface RecognitionState {
  transcriptionStatus: 'idle' | 'recording' | 'processing' | 'complete'
  pendingTranscript: string
  finalTranscript: string
  finalConfidence: number
}

export interface MockRecognitionConfig {
  mockTranscript?: string
  mockDelayMs?: number
  mockConfidence?: number
}

export class MockRecognitionClient {
  onStateChange: ((state: RecognitionState) => void) | null = null

  private config: Required<MockRecognitionConfig>
  private state: RecognitionState
  private wordIndex: number = 0
  private words: string[]
  private pendingTimeout: ReturnType<typeof setTimeout> | null = null

  constructor(config?: MockRecognitionConfig) {
    this.config = {
      mockTranscript: config?.mockTranscript ?? 'fold',
      mockDelayMs: config?.mockDelayMs ?? 100,
      mockConfidence: config?.mockConfidence ?? 0.95,
    }
    this.words = this.config.mockTranscript.split(' ')
    this.state = {
      transcriptionStatus: 'idle',
      pendingTranscript: '',
      finalTranscript: '',
      finalConfidence: 0,
    }
  }

  connect(): void {
    this.state = {
      ...this.state,
      transcriptionStatus: 'idle',
    }
    this.onStateChange?.(this.state)
  }

  sendAudio(_chunk: ArrayBuffer): void {
    if (this.wordIndex < this.words.length) {
      this.wordIndex++
    }
    const pending = this.words.slice(0, this.wordIndex).join(' ')
    this.state = {
      ...this.state,
      transcriptionStatus: 'recording',
      pendingTranscript: pending,
    }
    this.onStateChange?.(this.state)
  }

  stopRecording(): void {
    this.state = {
      ...this.state,
      transcriptionStatus: 'processing',
    }
    this.onStateChange?.(this.state)

    this.pendingTimeout = setTimeout(() => {
      this.state = {
        ...this.state,
        transcriptionStatus: 'complete',
        finalTranscript: this.config.mockTranscript,
        finalConfidence: this.config.mockConfidence,
      }
      this.onStateChange?.(this.state)
    }, this.config.mockDelayMs)
  }

  disconnect(): void {
    if (this.pendingTimeout !== null) {
      clearTimeout(this.pendingTimeout)
      this.pendingTimeout = null
    }
    this.wordIndex = 0
    this.state = {
      transcriptionStatus: 'idle',
      pendingTranscript: '',
      finalTranscript: '',
      finalConfidence: 0,
    }
  }
}

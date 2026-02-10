# Recognition Service Documentation

> Comprehensive technical documentation for the voice recognition service.
> Source repo: `/Users/pratik/dev/recognition-service` | SDK: `@volley/recognition-client-sdk` v0.1.424

---

## 1. Overview

The Recognition Service is a real-time speech-to-text transcription service. From the game's perspective, it does one thing: **takes audio input from the player's microphone and returns plain text of what they said**. Under the hood it uses **Deepgram** (primary) and **Google Speech-to-Text** (fallback) as its ASR providers, with automatic failover between them.

The service exposes a WebSocket-based streaming API. The published TypeScript SDK (`@volley/recognition-client-sdk`) handles the connection lifecycle, audio buffering, and result parsing so the game code only needs to send audio in and receive transcribed text out.

**Key characteristics:**
- Real-time streaming transcription via WebSocket — audio in, plain text out
- **Deepgram** as primary ASR provider, **Google Speech-to-Text** as fallback
- Automatic failover between providers (circuit breaker pattern)
- Published TypeScript SDK (`@volley/recognition-client-sdk`) for client integration
- VGF-native state management integration
- Game context support for keyword boosting / slot maps
- Prefix audio support for context priming
- Ring buffer-based audio storage with backpressure management
- Smart TV compatibility (Tizen, webOS)

---

## 2. Monorepo Structure

```
recognition-service/
  apps/
    recognition-service/    # Core WebSocket server for ASR
    recognition-conductor/  # Request routing and load balancing
    recognition-audio-capture/  # Audio capture service
    recognition-inference/  # Python inference service (Uvicorn)
    demo/                   # Web-based demo application
    tts-service/            # Text-to-speech service
  packages/
    client-sdk-ts/          # Published TypeScript SDK (@volley/recognition-client-sdk)
    client-sdk-ts-node18/   # Node 18 compatible SDK
    client-sdk-ts-node22/   # Node 22 compatible SDK
    client-sdk-py/          # Python client SDK
    tsconfig/               # Shared TypeScript config
  libs/
    config/                 # Shared configuration (stage URLs, environment)
    datadog/                # Observability and metrics
    types/                  # Shared types (protocol messages, ASR config)
    utils/                  # Shared utilities
    websocket/              # WebSocket protocol layer
  docs/                     # VitePress documentation
```

---

## 3. Architecture

### 3.1 System Components

| Component | Purpose |
|---|---|
| **WebSocket Handler** | Entry point at `/ws/v1/recognize`, manages client connections |
| **ClientWebSocketJob** | Bridges WebSocket to internal plumbing pipeline |
| **PlumbingRouter** | Type-based message routing (Audio, Control, Context, Results) |
| **UtteranceSetupFactory** | Session creation and provider wiring |
| **Provider Controllers** | Provider-specific streaming implementations (Deepgram, Google, etc.) |
| **ProviderToRecognitionTransformer** | Normalises provider results to unified format |
| **Recognition Conductor** | Request routing, load balancing, concurrency management |

### 3.2 Connection Flow

```
1. Client connects to /ws/v1/recognize?audioUtteranceId=xxx
2. Client sends ASR_REQUEST (provider, language, model)
3. Server creates provider session and wires pipeline
4. Server sends READY_FOR_UPLOADING_RECORDING
5. Client streams binary audio frames
6. Server forwards audio to ASR provider
7. Provider returns partial transcripts (streamed back to client)
8. Client sends STOP_RECORDING control signal
9. Server sends final transcript + metadata
10. Server closes WebSocket connection
```

### 3.3 Binary Audio Frame Format

Audio is sent as binary WebSocket frames with an 8-byte header:

```
[version:1 byte][encoding:1 byte][sampleRate:2 bytes][sequence:4 bytes][...PCM audio payload]
```

### 3.4 Message Types

**Client to Server:**

| Message | Type | Description |
|---|---|---|
| `ASR_REQUEST` | JSON | Configure ASR provider, language, model, encoding |
| `GAME_CONTEXT` | JSON | Game metadata, prompt slot maps for keyword boosting |
| `CONTROL_SIGNAL` | JSON | `START_OF_RECORDING`, `STOP_RECORDING` |
| Audio Frame | Binary | PCM audio with 8-byte header |

**Server to Client** (uses `RecognitionResultTypeV1` enum values as `type` discriminator):

| Message Type | `type` Value | Description |
|---|---|---|
| **Client Control** | `'ClientControlMessage'` | Server control signals (e.g. `ready_for_uploading_recording`) |
| **Transcription** | `'Transcription'` | Transcript result — contains `finalTranscript`, `pendingTranscript`, `is_finished` |
| **Metadata** | `'Metadata'` | Session metadata (timing, cost, audio metrics) — sent once after recording ends |
| **Error** | `'Error'` | Error details with `errorType`, `message`, `code` |
| **Audio Metrics** | `'AudioMetrics'` | Audio quality metrics (volume, silence, clipping, SNR) |

---

## 4. Client SDK (`@volley/recognition-client-sdk`)

### 4.1 Installation

```bash
npm install @volley/recognition-client-sdk
```

### 4.2 Basic Usage

```typescript
import { createClientWithBuilder } from '@volley/recognition-client-sdk';

const client = createClientWithBuilder(builder =>
  builder
    .url('ws://localhost:3101/ws/v1/recognize')
    .asrRequestConfig({
      provider: RecognitionProvider.DEEPGRAM,
      model: 'nova-2',
      language: 'en',
      sampleRate: 16000,
      encoding: AudioEncoding.LINEAR16,
      interimResults: true,
    })
    .onTranscript(result => {
      console.log('Transcript:', result.finalTranscript);
    })
    .onError(error => {
      console.error('Error:', error);
    })
    .build()
);

await client.connect();
client.sendAudio(pcmAudioChunk);  // Send PCM16 audio chunks
await client.stopRecording();      // Wait for final transcript
```

### 4.3 Client State Machine

```
INITIAL -> CONNECTING -> CONNECTED -> READY -> STOPPING -> STOPPED
                                        |                     ^
                                        +-- FAILED -----------+
```

| State | Description |
|---|---|
| `INITIAL` | No connection established |
| `CONNECTING` | Establishing WebSocket connection |
| `CONNECTED` | WebSocket connected, waiting for server ready signal |
| `READY` | Server ready, can send audio |
| `STOPPING` | Sent stop signal, waiting for final transcript |
| `STOPPED` | Connection closed normally |
| `FAILED` | Connection failed or lost unexpectedly |

### 4.4 Connection Retry

Default: 4 attempts (1 initial + 3 retries), 200ms delay between attempts. Configurable:

```typescript
builder.connectionRetry({ maxAttempts: 2, delayMs: 500 })
```

### 4.5 Audio Ring Buffer

The SDK uses a ring buffer for local audio storage:
- Fixed memory footprint (configurable `maxBufferDurationSec`, default 60s)
- Automatic buffering when disconnected
- Immediate send when connected and not backpressured
- Overflow detection via `isBufferOverflowing()`

### 4.6 Stage-Based URL Resolution

```typescript
import { STAGES } from '@volley/recognition-client-sdk';

builder.stage(STAGES.STAGING)  // Automatic URL resolution
// Or: STAGES.LOCAL, STAGES.DEV, STAGES.PRODUCTION
```

### 4.7 Prefix Audio

Send context/priming audio before user audio:

```typescript
client.sendPrefixAudio(contextAudioChunk);  // Buffered until READY, sent before user audio
```

---

## 5. VGF Integration (SimplifiedVGFRecognitionClient)

The SDK provides a first-class VGF integration layer that automatically manages recognition state compatible with VGF's state management.

### 5.1 VGF Recognition State

```typescript
interface RecognitionState {
  audioUtteranceId: string
  startRecordingStatus?: 'NOT_READY' | 'READY' | 'RECORDING' | 'FINISHED'
  transcriptionStatus?: 'NOT_STARTED' | 'IN_PROGRESS' | 'FINALIZED' | 'ABORTED' | 'ERROR'
  finalTranscript?: string
  finalConfidence?: number
  pendingTranscript?: string        // Live partial transcript
  pendingConfidence?: number
  startRecordingTimestamp?: string
  finalRecordingTimestamp?: string
  finalTranscriptionTimestamp?: string
  promptSlotMap?: Record<string, string[]>  // For keyword boosting
  recognitionActionProcessingState?: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'
}
```

### 5.2 SimplifiedVGFRecognitionClient Usage

```typescript
import { createSimplifiedVGFClient, RecognitionContextTypeV1 } from '@volley/recognition-client-sdk';

const client = createSimplifiedVGFClient({
  stage: STAGES.STAGING,
  asrRequestConfig: {
    provider: RecognitionProvider.DEEPGRAM,
    model: 'nova-2',
    language: 'en',
    interimResults: true,
  },
  gameContext: {
    type: RecognitionContextTypeV1.GAME_CONTEXT,
    gameId: 'weekend-poker',
    gamePhase: 'betting',
    slotMap: {
      'bet_amount': ['50', '100', '200', 'all in'],
      'action': ['check', 'call', 'raise', 'fold'],
    },
  },
  onStateChange: (state) => {
    // Update your VGF game state with recognition results
    dispatch('UPDATE_RECOGNITION_STATE', state);
  },
});

await client.connect();
// ... send audio ...
const vgfState = client.getVGFState();  // Get current state snapshot
```

### 5.3 Key Features

- **Automatic state tracking** -- Recording status, transcription progress, and final results
- **Prompt slot maps** -- Keyword boosting for poker-specific vocabulary ("check", "raise", "all in")
- **UUID management** -- Automatic session UUID generation and rotation
- **Duplicate suppression** -- Terminal status emissions are deduplicated
- **Early termination** -- Synthetic finalisation if server connection not established
- **Abnormal stop** -- Immediate cleanup with `ABORTED` status

---

## 6. ASR Providers

The recognition service supports multiple ASR providers, but for Weekend Poker the relevant ones are **Deepgram** (primary) and **Google Speech-to-Text** (fallback). The service handles provider selection and failover automatically — the game code simply sends audio and receives plain text back.

### Providers Used by Weekend Poker

| Provider | Role | Models | Strengths |
|---|---|---|---|
| **Deepgram** | **Primary** | `nova-2`, `nova-2-general` | Low latency, good accuracy, keyword boosting via slot maps |
| **Google** | **Fallback** | Cloud Speech models | Wide language support, reliable fallback |

### Other Providers (supported by service, not used by this game)

The service also supports AssemblyAI, ElevenLabs, Fireworks, Gemini, and OpenAI providers. These are available in the codebase but are not configured for Weekend Poker.

### Traffic Control

- **Circuit Breaker** -- Tracks provider health; if Deepgram fails, automatic failover to Google STT
- **Lease-Based Quota** -- Concurrency control per provider to prevent overload
- **Fallback Models** -- Configurable fallback provider chain (Deepgram -> Google for our game)

---

## 7. Audio Input Requirements

| Parameter | Value |
|---|---|
| **Encoding** | PCM Linear16 (recommended), also supports other encodings |
| **Sample Rate** | 16000 Hz (recommended) |
| **Channels** | Mono |
| **Chunk Size** | ~100 chunks/second (configurable) |
| **Max Buffer** | 60 seconds (configurable ring buffer) |
| **Backpressure** | High water mark: 512KB, Low water mark: 128KB |

---

## 8. Response Format

### Transcription Result

The transcription result contains both final and pending (interim) transcript data. The game receives plain text of what the player said via `finalTranscript`.

```typescript
interface TranscriptionResultV1 {
  type: 'Transcription'                    // RecognitionResultTypeV1.TRANSCRIPTION
  audioUtteranceId: string                 // Session identifier
  finalTranscript: string                  // Final transcript text (won't be overwritten by ASR)
  finalTranscriptRaw: string               // Original final transcript before prefix text removal
  finalTranscriptConfidence?: number       // Confidence score 0.0 - 1.0
  pendingTranscript?: string               // Interim transcript (may be overwritten by ASR)
  pendingTranscriptRaw?: string            // Original pending transcript before prefix text removal
  pendingTranscriptConfidence?: number     // Confidence score for pending transcript 0.0 - 1.0
  is_finished: boolean                     // True if this is the last message in the session
  voiceStart?: number                      // Voice start time in ms from stream start
  voiceDuration?: number                   // Voice duration in ms
  voiceEnd?: number                        // Voice end time in ms from stream start
  startTimestamp?: number                  // Transcription start timestamp (ms)
  endTimestamp?: number                    // Transcription end timestamp (ms)
  receivedAtMs?: number                    // Server receipt timestamp (ms since epoch)
  accumulatedAudioTimeMs?: number          // Total duration of all user audio chunks sent
  rawAudioTimeMs?: number                  // Total audio duration sent to provider (includes prefix)
}
```

**Key fields for the poker game:**
- `finalTranscript` — the plain text of what the player said (e.g. "raise two hundred")
- `pendingTranscript` — live interim text while the player is still speaking
- `is_finished` — true when the session is complete and no more results will arrive
- `finalTranscriptConfidence` — how confident the ASR provider is in the transcription

### Error Result

```typescript
interface ErrorResultV1 {
  type: 'Error'                  // RecognitionResultTypeV1.ERROR
  audioUtteranceId: string       // Session identifier
  errorType?: ErrorTypeV1        // Error category (see Error Handling section)
  message?: string               // Error message (optional)
  code?: string | number         // Error code (optional)
  description?: string           // Detailed description (optional)
}
```

---

## 9. Error Handling

### Error Types

| Type | Description | Retry? |
|---|---|---|
| `ConnectionError` | WebSocket connection failed | Yes (automatic) |
| `TimeoutError` | Operation timed out | Depends |
| `ValidationError` | Invalid configuration | No |
| `ProviderException` | ASR provider error | Yes (circuit breaker) |
| `QuotaExceededException` | Rate limit hit | Wait and retry |
| `AuthenticationException` | Auth failure | No |

### WebSocket Close Codes

| Code | Meaning |
|---|---|
| 1000 | Normal closure |
| 1006 | Abnormal closure (network, server crash, provider failure) |
| 4000 | Auth required |
| 4001 | Auth failed |
| 4002 | Rate limit exceeded |
| 4003 | Invalid session |
| 4004 | Session expired |

---

## 10. Latency Characteristics

- **Connection establishment**: ~100-500ms (with 4 retry attempts if needed)
- **First partial transcript**: Typically 200-800ms after first audio chunk (provider-dependent)
- **Final transcript after stop**: ~500-2000ms (provider-dependent)
- **Audio frame delivery**: Real-time streaming (no batching)

---

## 11. Integration Plan for Weekend Poker

### Voice Command Flow

```
1. Player taps "speak" on mobile Controller
2. Phone starts recording via browser MediaRecorder API
3. Audio chunks sent to SimplifiedVGFRecognitionClient
4. Partial transcripts displayed as player speaks
5. Player releases button (or auto-stop on keyword match)
6. Final transcript processed into game action
7. Game thunk dispatched: dispatch("processVoiceCommand", finalTranscript)
```

### Slot Map Configuration

```typescript
const pokerSlotMap = {
  'action': ['check', 'call', 'raise', 'fold', 'all in'],
  'amount': ['fifty', '50', 'hundred', '100', 'two hundred', '200'],
  'target': ['big blind', 'small blind', 'pot', 'half pot'],
}
```

### Per-Phase Recognition Context

Different phases may need different slot maps:
- **Lobby**: `['ready', 'start', 'settings']`
- **Betting**: `['check', 'call', 'raise', 'fold', 'all in', amount values]`
- **Showdown**: `['next hand', 'leave table']`

### Smart TV Audio Capture

The SDK includes Smart TV compatibility (Tizen 2018+, webOS 3.0+) with Blob-to-ArrayBuffer fallback for older browsers.

### TTS Service

The `tts-service` app in the recognition-service repo provides text-to-speech capability, which can be used for the AI dealer's spoken responses.

# PRD Technical Architecture Review

> **Reviewer:** Technical Director
> **Date:** 2026-02-09
> **PRD Version:** 1.0
> **Overall Confidence:** 93%

---

## Methodology

This review verifies every technical claim in the PRD against source code at `/Users/pratik/dev/vgf` (VGF framework v4.3.1) and `/Users/pratik/dev/recognition-service` (recognition client SDK v0.1.424). Each section is assessed for correctness, completeness, and feasibility.

---

## 1. Amazon GameLift Streams Architecture

**Verdict: CORRECT**

The PRD correctly describes the cloud-rendering, thin-client architecture:

- The Display client runs on a cloud GPU instance, not on the TV. The TV receives a WebRTC video stream. This is accurately described in Section 14.1 and Section 4.
- Stream class `gen5n_ultra` (8 vCPUs, dedicated GPU) is cited correctly for graphically intensive workloads. The alternative `gen5n_high` is mentioned in the risk register as a cost-optimised fallback -- sensible.
- WebRTC delivery via GameLift Streams Web SDK is correctly distinguished from VGF's Socket.IO transport in Section 14.3. The clarification that game code does not interact with WebRTC directly is accurate and important.
- Runtime environment Ubuntu 22.04 LTS is correctly specified.
- The architectural diagrams properly show the Display client on the cloud instance, not the TV.

**Minor note:** The PRD states 1080p at 60fps as the delivery target. GameLift Streams supports this, but actual frame rate will depend on scene complexity and the cloud GPU's headroom. The scene budget (< 85K triangles, < 150 draw calls) is conservative enough for 60fps on a `gen5n_ultra` instance, so this is realistic.

**No issues found.**

---

## 2. VGF Framework Integration

**Verdict: CORRECT -- verified against source code**

### 2.1 Core Types (verified)

**BaseGameState** -- The PRD's `PokerGameState extends BaseGameState` in Section 15.1 is correct. Verified against `/Users/pratik/dev/vgf/packages/vgf/src/game-ruleset/BaseGameState.ts`:

```typescript
// Actual source
export interface BaseGameState extends SessionState {
    previousPhase?: PhaseName | undefined
    phase: PhaseName
    __vgfStateVersion?: number
}
```

The PRD's research doc shows the same interface. Correct.

**GameRuleset** -- The PRD's description of `GameRuleset<GameState>` with `setup`, `actions` (deprecated), `reducers`, `thunks`, `phases`, `onConnect`, `onDisconnect` matches the source at `/Users/pratik/dev/vgf/packages/vgf/src/game-ruleset/GameRuleset.ts`. Correct.

**Phase** -- The Phase interface with `actions` (deprecated), `reducers`, `thunks`, `onBegin`, `onEnd`, `endIf`, and `next` matches `/Users/pratik/dev/vgf/packages/vgf/src/game-ruleset/Phase.ts`. Correct.

**IThunkContext** -- The thunk context with `logger`, `getState`, `getMembers`, `getSessionId`, `getClientId`, `dispatch`, `dispatchThunk`, `scheduler`, and `sessionManager` matches `/Users/pratik/dev/vgf/packages/vgf/src/contexts/ThunkContext/IThunkContext.ts`. Correct.

**Scheduler** -- The scheduler interface with `upsertTimeout`, `upsertInterval`, `cancel`, `pause`, `resume` matches `/Users/pratik/dev/vgf/packages/vgf/src/server/failover/scheduler/Scheduler.ts`. The `UpsertTimeoutOptions` shape (`name`, `delayMs`, `mode`, `dispatch`) is correct. Correct.

### 2.2 Client Hooks (verified)

The following hooks are documented in the PRD research and used throughout:

| Hook | Verified | Notes |
|------|----------|-------|
| `useStateSync` | Yes | Available via `getVGFHooks()` |
| `useStateSyncSelector` | Yes | Available via `getVGFHooks()` |
| `useDispatch` | Yes | Available via `getVGFHooks()` |
| `useDispatchThunk` | Yes | Available via `getVGFHooks()` |
| `usePhase` | Yes | Available via `getVGFHooks()` |
| `useSessionMembers` | Yes | Direct export from `@volley/vgf/client` |
| `useSessionMember` | Yes | Direct export from `@volley/vgf/client` |
| `useClientId` | Yes | Direct export from `@volley/vgf/client` |
| `useClientActions` | Yes | Direct export from `@volley/vgf/client` |
| `useConnectionStatus` | Yes | Direct export from `@volley/vgf/client` |
| `useSessionId` | Yes | Direct export from `@volley/vgf/client` |
| `useEvents` | Yes | Available via `getVGFHooks()` |

**Important clarification:** `useStateSync`, `usePhase`, `useDispatch`, `useDispatchThunk`, and `useEvents` are NOT direct top-level exports from `@volley/vgf/client`. They are accessible via the `getVGFHooks<TGameRuleset, GameState, PhaseName>()` factory function. The PRD research document correctly describes both patterns (Section 5.2 lists them as hooks, Section 5.4 shows the typed hooks factory). This is fine -- the PRD is accurate.

### 2.3 Client Types (verified)

The `ClientType` enum at `/Users/pratik/dev/vgf/packages/vgf/src/server/party-time/types/session/ClientType.ts`:

```typescript
export enum ClientType {
    Display = "DISPLAY",
    Controller = "CONTROLLER",
    Orchestrator = "ORCHESTRATOR",
}
```

Matches the PRD's description of Display, Controller, and Orchestrator client types. Correct.

### 2.4 SessionMember (verified)

The `SessionMember` interface at `/Users/pratik/dev/vgf/packages/vgf/src/server/party-time/types/session/SessionMember.ts` matches the PRD's description exactly: `sessionMemberId`, `connectionId`, `connectionState`, `isReady`, `state`, `clientType`. Correct.

### 2.5 ConnectionState (verified)

The enum values `UNKNOWN`, `NOT_YET_CONNECTED`, `CONNECTED`, `DISCONNECTED`, `TERMINATED` match the source. Correct.

### 2.6 Phase Design

The PRD's phase structure (Section 6) maps well to VGF's phase system. The use of `endIf` for automatic transitions, `onBegin`/`onEnd` for lifecycle, and `next` for sequencing is idiomatic VGF. The `EndIf` type returns a boolean, matching the source. The `Next` type is `string | ((ctx) => string)`, matching the source.

**One observation:** The PRD defines quite granular phases (LOBBY, POSTING_BLINDS, DEALING_HOLE_CARDS, PRE_FLOP_BETTING, DEALING_FLOP, FLOP_BETTING, DEALING_TURN, TURN_BETTING, DEALING_RIVER, RIVER_BETTING, SHOWDOWN, POT_DISTRIBUTION, HAND_COMPLETE). This is 13 phases. VGF has no documented phase count limit, and the phase naming constraints (cannot use `root`, `internal`, or names containing colons) are respected. This is a perfectly valid approach -- granular phases give clean `endIf` conditions and clear separation of concerns.

### 2.7 Version

`@volley/vgf` version 4.3.1 -- confirmed via `package.json`. Correct.

**No issues found with VGF integration.**

---

## 3. Recognition Service Integration

**Verdict: CORRECT -- verified against source code**

### 3.1 TranscriptionResultV1 (verified -- critical check)

The PRD correctly uses `'Transcription'` as the type discriminator value. Verified against `/Users/pratik/dev/recognition-service/libs/types/src/recognition-result-v1.types.ts`:

```typescript
export enum RecognitionResultTypeV1 {
  TRANSCRIPTION = 'Transcription',  // <-- correct
  // ...
}
```

The PRD's Section 16 and the research document both correctly reference:
- `type: 'Transcription'` (not `'RESULT'` or `'TRANSCRIPTION'` -- the actual string value is `'Transcription'`)
- `finalTranscript` field -- confirmed in source
- `pendingTranscript` field -- confirmed in source
- `finalTranscriptConfidence` field -- confirmed in source (optional, number 0-1)
- `is_finished` field -- confirmed in source (boolean)

All field names and types match the Zod schema exactly.

### 3.2 RecognitionResultTypeV1 Enum Values (verified)

| Value in PRD | Actual Source | Match? |
|---|---|---|
| `'ClientControlMessage'` | `CLIENT_CONTROL_MESSAGE = 'ClientControlMessage'` | Yes |
| `'Transcription'` | `TRANSCRIPTION = 'Transcription'` | Yes |
| `'Metadata'` | `METADATA = 'Metadata'` | Yes |
| `'Error'` | `ERROR = 'Error'` | Yes |
| `'AudioMetrics'` | `AUDIO_METRICS = 'AudioMetrics'` | Yes |

All correct.

### 3.3 SimplifiedVGFRecognitionClient (verified)

The PRD references `SimplifiedVGFRecognitionClient` and `createSimplifiedVGFClient`. Both exist in the source at `/Users/pratik/dev/recognition-service/packages/client-sdk-ts/src/simplified-vgf-recognition-client.ts`. The factory function signature and the `ISimplifiedVGFRecognitionClient` interface match the PRD's description.

### 3.4 VGF RecognitionState (verified)

The `RecognitionState` type at `/Users/pratik/dev/recognition-service/packages/client-sdk-ts/src/vgf-recognition-state.ts` includes:
- `audioUtteranceId` -- confirmed
- `startRecordingStatus` (NOT_READY / READY / RECORDING / FINISHED) -- confirmed
- `transcriptionStatus` (NOT_STARTED / IN_PROGRESS / FINALIZED / ABORTED / ERROR) -- confirmed
- `finalTranscript`, `finalConfidence` -- confirmed
- `pendingTranscript`, `pendingConfidence` -- confirmed
- `promptSlotMap` -- confirmed
- `recognitionActionProcessingState` -- confirmed

All match the PRD's Section 5.1 in the research document.

### 3.5 RecognitionContextTypeV1 (verified)

The `GAME_CONTEXT = 'GameContext'` value and the `GameContextV1` schema with `gameId`, `gamePhase`, and `slotMap` fields are all confirmed against `/Users/pratik/dev/recognition-service/libs/types/src/recognition-context-v1.types.ts`.

### 3.6 SDK Version

`@volley/recognition-client-sdk` version 0.1.424 -- confirmed via `package.json`. Correct.

**No issues found with recognition service integration.**

---

## 4. Mobile Controller Architecture

**Verdict: CORRECT**

### 4.1 QR Code Flow

The described flow (Display creates session via `POST /session/create`, generates QR code with sessionId, Controller scans and connects with `ClientType.Controller`) is consistent with VGF's architecture. The `createSocketIOClientTransport` function with `url`, `sessionId`, `userId`, and `clientType` parameters is correctly described and matches the source exports.

### 4.2 Socket.IO Transport

- Default config: infinite reconnection attempts, 50ms initial delay, 500ms max delay, WebSocket-only. This matches the VGF documentation and is correctly stated.
- `sessionMemberId` is stable across reconnections; `connectionId` may change. Verified against the source comments in `SessionMember.ts`.

### 4.3 Controller Independence from GameLift Streams

The PRD correctly notes that the Controller (phone) connects directly to the VGF server via Socket.IO, independent of the GameLift Streams layer. This is architecturally sound -- the phone never interacts with the WebRTC stream.

**No issues found.**

---

## 5. Performance Requirements Assessment

**Verdict: REALISTIC with caveats**

### 5.1 Frame Rate (60fps on cloud GPU)

The scene budget (< 85K triangles, < 150 draw calls, < 128 MB texture memory) is conservative for a `gen5n_ultra` instance. 60fps is realistic. The optimisation techniques listed (instanced rendering for chips, texture atlas for cards, static geometry merging, KTX2 compression) are all standard R3F best practices.

### 5.2 Voice Command Round-Trip (< 1,200ms)

The latency budget breakdown (Section 7.10):
- STT: 200ms target, 500ms max
- Intent parsing: 50ms target, 100ms max
- Game validation: 10ms target, 50ms max
- TTS generation: 200ms target, 500ms max
- Total: ~500ms target, ~1,200ms max

This is **tight but achievable** with Deepgram Nova-2 (which typically delivers partial results in 200-400ms). The TTS target of 200ms is ambitious -- pre-generated common phrases will hit this, but dynamic phrases may push closer to 500ms. Overall, 1,200ms max is realistic.

### 5.3 Bot Decision Latency

- Easy (rules engine): < 2s -- trivially achievable
- Medium (Claude Sonnet 4.5): < 3s -- realistic with pre-computed hand analysis reducing prompt size
- Hard (Claude Opus 4.6): < 5s -- realistic with streaming and pre-computation

The artificial delay masking (thinking animation) is a good design decision that makes the timing feel natural regardless of actual LLM latency.

### 5.4 Scene Load Time (< 5s)

Achievable on a cloud GPU with CDN-delivered assets. The loading cinematic (8s intro video) covers the wait. No concern here.

### 5.5 Network (10 Mbps minimum)

Standard for 1080p WebRTC streaming. Some households with congested WiFi may struggle, but this is a reasonable minimum. The PRD correctly identifies this as a medium-probability risk.

**One concern:** The PRD does not specify a latency target for the GameLift Streams WebRTC path itself. While it mentions "< 100ms" for GameLift Streams input-to-video in Section 19.3, this is an AWS-provided metric that depends heavily on region proximity. For a turn-based game this is not critical, but it should be noted that in regions far from AWS data centres, visual latency could be noticeable (100-200ms). The PRD's risk register does acknowledge this.

---

## 6. System Architecture Completeness

**Verdict: COMPLETE with minor gaps**

### 6.1 Architecture Diagram

The ASCII architecture diagram in Section 14.1 accurately shows:
- TV as thin client with WebRTC
- GameLift Streams cloud GPU running the Display client
- VGF Server with Socket.IO
- Controller connecting directly to VGF server
- Redis, LLM API, and Recognition Service as backend dependencies

This is correct and coherent.

### 6.2 Transport Separation

Section 14.3 correctly separates:
- Game state sync: Socket.IO (VGF)
- Game video/audio to TV: WebRTC (GameLift Streams)
- Voice audio from phone: WebSocket (Recognition Service)
- LLM API calls: HTTPS (server-side)

This is accurate and well-articulated.

### 6.3 Minor Gaps

**Gap 1: TTS architecture detail.** The PRD mentions TTS in several places (Section 9.4, Section 14.2, Section 22.3) but does not commit to a specific TTS provider or describe the audio delivery path in detail. It lists options (in-house tts-service, ElevenLabs, Amazon Polly, Google Cloud TTS) but does not specify which. The `tts-service` in the recognition-service repo is mentioned but not described in the research document. This is acceptable for a PRD (implementation detail) but the team should make this decision early as it affects latency.

**Gap 2: GameLift Streams Web SDK not detailed.** The PRD correctly lists it as a dependency but does not describe the thin client implementation. How does the TV app initialise the GameLift Streams session? Who creates the stream session -- the VGF server or the TV client directly? This is an implementation detail, but given that this is a novel delivery mechanism, a brief description of the stream session lifecycle would strengthen the PRD.

**Gap 3: Audio routing for TTS.** TTS audio is generated server-side and needs to reach the TV speakers. The PRD states (Section 22.3) that audio plays through the GameLift Streams WebRTC stream. This implies the Display client (on the cloud GPU) plays the audio, which is then captured by GameLift Streams and streamed to the TV. This is correct but worth explicitly confirming -- the Display client plays audio through its local audio output, and GameLift Streams captures that audio as part of the WebRTC stream. This should be documented more clearly.

---

## 7. Technical Claims Verification

### 7.1 Claims Verified as Correct

| Claim | Section | Verification |
|---|---|---|
| VGF v4.3.1 | 14.2, 31 | package.json confirms 4.3.1 |
| Recognition SDK v0.1.424 | 16, 31 | package.json confirms 0.1.424 |
| TranscriptionResultV1 uses `'Transcription'` type | 16 | Source code confirms |
| `finalTranscript` / `pendingTranscript` field names | 16 | Source code confirms |
| `finalTranscriptConfidence` field | 16 | Source code confirms |
| BaseGameState has `phase` and `previousPhase` | 15.1 | Source code confirms |
| GameRuleset has `setup`, `reducers`, `thunks`, `phases` | 14.2 | Source code confirms |
| Phase has `endIf`, `onBegin`, `onEnd`, `next` | 6.3 | Source code confirms |
| Scheduler uses `upsertTimeout` with name/delayMs/dispatch | 15.5 | Source code confirms |
| ClientType enum: Display, Controller, Orchestrator | 7 | Source code confirms |
| SessionMember has `sessionMemberId` (stable) | 13.2, 19.2 | Source code confirms |
| Socket.IO with infinite reconnection | 19.2 | VGF defaults confirmed |
| `getVGFHooks()` factory for typed hooks | Research doc | Source code confirms |
| `createSimplifiedVGFClient()` factory | Research doc | Source code confirms |
| RecognitionContextTypeV1.GAME_CONTEXT with slotMap | 16.3 | Source code confirms |

### 7.2 Claims Not Verifiable (External Services)

| Claim | Section | Notes |
|---|---|---|
| GameLift Streams `gen5n_ultra` specs | 4 | AWS documentation claim; cannot verify from local code |
| Deepgram Nova-2 latency (200ms) | 7.10 | Provider-dependent; reasonable estimate |
| Claude Opus 4.6 / Sonnet 4.5 / Haiku 4.5 model availability | 8.10, 31 | Anthropic API claim; these are current models |

### 7.3 No Incorrect Claims Found

I found no technically incorrect claims in the PRD. All verifiable assertions match the source code.

---

## 8. Missing Items from Technical Research

### 8.1 Items Present in Research but Missing from PRD

**VGF `actions` deprecation.** The research doc notes that `actions` is deprecated in favour of `reducers` and `thunks`. The PRD's code examples in Section 15.3 and 15.4 correctly use reducers and thunks, but it would be worth adding a note that the `actions` field in `GameRuleset` and `Phase` should not be used.

**VGF `FailoverVGFServer` / `FailoverVGFServiceFactory`.** The research doc mentions these for production deployments with Redis-backed scheduler recovery. The PRD does not mention which VGF server class to use. For production, `FailoverVGFServiceFactory.create()` is the correct choice and should be specified.

**Recognition SDK `sendPrefixAudio`.** The research doc mentions prefix audio support for context priming. This could be useful for the poker game (e.g., priming with "The player said:" before the actual utterance) but is not mentioned in the PRD. This is an optimisation, not a requirement.

**Recognition SDK connection retry (4 attempts, 200ms delay).** The research doc documents default retry behaviour. The PRD does not mention this, but it is a sensible default.

### 8.2 Items Adequately Covered

The following items from the technical research are correctly represented in the PRD:
- GameLift Streams architecture and deployment model
- VGF phase system, reducers, thunks, hooks
- Recognition service WebSocket protocol and SDK usage
- Mobile controller QR code flow and Socket.IO transport
- Smart TV thin client considerations
- Tech stack (R3F, Theatre.js, Redis, Express)
- Performance targets and latency budgets
- Multi-client testing via `vgf multi-client`

---

## 9. Specific Concerns and Recommendations

### 9.1 Private State Security (LOW risk, acknowledged)

The PRD (Section 15.2) correctly identifies that VGF broadcasts full state to all clients, meaning hole cards are visible in WebSocket messages. The PRD acknowledges this is acceptable for casual play and defers server-side redaction to v2. This is a pragmatic decision and I agree with it.

### 9.2 GameLift Streams Session Lifecycle (MEDIUM concern)

The PRD does not describe who creates the GameLift Streams session or how the TV thin client connects. The flow should be:

1. TV thin client starts
2. TV requests a GameLift Streams session (from the game backend or directly from AWS)
3. GameLift Streams provisions a cloud GPU instance and returns a session URL
4. TV connects via WebRTC using the GameLift Streams Web SDK
5. The Display client on the cloud GPU creates a VGF session
6. QR code is displayed (streamed to TV)

This is implied but not explicit. Recommend adding a brief "GameLift Streams Session Lifecycle" subsection to Section 14 or Section 28.

### 9.3 Redis Configuration (LOW concern)

The PRD mentions Redis for state persistence and scheduler but does not specify clustering, TTL, or eviction policies. Amazon ElastiCache is mentioned in Section 28.1. This is adequate for a PRD -- implementation detail.

### 9.4 Deployment Topology (LOW concern)

The PRD correctly places the VGF server on Kubernetes (AWS EKS). However, the VGF server must be reachable by both the GameLift Streams cloud GPU instance (for the Display client) and the mobile controller (over the internet). This means the VGF server needs a public endpoint (or at least one accessible from both internal AWS networking and the public internet). This is not called out explicitly.

---

## 10. Summary

### Strengths

- **Architecturally sound.** The separation of concerns (thin TV client, cloud-rendered Display, phone Controller, server-authoritative game state) is clean and well-understood.
- **Accurate to source code.** Every VGF and recognition service claim I verified against source code was correct. The `TranscriptionResultV1` type, field names, and enum values are all accurate.
- **Realistic performance targets.** The scene budget, latency budgets, and bot decision timings are achievable.
- **Comprehensive risk register.** The identified risks (GameLift Streams latency, voice accuracy, LLM cost, dealer character quality) are the right ones.
- **Good use of VGF patterns.** The phase design, reducer/thunk split, scheduler usage, and client hooks are all idiomatic.

### Weaknesses

- **GameLift Streams session lifecycle not described.** How the TV connects to GameLift Streams, who provisions the cloud instance, and how the Display client bootstraps are not detailed.
- **TTS provider not decided.** The PRD lists options but does not commit. This should be resolved before Phase 2 begins.
- **`FailoverVGFServiceFactory` not specified.** The production server class should be called out explicitly.

### Confidence Rating

| Category | Score |
|---|---|
| GameLift Streams architecture | 95% |
| VGF integration accuracy | 98% |
| Recognition service integration | 98% |
| Mobile controller architecture | 97% |
| Performance requirements | 90% |
| System architecture completeness | 88% |
| **Overall** | **93%** |

The 7% gap is primarily due to the GameLift Streams session lifecycle detail, TTS provider decision, and a couple of missing implementation-level specifications. None of these are blockers -- they are decisions that need to be made before implementation but do not invalidate the PRD.

### Verdict

**Approve with minor revisions.** The PRD is technically solid. The architecture is correct, the framework integrations are accurately described, and the performance targets are realistic. Address the three weaknesses noted above and this is ready for engineering.

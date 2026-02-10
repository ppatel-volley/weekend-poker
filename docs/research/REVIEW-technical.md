# Technical Documentation Review

> Reviewer: **Principal Engineer / Technical Review Lead**
> Date: 2026-02-09
> Method: Source code verification against `/Users/pratik/dev/vgf` and `/Users/pratik/dev/recognition-service`

---

## Overall Verdict

| Document | Rating | Confidence |
|---|---|---|
| **vgf-framework.md** | 97% | Verified against source code |
| **recognition-service.md** | 88% | Verified against source code -- significant interface inaccuracy found |
| **mobile-controller.md** | 94% | Assessed for completeness |
| **tech-stack.md** | 95% | Evaluated for coherence and accuracy |
| **Overall** | 93.5% | Below 95% target -- recognition-service doc needs fixes |

---

## 1. VGF Framework (`docs/research/vgf-framework.md`) -- VERIFIED

**Rating: 97% -- PASS**

### Source Code Verification Results

Every major API, type, and module documented was cross-checked against the actual source at `/Users/pratik/dev/vgf/packages/vgf/`.

**Verified correct:**

- **Monorepo structure** (Section 2): `packages/vgf`, `packages/eslint-config`, `packages/tsconfig`, `apps/server`, `apps/client`, `apps/k8s` -- all confirmed via directory listing.
- **Package exports** (Section 2): Four entry points (`./client`, `./server`, `./types`, `./util`) match `package.json` lines 7-19 exactly.
- **Version**: `@volley/vgf` v4.3.1 confirmed in `packages/vgf/package.json:3`.
- **GameRuleset interface** (Section 3.1): Matches `src/game-ruleset/GameRuleset.ts` precisely -- `setup`, `actions`, `reducers`, `thunks`, `phases`, `onConnect?`, `onDisconnect?`.
- **BaseGameState** (Section 3.2): Matches `src/game-ruleset/BaseGameState.ts` -- `previousPhase?`, `phase`, `__vgfStateVersion?`, extends `SessionState`.
- **GameReducer type** (Section 3.3): Matches `src/game-ruleset/reducers/GameReducer.ts` -- `(state: GameState, ...args: TArgs) => GameState`.
- **IThunkContext** (Section 3.4): Matches `src/contexts/ThunkContext/IThunkContext.ts` -- `logger`, `getState`, `getMembers`, `getSessionId`, `getClientId`, `dispatch`, `dispatchThunk`, `scheduler`, `sessionManager` -- all confirmed.
- **Phase interface** (Section 3.5): Matches `src/game-ruleset/Phase.ts` -- `actions` (deprecated), `reducers`, `thunks`, `onBegin?`, `onEnd?`, `endIf?`, `next`.
- **Phase naming constraints** (Section 3.5): `root` and `internal` are reserved (confirmed via `src/constants/ROOT_PREFIX.ts` = `"root:"` and `src/internal-reducers/constants/INTERNAL_REDUCER_PREFIX.ts` = `"internal:"`). Colons are forbidden. Confirmed in `src/game-ruleset/validatePhaseName.ts`.
- **VGFServer class** (Section 4.1): Exists at `src/server/VGFServer/VGFServer.ts`. `FailoverVGFServer` and `FailoverVGFServiceFactory` confirmed in the same directory.
- **Storage and Persistence** (Section 4.2): `MemoryStorage` and `RedisPersistence` both exported from `src/server.ts`.
- **SocketIOTransport and ConnectionRegistry** (Section 4.3): Both exported from `src/server.ts`.
- **Session management** (Section 4.4): `__CLIENT_TOGGLE_READY` and `__CLIENT_UPDATE_STATE` confirmed in `src/client/react/hooks/useClientActions/useClientActions.ts` and `src/server/SessionHandlers/StateSyncSessionHandlers.ts`.
- **Scheduler** (Section 4.5): `upsertTimeout`, `upsertInterval`, `cancel` all match `src/server/failover/scheduler/Scheduler.ts`. `RedisRuntimeSchedulerStore` exported from `src/server.ts`.
- **VGFProvider composition** (Section 5.1): Matches `src/client/react/provider/VGFProvider.tsx` exactly -- `LoggerProvider > TransportProvider > PartyTimeClientProvider > SessionProvider > DispatcherProvider > EventsProvider`.
- **Client hooks** (Section 5.2): All hooks confirmed in `src/client/react/hooks/`: `useStateSync`, `useStateSyncSelector`, `useDispatch`, `useDispatchThunk`, `usePhase`, `useSessionMembers`, `useSessionMember`, `useClientId`, `useClientActions`, `useConnectionStatus`, `useSessionId`, `useEvents`.
- **createSocketIOClientTransport** (Section 5.3): Exported from `src/client.ts`.
- **getVGFHooks** (Section 5.4): Confirmed at `src/client/react/util/getVGFHooks/getVGFHooks.ts`. Returns typed versions of `useStateSync`, `useStateSyncSelector`, `useDispatch`, `useDispatchThunk`, `usePhase`, `useEvents`, `useSessionMembers`, `useConnectionStatus`.
- **ClientType enum** (Section 7): `Display`, `Controller`, `Orchestrator` confirmed in `src/server/party-time/types/session/ClientType.ts`.
- **SessionMember interface** (Section 7): All fields confirmed in `src/server/party-time/types/session/SessionMember.ts`.
- **ConnectionState enum** (Section 7): `Unknown`, `NotYetConnected`, `Connected`, `Disconnected`, `Terminated` confirmed in `src/server/party-time/types/session/ConnectionState.ts`.
- **Dependencies** (Section 10): Cross-checked against `package.json` dependencies -- `socket.io`, `ioredis`, `express`, `zod`, `lodash-es`, `node-cache`, `uuid`, `@volley/logger` all present.
- **CLI** (Section 9): `vgf` binary confirmed in `package.json:32` (`"vgf": "./dist/cli.js"`).
- **Node.js 22+, React 19+**: Confirmed in `package.json` engines and peerDependencies.

### Minor Issues

1. **Section 3.3 -- GameReducer default type parameter**: Doc shows `Args extends unknown[] = []` but actual code uses `TArgs extends Array<unknown> = never[]`. Functionally equivalent for most usage, but `never[]` is technically more restrictive. Minor accuracy issue.
   - **File**: `src/game-ruleset/reducers/GameReducer.ts:3`

2. **Section 5.2 -- Missing hook**: The doc omits `useDispatchAction` which is exported from `src/client.ts` and returned by `getVGFHooks`. While it may be deprecated (it's in the `actions` pattern), it exists in the codebase. Not a blocker -- just an omission.

3. **Section 5.1 -- VGFProvider props**: Doc shows `<VGFProvider transport={transport} logger={logger}>` but the actual component also accepts `clientOptions` (including `autoConnect`). Minor omission.

**No hallucinated APIs found. No fabricated modules. This document is solid.**

---

## 2. Recognition Service (`docs/research/recognition-service.md`) -- VERIFIED

**Rating: 88% -- NEEDS FIXES**

### Source Code Verification Results

Cross-checked against `/Users/pratik/dev/recognition-service/`.

**Verified correct:**

- **Monorepo structure** (Section 2): All apps confirmed -- `recognition-service`, `recognition-conductor`, `recognition-audio-capture`, `recognition-inference`, `demo`, `tts-service`. All packages confirmed -- `client-sdk-ts`, `client-sdk-ts-node18`, `client-sdk-ts-node22`, `client-sdk-py`, `tsconfig`. All libs confirmed -- `config`, `datadog`, `types`, `utils`, `websocket`.
- **SDK version**: `@volley/recognition-client-sdk` v0.1.424 confirmed in `packages/client-sdk-ts/package.json:3`.
- **WebSocket endpoint**: `/ws/v1/recognize` confirmed in `apps/recognition-service/src/server.ts:256` and `apps/recognition-service/src/index.ts:321`.
- **Providers** (Section 6): All listed providers confirmed in `apps/recognition-service/src/providers/` -- `deepgram`, `google`, `assemblyai`, `elevenlabs`, `fireworks`, `gemini-batch`, `openai-batch`, `openai-realtime`.
- **ClientState enum** (Section 4.3): `INITIAL`, `CONNECTING`, `CONNECTED`, `READY`, `STOPPING`, `STOPPED`, `FAILED` -- all confirmed in `packages/client-sdk-ts/src/recognition-client.types.ts`.
- **createClientWithBuilder factory** (Section 4.2): Confirmed in `packages/client-sdk-ts/src/factory.ts`.
- **ConfigBuilder** (Section 4.2): Confirmed with `.url()`, `.stage()`, `.asrRequestConfig()`, `.onTranscript()`, `.onError()`, `.build()` methods.
- **Connection retry defaults** (Section 4.4): 4 attempts, 200ms delay -- confirmed in `packages/client-sdk-ts/src/recognition-client.types.ts:186-187`.
- **Ring buffer** (Section 4.5): `maxBufferDurationSec` (default 60s), `isBufferOverflowing()`, `highWaterMark`, `lowWaterMark` confirmed in types.
- **STAGES** (Section 4.6): `LOCAL`, `DEV`, `STAGING`, `PRODUCTION` confirmed in `libs/types/src/stages.types.ts`. Re-exported from SDK confirmed in `packages/client-sdk-ts/src/index.ts:110`.
- **sendPrefixAudio** (Section 4.7): Confirmed in `packages/client-sdk-ts/src/recognition-client.ts:880`.
- **SimplifiedVGFRecognitionClient** (Section 5): Factory `createSimplifiedVGFClient` confirmed in `packages/client-sdk-ts/src/simplified-vgf-recognition-client.ts:522`.
- **RecognitionState schema** (Section 5.1): Most fields confirmed in `packages/client-sdk-ts/src/vgf-recognition-state.ts` -- `audioUtteranceId`, `startRecordingStatus`, `transcriptionStatus`, `finalTranscript`, `finalConfidence`, `pendingTranscript`, `pendingConfidence`, `startRecordingTimestamp`, `finalRecordingTimestamp`, `finalTranscriptionTimestamp`, `promptSlotMap`, `recognitionActionProcessingState`.
- **RecognitionContextTypeV1** (Section 5.2): `GAME_CONTEXT`, `CONTROL_SIGNAL`, `ASR_REQUEST` confirmed in `libs/types/src/recognition-context-v1.types.ts:16-20`.
- **GameContextV1** (Section 5.2): `type`, `gameId`, `gamePhase`, `slotMap` confirmed in `libs/types/src/recognition-context-v1.types.ts:54-70`.
- **Binary audio frame format** (Section 3.3): 8-byte header `[v:1][e:1][sr:2][seq:4]` confirmed in `libs/websocket/src/core/audio-upload-websocket-protocol.ts:129-139`.
- **WebSocket close codes** (Section 9): 1000, 1006, 4000, 4001, 4002, 4003, 4004 all confirmed in `libs/websocket/src/core/audio-upload-websocket-protocol.ts:19-87`.
- **Error types** (Section 9): `ConnectionError`, `TimeoutError`, `ValidationError` exported from SDK. `ErrorTypeV1` enum includes `AUTHENTICATION_ERROR`, `VALIDATION_ERROR`, `PROVIDER_ERROR`, `TIMEOUT_ERROR`, `QUOTA_EXCEEDED`, `CONNECTION_ERROR`, `NO_AUDIO_ERROR`, `CIRCUIT_BREAKER_OPEN`, `UNKNOWN_ERROR` -- confirmed in `libs/types/src/recognition-result-v1.types.ts:166-177`.

### Critical Issues

1. **Section 8 -- TranscriptionResultV1 interface is WRONG** (Severity: HIGH)

   The doc shows:
   ```typescript
   interface TranscriptionResultV1 {
     type: 'RESULT'
     transcript: string
     finalTranscript: string
     confidence: number
     is_final: boolean
     is_finished: boolean
   }
   ```

   The actual schema (from `libs/types/src/recognition-result-v1.types.ts:35-53`) is:
   ```typescript
   {
     type: 'Transcription'          // NOT 'RESULT'
     audioUtteranceId: string
     finalTranscript: string
     finalTranscriptRaw: string
     finalTranscriptConfidence?: number  // NOT 'confidence'
     pendingTranscript?: string
     pendingTranscriptRaw?: string
     pendingTranscriptConfidence?: number
     is_finished: boolean           // This one is correct
     voiceStart?: number
     voiceDuration?: number
     // ... more fields
   }
   ```

   **Problems:**
   - `type` is `'Transcription'`, not `'RESULT'`
   - There is no `transcript` field -- it's `finalTranscript` and `pendingTranscript`
   - There is no `confidence` field -- it's `finalTranscriptConfidence` and `pendingTranscriptConfidence`
   - There is no `is_final` field -- only `is_finished`
   - Missing `audioUtteranceId`, `finalTranscriptRaw`, `pendingTranscriptRaw`, `voiceStart`, `voiceDuration`, `voiceEnd`
   - **File**: `libs/types/src/recognition-result-v1.types.ts:35-53`

2. **Section 8 -- ErrorResultV1 interface is WRONG** (Severity: MEDIUM)

   The doc shows:
   ```typescript
   interface ErrorResultV1 {
     type: 'ERROR'
     audioUtteranceId: string
     message: string
     description: string
     errorType?: ErrorTypeV1
   }
   ```

   The actual schema (from `libs/types/src/recognition-result-v1.types.ts:183-191`) is:
   ```typescript
   {
     type: 'Error'                  // NOT 'ERROR' -- it's the enum value
     audioUtteranceId: string
     errorType?: ErrorTypeV1
     message?: string               // OPTIONAL, not required
     code?: string | number         // MISSING from doc
     description?: string           // OPTIONAL, not required
   }
   ```

   **Problems:**
   - `type` is `'Error'` (enum value `RecognitionResultTypeV1.ERROR`), not the literal string `'ERROR'`
   - `message` is optional, not required
   - `description` is optional, not required
   - Missing `code` field
   - **File**: `libs/types/src/recognition-result-v1.types.ts:183-191`

3. **Section 3.4 -- Message type names are inconsistent** (Severity: MEDIUM)

   The doc uses descriptive labels like `RESULT (PARTIAL)`, `RESULT (FINAL)`, `RESULT (METADATA)`, `CONTROL`. The actual message types use `RecognitionResultTypeV1` enum values: `'Transcription'`, `'Metadata'`, `'Error'`, `'ClientControlMessage'`, `'FunctionCall'`, `'AudioMetrics'`. The doc should use the real enum values for clarity.
   - **File**: `libs/types/src/recognition-result-v1.types.ts:17-24`

### Minor Issues

4. **Section 3.2 -- Connection flow step 2**: Doc says "Client sends ASR_REQUEST (provider, language, model)". The actual message type is `RecognitionContextTypeV1.ASR_REQUEST` = `'ASRRequest'`, not `'ASR_REQUEST'`.

5. **Section 5.1 -- RecognitionState**: The doc omits several fields present in the actual schema: `asrConfig`, `functionCallMetadata`, `functionCallConfidence`, `finalFunctionCallTimestamp`. These are Step 2/3 features and may not be relevant to the poker game, but they exist in the schema.
   - **File**: `packages/client-sdk-ts/src/vgf-recognition-state.ts:26-38`

6. **Section 3.4 -- Missing message types**: The doc does not mention `AUDIO_METRICS` or `FUNCTION_CALL` result types. While these may not be used by the poker game, they exist in the protocol.

7. **Section 7 -- Backpressure values**: Doc says "High water mark: 512KB, Low water mark: 128KB". These are the SDK defaults but I could not confirm the exact values in the type definitions (they are configurable but defaults may be in the implementation). Not a critical issue.

---

## 3. Mobile Controller (`docs/research/mobile-controller.md`) -- ASSESSED

**Rating: 94% -- PASS with minor gaps**

### What is well covered

- QR code connection flow is thorough and matches VGF's actual architecture (verified against `ClientType`, `createSocketIOClientTransport`, `SessionMember` types).
- Socket.IO events and transport configuration are accurate.
- Session member types and connection states are correct (verified against source).
- The private vs. public state discussion (Options A/B/C) is thoughtful and practical.
- Player management patterns (max players, kicking, disconnections) use correct VGF APIs.
- Voice command integration pattern is sensible.
- AI bot as virtual controller approach is sound.

### Gaps and Issues

1. **GameLift Streams impact not addressed** (Severity: MEDIUM)

   The mobile controller doc does not mention Amazon GameLift Streams at all. Since the Display client runs on a cloud GPU instance (not on the TV), the QR code connection flow needs clarification:
   - The QR code URL points to the controller web app, which connects to the VGF server -- this is unaffected by GameLift Streams and remains correct.
   - However, the doc should note that the Display client is running inside a GameLift Streams instance, which may affect how the session URL is constructed and how the VGF server endpoint is resolved.
   - The `@noriginmedia/norigin-spatial-navigation` reference is correct (it runs on the cloud instance, not the TV), but the doc says "TV remote/D-pad navigation" without clarifying the GameLift Streams indirection.

2. **Private state security concern** (Severity: MEDIUM)

   Section 5.3 discusses Options A/B for private data. It states "VGF broadcasts the full game state to all clients" and recommends Options A or B. Both have a security weakness: in Option A, all players' cards are in the shared state (a technically savvy player could inspect WebSocket messages). In Option B, `SessionMember.state` is "visible to all clients but only rendered by the owning controller" -- same issue. The doc should explicitly flag this as a known limitation and assess whether it matters for a casual poker game. For competitive poker it would be a blocker.

3. **Missing: Controller disconnect recovery UX** (Severity: LOW)

   The doc describes the `onDisconnect` handler and auto-fold timeout, but does not cover the reconnection UX from the controller side: what does the player see when their phone reconnects? Does the controller need to re-scan the QR code, or does Socket.IO reconnection restore their session automatically? The answer (based on VGF source) is that Socket.IO reconnects automatically and the `sessionMemberId` stays stable -- the doc mentions this in Section 3.3 but should tie it back to the player experience.

4. **Missing: Controller app deployment** (Severity: LOW)

   No mention of how the controller web app is deployed. Is it a hosted web app? A PWA? How is the URL domain managed? This would be needed for the PRD.

---

## 4. Tech Stack (`docs/research/tech-stack.md`) -- EVALUATED

**Rating: 95% -- PASS**

### What is well done

- **Amazon GameLift Streams integration** is thoroughly documented with correct architectural implications (Section 1). The shift to a thin-client TV model is clearly explained with a helpful diagram.
- **Key implications** of GameLift Streams are correctly identified: no TV WebGL needed, cloud GPU handles rendering, consistent experience across TVs, latency consideration.
- **Stack coherence**: The technologies work together. VGF provides game server + React client, R3F provides 3D rendering, Theatre.js handles animation, all running on a cloud GPU via GameLift Streams. Voice goes through the recognition service. Controllers connect via Socket.IO. This is a coherent architecture.
- **PRD sections** (Section 12) are comprehensive -- 32 sections covering all major areas.
- **Risk assessment** (Section 14) identifies the right risks.

### Issues

1. **Duplicate section numbering** (Severity: LOW)

   Section 3 appears twice: "3D Rendering: React Three Fiber + Three.js" and "Animation: Theatre.js" are both numbered as Section 3. The second should be Section 4 (or renumbered). This cascading error means subsequent sections are misnumbered (current Section 4 should be 5, etc.).

2. **Risk assessment -- "Smart TV WebGL performance" is outdated** (Severity: MEDIUM)

   In Section 14, the risk "Smart TV WebGL performance" is listed as HIGH severity with mitigations including "LOD system" and "fallback 2D mode". However, since the game uses GameLift Streams (cloud rendering), Smart TV WebGL performance is **no longer a risk**. The TV never runs WebGL -- it just decodes a video stream. This risk should be replaced with "**GameLift Streams latency**" (input lag from network round-trip) and "**GameLift Streams cost**" (cloud GPU instances are not cheap).

3. **Section 8 -- "No Additional WebSocket/WebRTC Needed" is misleading** (Severity: MEDIUM)

   The doc says "WebRTC is not required" but GameLift Streams **uses WebRTC** to stream the rendered game to the TV. The statement is technically about game-level transport (VGF handles that), but it could confuse readers given that the entire delivery mechanism is WebRTC-based. Should be clarified: "No additional WebRTC needed for game logic -- VGF's Socket.IO handles state sync. GameLift Streams uses WebRTC for video delivery, but this is managed by the GameLift Streams SDK."

4. **Section 9 -- TV thin client simplification** (Severity: LOW)

   The doc correctly describes the TV as a thin client, but the "TV-Specific Considerations" table still lists `@noriginmedia/norigin-spatial-navigation` running on the cloud instance. Worth noting that input mapping from the TV remote to the cloud instance may require GameLift Streams input configuration, and `norigin-spatial-navigation` would handle focus management on the cloud side.

5. **Missing: GameLift Streams cost estimates** (Severity: LOW)

   No cost information for GameLift Streams. For a PRD, rough cost per stream-hour would be valuable. The `gen5n_ultra` class is recommended but no cost comparison with `gen5n_high` is provided.

6. **Missing: GameLift Streams Web SDK dependency** (Severity: LOW)

   The development stack (Section 10) and infrastructure (Section 11) mention GameLift Streams but don't list the GameLift Streams Web SDK as a dependency. It should be added to the development stack table.

---

## Summary of Required Fixes

### Must Fix (blocks 95% confidence)

| # | Document | Issue | Action |
|---|---|---|---|
| 1 | recognition-service.md | TranscriptionResultV1 interface is wrong | Rewrite Section 8 using actual schema from `libs/types/src/recognition-result-v1.types.ts:35-53` |
| 2 | recognition-service.md | ErrorResultV1 interface is wrong | Fix Section 8 using actual schema from `libs/types/src/recognition-result-v1.types.ts:183-191` |
| 3 | recognition-service.md | Message type names use wrong enum values | Update Section 3.4 to use `RecognitionResultTypeV1` values: `'Transcription'`, `'Metadata'`, `'Error'`, `'ClientControlMessage'` |
| 4 | tech-stack.md | "Smart TV WebGL performance" risk is obsolete | Replace with GameLift Streams latency/cost risks |

### Should Fix (improves quality)

| # | Document | Issue | Action |
|---|---|---|---|
| 5 | tech-stack.md | Duplicate section numbering (two Section 3s) | Renumber sections |
| 6 | tech-stack.md | "No WebRTC needed" contradicts GameLift Streams delivery | Clarify the distinction between game-level and delivery-level WebRTC |
| 7 | mobile-controller.md | No mention of GameLift Streams impact | Add note about Display client running on cloud GPU |
| 8 | mobile-controller.md | Private state security weakness not flagged | Add security note about card visibility in shared state |

### Nice to Have

| # | Document | Issue | Action |
|---|---|---|---|
| 9 | vgf-framework.md | GameReducer default type param is `never[]` not `[]` | Minor fix |
| 10 | recognition-service.md | Missing AUDIO_METRICS and FUNCTION_CALL message types | Add for completeness |
| 11 | tech-stack.md | Missing GameLift Streams Web SDK in dev stack | Add to Section 10 |
| 12 | tech-stack.md | No GameLift Streams cost estimates | Add rough pricing |
| 13 | mobile-controller.md | No controller app deployment details | Add deployment section |

---

## Conclusion

The VGF framework documentation is excellent -- 97% accurate against source code with no hallucinated APIs. That is a rare achievement for AI-generated framework documentation.

The recognition service documentation is solid on architecture and SDK usage but has a critical problem: the **TranscriptionResultV1 interface in Section 8 is fabricated**. The documented field names (`transcript`, `confidence`, `is_final`, `type: 'RESULT'`) do not exist in the actual protocol. This must be fixed before anyone writes integration code against it.

The mobile controller documentation is practical and well-structured but needs a pass to account for the GameLift Streams architecture shift.

The tech stack documentation has been thoughtfully updated for GameLift Streams but has a few internal contradictions (obsolete WebGL risk, WebRTC confusion) that should be cleaned up.

Fix the four "Must Fix" items and this documentation set will be above the 95% confidence target.

# Tech Stack Research

> Full technology stack analysis for the Weekend Poker game, including PRD section recommendations.

---

## 1. Game Delivery: Amazon GameLift Streams

| Aspect | Detail |
|---|---|
| **Service** | Amazon GameLift Streams |
| **Role** | Cloud game streaming — the game runs on AWS GPU instances and is streamed to player devices |
| **Protocol** | WebRTC (Web Real-Time Communication) |
| **Resolution** | Up to 1080p at 60fps |
| **Client** | Any device with a compatible browser (Chrome, Edge, Firefox, Safari) |
| **Bandwidth** | Minimum 10 Mbps for 1080p streaming |
| **Regions** | 12 AWS regions globally (us-east-1, us-west-2, eu-central-1, eu-west-1, ap-northeast-1, etc.) |

### How It Works

The game application (Display client + 3D rendering) runs on cloud GPU instances, **not on the TV itself**. GameLift Streams captures the rendered output and streams it as video to the TV's browser via WebRTC. Player input (remote/D-pad) is sent back to the cloud instance in real-time.

```
Cloud GPU Instance (AWS)              Smart TV / Fire TV
┌────────────────────────┐            ┌──────────────────┐
│  React App (Display)   │            │                  │
│  React Three Fiber     │──video──>  │  Browser (thin   │
│  Theatre.js            │  stream    │  client receives  │
│  Three.js / WebGL      │  (WebRTC)  │  video stream)   │
│  VGF Client            │            │                  │
│                        │<──input──  │  Remote/D-pad    │
└────────────────────────┘            └──────────────────┘
```

### Key Implications

- **No TV-side WebGL required** — rendering happens on cloud GPUs, so Smart TV WebGL limitations are irrelevant
- **No TV-side performance constraints** — polygon counts, post-processing, and shader complexity are bounded by the cloud GPU, not the TV's hardware
- **Higher visual fidelity possible** — cloud GPUs (`gen4n_high`) can handle far more than any Smart TV
- **TV is a thin client** — only needs a browser capable of WebRTC video playback
- **Consistent experience** — identical rendering quality across all TV models/platforms
- **Latency consideration** — network round-trip adds input lag; deploy to regions closest to players

### Stream Classes

| Class | Resources | Use Case |
|---|---|---|
| **gen4n_high** | Sufficient GPU resources for the poker scene's rendering budget | Recommended for Weekend Poker |

### Deployment Model

1. Game application built and uploaded to Amazon S3
2. GameLift Streams application created referencing the S3 build + runtime environment
3. Stream group configured with stream class, capacity (always-on or on-demand), and target regions
4. Players connect via browser — GameLift Streams Web SDK handles the client-side WebRTC connection
5. Runtime environment: Windows Server 2022 (Electron application packaged as Windows executable)

---

## 2. Core Framework: VGF (Volley Games Framework)

| Aspect | Detail |
|---|---|
| **Package** | `@volley/vgf` v4.3.1 |
| **Role** | Game server, state management, client SDK, session management |
| **Runtime** | Node.js 22+ |
| **Client** | React 19+ with hooks-based API |
| **Transport** | Socket.IO (WebSocket) |
| **Storage** | MemoryStorage + RedisPersistence |
| **Documentation** | See `docs/research/vgf-framework.md` |

---

## 3. 3D Rendering: React Three Fiber + Three.js

| Aspect | Detail |
|---|---|
| **Package** | `@react-three/fiber`, `@react-three/drei` |
| **Role** | 3D poker table, cards, chips, environment rendering on the Display client |
| **Three.js** | Underlying WebGL renderer |
| **Rendering** | Server-side on GameLift Streams cloud GPU instances (not on the TV) |
| **Performance** | Cloud GPU removes TV hardware constraints; can use higher poly counts and post-processing |

### Key Considerations
- **Instanced rendering** for chips/cards (many identical objects)
- **Texture atlases** for card faces (single draw call for all cards)
- **Post-processing** is viable — cloud GPUs can handle bloom, ambient occlusion, etc. unlike TV hardware
- **React Three Fiber** integrates naturally with VGF's React client
- **@react-three/drei** provides camera controls, environment maps, text rendering, etc.
- **No TV WebGL dependency** — Three.js runs on the cloud GPU via GameLift Streams

---

## 4. Animation: Theatre.js

| Aspect | Detail |
|---|---|
| **Package** | `@theatre/core`, `@theatre/studio`, `@theatre/r3f` |
| **Role** | Cinematic animations, card dealing, chip movements, camera transitions |
| **Integration** | Works with React Three Fiber via `@theatre/r3f` |
| **Authoring** | Visual timeline editor (Theatre Studio) for designing animations offline |

### Use Cases for Poker
- Card dealing animations (fly from deck to player positions)
- Chip sliding to pot
- Camera swoops between phases (e.g. zoom to community cards on flop reveal)
- Dealer character animations
- Victory/celebration sequences

---

## 5. Pre-Generated AI Video: Nano Banana

| Aspect | Detail |
|---|---|
| **Role** | Pre-rendered cinematic video elements |
| **Use Cases** | Intro sequences, dramatic reveals, dealer character reactions |
| **Integration** | HTML5 `<video>` element overlaid on or composited with 3D scene |
| **Format** | MP4/WebM with transparency (if needed) |

### Considerations
- Videos should be pre-loaded to avoid playback latency
- Codec support is not a concern — video plays on the cloud GPU instance (GameLift Streams), not on the TV directly
- Keep video short (3-10 seconds) for game pacing

---

## 6. Voice Recognition

| Aspect | Detail |
|---|---|
| **Service** | Recognition Service (in-house) |
| **SDK** | `@volley/recognition-client-sdk` v0.1.424 |
| **Protocol** | WebSocket streaming (real-time) |
| **Providers** | Deepgram (primary), Google Speech-to-Text (fallback) |
| **Integration** | SimplifiedVGFRecognitionClient with VGF state mapping |
| **Documentation** | See `docs/research/recognition-service.md` |

### Audio Capture (Mobile Controller)
- Use browser `MediaRecorder` API or `AudioContext` + `ScriptProcessorNode`
- PCM Linear16, 16kHz, mono
- Stream chunks to recognition SDK in real-time
- Push-to-talk model (button hold or tap toggle)

---

## 7. Text-to-Speech (TTS)

| Aspect | Detail |
|---|---|
| **Service** | TTS Service (in recognition-service repo: `apps/tts-service`) |
| **Role** | AI dealer spoken responses |
| **Alternatives** | ElevenLabs API, Google Cloud TTS, Amazon Polly, OpenAI TTS |

### Integration Pattern
1. Game server determines dealer response text (via LLM or scripted)
2. Server requests TTS audio generation
3. Audio URL/data broadcast to Display client
4. Display client (running on GameLift Streams cloud instance) plays audio — streamed to TV via WebRTC
5. Concurrent with text display and dealer animation

### Considerations
- Pre-generate common phrases ("Check", "Your turn", "All in!") for zero latency
- Dynamic phrases (player names, amounts) require real-time TTS
- Latency budget: <500ms for responsive dealer
- Cache frequently used phrases

---

## 8. LLM Integration (AI Bots)

| Aspect | Detail |
|---|---|
| **Role** | AI poker bot decision-making, dealer personality |
| **Options** | Claude API (Anthropic), GPT-4 (OpenAI), Llama (self-hosted) |
| **Integration** | Server-side thunks calling LLM APIs |

### Architecture
```
Game Server Thunk (bot's turn)
  -> Construct prompt (game state, bot personality, hand strength)
  -> Call LLM API
  -> Parse response into game action (fold/check/call/raise amount)
  -> Dispatch reducer with bot's action
  -> Add thinking delay via scheduler for human-like pacing
```

### Latency Considerations
- LLM API call: 500ms-3000ms
- Mask with "thinking" animation on Display
- Pre-compute hand evaluations to reduce prompt complexity
- Consider streaming LLM response for dealer commentary

---

## 9. Multiplayer Transport

| Aspect | Detail |
|---|---|
| **Protocol** | Socket.IO over WebSocket |
| **Provided by** | VGF framework (built-in) |
| **Reconnection** | Automatic with configurable retry |
| **Scaling** | Redis adapter for multi-instance deployment |

### Transport Separation
VGF's Socket.IO transport handles all game state synchronisation. WebRTC is used by **GameLift Streams** for streaming the rendered game to the TV, but this is handled entirely by the GameLift Streams SDK — the game code does not interact with WebRTC directly.

- **Game state**: Socket.IO (VGF) — server to Display client and Controller clients
- **Game video/audio to TV**: WebRTC (GameLift Streams) — cloud instance to TV browser
- **Voice audio capture**: WebSocket (Recognition Service) — phone to ASR service
- All game data flows through VGF's server-authoritative model

---

## 10. Smart TV / Fire TV — Thin Client via GameLift Streams

### Architecture Shift

With Amazon GameLift Streams, the TV is a **thin client**. It does not run the game application locally. Instead:
- The TV browser connects to a GameLift Streams session via the **GameLift Streams Web SDK**
- It receives a **WebRTC video stream** of the rendered game
- It sends **input events** (remote/D-pad) back to the cloud instance
- All 3D rendering, game logic, and audio happen on the cloud GPU

### Target Platforms

| Platform | Requirement | Notes |
|---|---|---|
| **Amazon Fire TV** | Chromium-based browser with WebRTC | Primary target; native Fire TV integration likely |
| **Samsung Tizen** | Browser with WebRTC support | Thin client only — no WebGL needed |
| **LG webOS** | Browser with WebRTC support | Thin client only — no WebGL needed |

### Deployment Options

1. **Fire TV App** -- Thin client app wrapping the GameLift Streams Web SDK; launched from Fire TV home screen
2. **Web App** -- Hosted thin client page loaded via TV browser; URL or QR code entry
3. **Tizen/webOS App** -- Packaged thin client for Samsung/LG app stores

The thin client is minimal: it loads the GameLift Streams Web SDK, establishes a WebRTC session, and forwards input. No game assets, 3D rendering, or heavy JavaScript bundles needed on the TV.

### TV-Specific Considerations

| Concern | Solution |
|---|---|
| **Input** | D-pad/remote input captured by thin client and forwarded to cloud instance; `@noriginmedia/norigin-spatial-navigation` runs on the cloud instance |
| **Performance** | Not a concern — TV only decodes a video stream; all rendering on cloud GPU |
| **Memory** | Minimal — thin client + WebRTC decoder only |
| **Resolution** | GameLift Streams delivers up to 1080p at 60fps |
| **Audio** | Audio is part of the WebRTC stream; plays through TV speakers automatically |
| **Network** | WiFi required; minimum 10 Mbps for 1080p; latency spikes cause visual artefacts rather than frame drops |
| **QR Code** | Rendered on cloud instance, streamed to TV; must be readable from 2-3 metres on TV screen |

---

## 11. Development Stack

| Tool | Purpose |
|---|---|
| **pnpm** | Package manager (monorepo workspaces) |
| **TypeScript** | Type safety across client and server |
| **Vitest** | Unit testing |
| **Playwright** | Functional/E2E testing |
| **VitePress** | Documentation site |
| **Docker Compose** | Local development environment (Redis, services) |
| **ESBuild / TSUp** | Fast builds |
| **Vite** | Client dev server and bundler |
| **Electron** | Display client packaging (Windows .exe for GameLift Streams deployment) |
| **electron-builder** | Electron packaging and distribution |
| **GameLift Streams Web SDK** | Thin client WebRTC connection to GameLift Streams |

---

## 12. Infrastructure

| Component | Technology |
|---|---|
| **Game Streaming** | Amazon GameLift Streams (cloud GPU instances running the Display client) |
| **Game Server** | Node.js + VGF (Express + Socket.IO) |
| **State Store** | Redis (session persistence, scheduler) |
| **Recognition** | Recognition Service (WebSocket ASR) |
| **TTS** | TTS Service or external API |
| **LLM** | External API (Claude/GPT-4) or self-hosted |
| **CDN** | 3D assets, pre-rendered videos, audio files (loaded by cloud instance, not TV) |
| **Hosting** | GameLift Streams for Display client; Kubernetes for game server and backend services |
| **Monitoring** | Datadog (metrics, tracing -- built into VGF) |

---

## 13. PRD Sections Needed

For a game of this scope, the PRD should contain the following sections:

### Core Sections

1. **Executive Summary** -- One-page overview of the game concept, target audience, and platform
2. **Game Overview** -- Texas Hold'em variant, player count (1-4), voice-controlled, Smart TV
3. **Target Audience** -- Casual poker players, family/friends, Smart TV owners
4. **Platform Requirements** -- Amazon GameLift Streams delivery, Fire TV, Samsung Tizen, LG webOS (thin clients), mobile browsers for controllers

### Game Design

5. **Game Mechanics** -- Complete Texas Hold'em rules as implemented, hand rankings, betting structure, blinds
6. **Game Flow / Phase Design** -- Phase-by-phase breakdown mapping to VGF phases
7. **Voice Command Design** -- Supported commands per phase, recognition accuracy requirements, error recovery
8. **AI Bot Design** -- Difficulty levels, personality types, LLM integration, decision-making approach
9. **Dealer System** -- TTS voice, personality, scripted vs. dynamic responses, animation triggers

### User Experience

10. **Display (TV) UI/UX** -- 3D table layout, camera angles, HUD elements, information hierarchy
11. **Controller (Phone) UI/UX** -- Card display, betting controls, voice button, navigation flow
12. **Onboarding / Tutorial** -- First-time experience, QR code joining, voice command training
13. **Session Flow** -- From TV launch to game end, including lobby, matchmaking, rematch

### Technical Architecture

14. **System Architecture** -- GameLift Streams delivery, VGF server, recognition service, TTS, LLM, Redis, CDN
15. **State Management** -- Game state schema, phase transitions, state synchronisation
16. **Voice Pipeline** -- Audio capture, recognition, command parsing, action dispatch
17. **3D Rendering** -- React Three Fiber setup, asset pipeline, cloud GPU performance budgets
18. **Animation System** -- Theatre.js sequences, triggered animations, transitions
19. **Network Architecture** -- Socket.IO transport, reconnection handling, latency budget

### Art and Audio

20. **Visual Style Guide** -- 3D art direction, colour palette, materials, lighting
21. **3D Asset List** -- Table, cards, chips, characters, environment models
22. **Audio Design** -- Sound effects, ambient music, TTS voice style, spatial audio
23. **Pre-Rendered Video** -- Nano Banana prompts, cinematic sequences, when/where they play

### Quality and Operations

24. **Performance Requirements** -- Frame rate targets (60fps via GameLift Streams), load times, cloud GPU budgets, network latency requirements
25. **Testing Strategy** -- Unit tests, integration tests, multi-client testing, TV hardware testing
26. **Accessibility** -- Voice-only play, colour-blind considerations, text sizing on TV
27. **Analytics and Metrics** -- Game events, player behaviour, voice recognition accuracy
28. **Deployment and Release** -- CI/CD pipeline, GameLift Streams deployment (S3 upload, stream group config), TV thin client app store submission, staged rollout

### Project Management

29. **Milestones and Timeline** -- Feature phases, MVP definition, full release
30. **Risk Register** -- GameLift Streams latency and cost, voice recognition accuracy, LLM latency, network bandwidth
31. **Dependencies** -- External services, hardware availability, SDK versions
32. **Team and Skills Required** -- See section below

---

## 14. Skills and Team Composition

| Role | Skills Required | Count |
|---|---|---|
| **Game Designer** | Texas Hold'em mechanics, UX design, voice interface design | 1 |
| **Full-Stack TypeScript Engineer** | React, Node.js, VGF framework, Socket.IO | 2-3 |
| **3D Artist / Technical Artist** | Three.js, React Three Fiber, Blender/Maya, shader writing | 1 |
| **Theatre.js Animator** | Theatre.js timeline authoring, camera work | 1 (or overlap with 3D artist) |
| **Voice/NLP Engineer** | Recognition SDK integration, command parsing, prompt engineering | 1 |
| **AI/LLM Engineer** | LLM prompt engineering, poker strategy, bot personality | 1 |
| **Smart TV / Streaming QA** | Fire TV, Tizen, webOS thin client testing, GameLift Streams session testing, latency profiling | 1 |
| **DevOps** | AWS (GameLift Streams, S3), Kubernetes, Docker, Redis, CI/CD, monitoring | 0.5 |

---

## 15. Technology Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| **GameLift Streams input latency** | High | Deploy to AWS regions closest to players; poker is turn-based so latency is less critical than for action games; monitor round-trip times |
| **Voice recognition accuracy in noisy rooms** | High | Keyword boosting via slot maps; push-to-talk; visual confirmation |
| **GameLift Streams cost at scale** | Medium | Use on-demand capacity for non-peak; `gen4n_high` already cost-optimised; monitor session duration |
| **Network bandwidth requirements** | Medium | 10 Mbps minimum for 1080p; some home WiFi may struggle; consider adaptive quality settings |
| **LLM API latency for bot decisions** | Medium | Pre-compute hand strength; mask with thinking animation; timeout fallback |
| **Socket.IO reliability over cloud network** | Low | VGF server and Display client both run in AWS; low-latency internal networking; automatic reconnection |
| **Theatre.js bundle size** | Low | Tree-shake; lazy-load animation system |
| **Multi-provider recognition failover** | Low | Circuit breaker already built into recognition service |
| **4-player state sync complexity** | Low | VGF handles broadcast; poker has clear turn order |

> **Note:** The previous "Smart TV WebGL performance" risk is **eliminated** by GameLift Streams. Rendering happens on cloud GPUs, so TV hardware limitations are no longer a factor. The TV is a thin client receiving a video stream.

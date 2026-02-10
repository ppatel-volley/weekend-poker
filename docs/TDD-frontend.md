# Technical Design Document — Frontend, 3D Rendering & Mobile Controller

> **Version:** 1.0
> **Date:** 2026-02-09
> **Author:** Staff SWE 2 (Frontend / 3D Rendering)
> **Status:** Draft for Review

---

## Table of Contents

1. [Display Client Architecture](#1-display-client-architecture)
2. [3D Scene Design](#2-3d-scene-design)
3. [Animation System](#3-animation-system)
4. [3D Asset Pipeline](#4-3d-asset-pipeline)
5. [Mobile Controller Client](#5-mobile-controller-client)
6. [Controller-Display Synchronisation](#6-controller-display-synchronisation)
7. [UI/UX Component Design](#7-uiux-component-design)
8. [Performance Optimisation](#8-performance-optimisation)

---

## 1. Display Client Architecture

### 1.1 Overview

The Display client is a React 19 application that renders the shared poker table experience via React Three Fiber and Three.js. It runs on an AWS GameLift Streams cloud GPU instance (`gen4n_high`) inside an Electron shell, packaged as a Windows executable. The TV receives only a WebRTC video/audio stream — it never executes game code.

### 1.2 Runtime Environment

| Aspect | Detail |
|---|---|
| **Host** | GameLift Streams cloud GPU instance (Windows Server 2022) |
| **Shell** | Electron (Chromium-based) |
| **Bundler** | Vite (production build) |
| **Output** | electron-builder Windows .exe |
| **Resolution** | 1920x1080 at 60fps |
| **Audio** | System audio output captured by GameLift Streams and streamed via WebRTC |

### 1.3 Application Bootstrap Sequence

```
1. Electron main process launches
2. Vite-built React app loads in BrowserWindow (fullscreen, frameless)
3. VGFProvider initialises with SocketIOClientTransport:
     - url: VGF server endpoint (wss://poker-api.example.com)
     - clientType: ClientType.Display
     - userId: 'display-1'
4. Display creates VGF session via POST /session/create
5. Session ID returned → QR code URL generated
6. 3D scene assets preloaded from CDN (GLB, KTX2 textures, HDRI, audio)
7. Loading cinematic (#12 card fan transition) plays during asset load
8. Lobby phase renders: QR code, dealer selection, bot config
9. Players scan QR → controllers connect → lobby updates
10. Host starts game → phase transitions begin
```

### 1.4 Component Hierarchy

```
<ElectronApp>
  <VGFProvider transport={displayTransport}>
    <AudioProvider>               // TTS playback, SFX, ambient audio
      <ThemeProvider>             // Colour palette, typography tokens
        <PhaseRouter />           // Switches top-level view by VGF phase
      </ThemeProvider>
    </AudioProvider>
  </VGFProvider>
</ElectronApp>
```

**PhaseRouter** maps VGF phases to React components:

```typescript
// PokerPhase is a shared enum defined in @weekend-poker/shared-types
// (see backend TDD, Section 3.1). The enum uses PascalCase members with
// SCREAMING_SNAKE_CASE string values — both clients use the string values at runtime.
//
// enum PokerPhase {
//   Lobby = 'LOBBY',
//   PostingBlinds = 'POSTING_BLINDS',
//   DealingHoleCards = 'DEALING_HOLE_CARDS',
//   PreFlopBetting = 'PRE_FLOP_BETTING',
//   DealingFlop = 'DEALING_FLOP',
//   FlopBetting = 'FLOP_BETTING',
//   DealingTurn = 'DEALING_TURN',
//   TurnBetting = 'TURN_BETTING',
//   DealingRiver = 'DEALING_RIVER',
//   RiverBetting = 'RIVER_BETTING',
//   AllInRunout = 'ALL_IN_RUNOUT',
//   Showdown = 'SHOWDOWN',
//   PotDistribution = 'POT_DISTRIBUTION',
//   HandComplete = 'HAND_COMPLETE',
// }
import { PokerPhase } from '@weekend-poker/shared-types'

function PhaseRouter() {
  const phase = usePhase<PokerPhase>()

  switch (phase) {
    case PokerPhase.Lobby:
      return <LobbyView />
    default:
      return <GameView phase={phase} />
  }
}
```

The `LobbyView` renders as a full-screen 2D overlay with the QR code, dealer selection panel, and bot configuration. The `GameView` renders the 3D scene for all in-play phases — the scene itself does not unmount between phases; only animations, camera positions, and HUD elements change.

### 1.5 State Consumption Pattern

The Display client consumes VGF game state via typed hooks. To minimise re-renders, all state access uses `useStateSyncSelector` with granular selectors rather than `useStateSync` (which re-renders on every state change).

```typescript
// Typed hooks factory (created once, imported everywhere)
const {
  useStateSync,
  useStateSyncSelector,
  useDispatch,
  useDispatchThunk,
  usePhase,
} = getVGFHooks<typeof pokerRuleset, PokerGameState, PokerPhase>()

// Example selectors
const usePot = () => useStateSyncSelector(s => s.pot)
const useSidePots = () => useStateSyncSelector(s => s.sidePots)
const useCommunityCards = () => useStateSyncSelector(s => s.communityCards)
const useActivePlayerIndex = () => useStateSyncSelector(s => s.activePlayerIndex)
const usePlayers = () => useStateSyncSelector(s => s.players)
const useDealerCharacterId = () => useStateSyncSelector(s => s.dealerCharacterId)
```

### 1.6 Audio Architecture

All audio (TTS, SFX, ambient) plays on the Display client's system audio output, which GameLift Streams captures and delivers to the TV via WebRTC.

```typescript
interface AudioManager {
  // TTS playback — receives SSML/text from VGF server, calls TTS service, plays result
  playDealerSpeech(text: string, dealerVoiceId: string): Promise<void>
  playBotChat(text: string, botVoiceId: string): Promise<void>

  // Sound effects — pre-loaded AudioBuffer instances
  playSFX(name: SFXName): void

  // Ambient audio — looping background tracks
  setAmbientTrack(track: AmbientTrack, volume: number): void
  setAmbientVolume(volume: number): void
}

type SFXName =
  | 'card_deal' | 'card_flip' | 'chip_click' | 'chip_slide'
  | 'shuffle' | 'timer_tick' | 'win_fanfare' | 'all_in_hit'
  | 'fold_muck'

type AmbientTrack = 'jazz_lounge' | 'room_ambience'
```

Audio playback uses the Web Audio API (`AudioContext`) for low-latency SFX and `HTMLAudioElement` for longer TTS clips. The `AudioProvider` React context exposes the `AudioManager` to all components.

**TTS flow:**
1. VGF server broadcasts a `dealerSpeech` event (text + dealer character ID)
2. Display client's `AudioProvider` calls the TTS service with text + voice ID
3. TTS service returns audio data (MP3/WAV)
4. `AudioManager` decodes and plays the audio
5. GameLift Streams captures system audio output into the WebRTC stream

**Audio priority queue:** Dealer announcements take precedence over bot chat. If a dealer announcement arrives whilst bot chat is playing, the bot chat is faded out over 200ms and the dealer announcement plays immediately. Bot chat resumes if time remains before the next game event.

### 1.7 Dev Mode: Split-Screen Controller

For local development, the Display client supports a split-screen mode controlled by the `DEV_SPLIT_SCREEN` environment variable:

```
DEV_SPLIT_SCREEN=true → Left 2/3: Display (game view) | Right 1/3: mock Controller (iframe)
DEV_SPLIT_SCREEN=false (or unset) → Full-screen Display (production mode)
```

The mock Controller is a standard VGF Controller client rendered in an `<iframe>` pointing at the controller web app on localhost. It connects to the same VGF server instance and behaves identically to a real phone controller. The split-screen layout is conditionally rendered and tree-shaken from production builds.

### 1.8 Input Handling (TV Remote via GameLift Streams)

The TV remote's D-pad and select button are forwarded from the TV thin client to the cloud GPU instance via GameLift Streams' input channel. On the cloud instance, these arrive as standard keyboard events. `@noriginmedia/norigin-spatial-navigation` handles focus management within the Display React app for menu navigation (lobby, settings, session summary). During gameplay phases, the TV remote is not the primary input — controllers handle player actions.

---

## 2. 3D Scene Design

### 2.1 Scene Composition

The 3D scene is a single persistent `<Canvas>` component that remains mounted throughout all gameplay phases. Phase transitions change camera position, trigger animations, and toggle visibility of HUD elements — but the scene graph itself does not remount.

```typescript
function GameView({ phase }: { phase: PokerPhase }) {
  return (
    <Canvas
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        outputColorSpace: THREE.SRGBColorSpace,
        powerPreference: 'high-performance',
      }}
      shadows={{ type: THREE.PCFShadowMap }}
      camera={{ fov: 45, near: 0.1, far: 100, position: [0, 8, 10] }}
      dpr={1}  // Fixed 1x DPR — cloud GPU renders at native 1080p
    >
      <Suspense fallback={null}>
        {/* Environment */}
        <PokerRoom />
        <Lighting />
        <PostProcessing />

        {/* Game objects */}
        <PokerTable />
        <DealerAvatar />
        <PlayerSeats />
        <CommunityCards />
        <PotChipPile />
        <SidePotChipPiles />
        <CardDeck />

        {/* 3D HUD elements */}
        <BetPlacards />
        <DealerSpeechBubble />
        <TurnTimerArcs />
        <VoiceCommandIndicators />

        {/* Particles */}
        <CigarSmoke />
        <AmbientDustMotes />

        {/* Camera & animation */}
        <CameraRig phase={phase} />
        <AnimationController phase={phase} />
      </Suspense>
    </Canvas>
  )
}
```

### 2.2 Scene Graph Structure

```
Scene (root)
├── Environment Group (static, merged geometry)
│   ├── RoomShell (#16) — walls, floor, ceiling
│   ├── PendantLights (#17 x3) — emissive glass + SpotLight
│   ├── WallSconces (#18 x4) — emissive glass
│   ├── Window (#19) — drapes + city bokeh VideoTexture backplate
│   ├── DrinksCabinet (#20)
│   ├── Door (#21)
│   ├── WhiskyDecanter (#22)
│   ├── WhiskyTumblers (#23 x2)
│   ├── CigarInAshtray (#24)
│   ├── FramedPosters (#25 x2)
│   ├── VelvetRope (#26)
│   └── DecorativeRug (#27)
│
├── Table Group
│   ├── PokerTable (#1) — felt, rail, rim
│   ├── LeatherChairs (#2 x4, instanced)
│   ├── DealerButton (#3) — position updates per hand
│   ├── SBMarker (#3a) — position updates per hand
│   ├── BBMarker (#3b) — position updates per hand
│   ├── CardShoe (#11a) — near dealer
│   └── BurnPile (#11b) — grows during hand
│
├── Dealer Group
│   ├── DealerAvatar (#12) — upper body, rigged, SkeletonHelper
│   └── DealerHands (#13) — rigged, animated separately
│
├── Player Seats Group (x4)
│   ├── AvatarFrame (#14, variant per player)
│   ├── PlayerChipStack (instanced chips #4-8)
│   ├── BetPlacard (#35) — dynamic text
│   ├── TurnTimerArc (#38) — ring shader
│   └── VoiceIndicator (#36) — mic icon + ripple
│
├── Community Cards Group
│   └── CardMeshes (#10, x5 max) — face texture from atlas
│
├── Pot Group
│   ├── MainPotChipPile (#34, instanced)
│   ├── MainPotPlacard (#35) — dynamic text
│   ├── SidePotChipPile (#39, x2 max, instanced)
│   └── SidePotPlacards (#40, x2 max) — dynamic text
│
├── Particles Group
│   ├── CigarSmoke (#28) — 10-20 sprites, slow upward drift
│   ├── AmbientDustMotes (#32) — slow-drift particles in light beams
│   └── WinCelebration (#31) — gold sparkle, triggered on win (2s burst)
│
├── Lights Group
│   ├── KeyLight — SpotLight (2700-3200K, penumbra: 0.5, shadow-map 1024px)
│   ├── RimLightA — DirectionalLight (5500K, low intensity)
│   ├── RimLightB — DirectionalLight (5500K, low intensity)
│   └── AmbientFill — HemisphereLight + HDRI Environment
│
├── Post-Processing (EffectComposer)
│   ├── Bloom (luminanceThreshold: 0.8, intensity: 0.35, radius: 0.6)
│   └── Vignette (offset: 0.3, darkness: 0.65)
│
└── Camera (PerspectiveCamera, managed by CameraRig)
```

### 2.3 Camera System

The camera is controlled by `CameraRig`, which interpolates between predefined positions triggered by phase changes and game events. All transitions use `THREE.Vector3.lerp` and `THREE.Quaternion.slerp` with a 0.4s ease-in-out timing curve.

```typescript
interface CameraPreset {
  name: string
  position: [number, number, number]
  lookAt: [number, number, number]
  fov: number
}

const CAMERA_PRESETS: Record<string, CameraPreset> = {
  overview: {
    name: 'Table Overview',
    position: [0, 8, 10],
    lookAt: [0, 0.5, 0],
    fov: 45,
  },
  flopReveal: {
    name: 'Flop Reveal',
    position: [0, 4, 3],
    lookAt: [0, 0.3, -0.5],
    fov: 35,
  },
  showdownOrbit: {
    name: 'Showdown Orbit',
    position: [0, 6, 8],  // Start position; orbits 180 degrees
    lookAt: [0, 0.5, 0],
    fov: 40,
  },
  winnerCelebration: {
    name: 'Winner Celebration',
    position: [0, 5, 6],  // Pulls back from winner
    lookAt: [0, 0.5, 0],  // Dynamic: targets winner seat
    fov: 42,
  },
  dealerFocal: {
    name: 'Dealer Focal',
    position: [0, 3, 2],
    lookAt: [0, 1.5, -2],
    fov: 38,
  },
  idleDrift: {
    name: 'Ambient Idle',
    position: [0, 8, 10],  // Gentle sinusoidal breathing
    lookAt: [0, 0.5, 0],
    fov: 45,
  },
}
```

**Camera selection by phase:**

| Phase | Camera Preset | Behaviour |
|---|---|---|
| `LOBBY` | `overview` | Static |
| `POSTING_BLINDS` | `overview` | Static |
| `DEALING_HOLE_CARDS` | `dealerFocal` | Lerp to dealer, then back to overview |
| `PRE_FLOP_BETTING` | `overview` | Idle drift |
| `DEALING_FLOP` | `flopReveal` | Zoom to community cards (1.5s) |
| `FLOP_BETTING` | `overview` | Idle drift |
| `DEALING_TURN` | `flopReveal` | Zoom to community cards (1s) |
| `TURN_BETTING` | `overview` | Idle drift |
| `DEALING_RIVER` | `flopReveal` | Zoom to community cards (1s) |
| `RIVER_BETTING` | `overview` | Idle drift |
| `ALL_IN_RUNOUT` | `showdownOrbit` | Slow 180-degree orbit (3s) |
| `SHOWDOWN` | `showdownOrbit` | Continue orbit |
| `POT_DISTRIBUTION` | `winnerCelebration` | Pull-back dolly from winner (2s) |
| `HAND_COMPLETE` | `overview` | Return to overview |

The `CameraRig` component uses `useFrame` to interpolate camera position and target each frame:

```typescript
function CameraRig({ phase }: { phase: PokerPhase }) {
  const camera = useThree(state => state.camera)
  const targetPos = useRef(new THREE.Vector3())
  const targetLookAt = useRef(new THREE.Vector3())
  const currentLookAt = useRef(new THREE.Vector3(0, 0.5, 0))

  useEffect(() => {
    const preset = getPresetForPhase(phase)
    targetPos.current.set(...preset.position)
    targetLookAt.current.set(...preset.lookAt)
  }, [phase])

  useFrame((_state, delta) => {
    const lerpFactor = 1 - Math.pow(0.001, delta)  // Smooth exponential lerp
    camera.position.lerp(targetPos.current, lerpFactor)
    currentLookAt.current.lerp(targetLookAt.current, lerpFactor)
    camera.lookAt(currentLookAt.current)
  })

  return null
}
```

### 2.4 Lighting Setup

```typescript
function Lighting() {
  return (
    <>
      {/* Key light — warm overhead pendant */}
      <spotLight
        position={[0, 6, 0]}
        angle={Math.PI / 4}
        penumbra={0.5}
        intensity={2.5}
        color={new THREE.Color('#FFD7A3')}  // ~3000K warm
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.0005}
      />

      {/* Rim lights — cool edge highlights */}
      <directionalLight
        position={[5, 4, -3]}
        intensity={0.3}
        color={new THREE.Color('#D4E5FF')}  // ~5500K cool
      />
      <directionalLight
        position={[-5, 4, -3]}
        intensity={0.3}
        color={new THREE.Color('#D4E5FF')}
      />

      {/* Ambient fill */}
      <hemisphereLight
        args={['#FFD7A3', '#1A1A1D', 0.15]}  // warm sky, dark ground
      />

      {/* HDRI environment for reflections */}
      <Environment
        files="studio_small_09_256.ktx2"
        environmentIntensity={0.15}
      />
    </>
  )
}
```

### 2.5 Post-Processing Pipeline

```typescript
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'

function PostProcessing() {
  return (
    <EffectComposer>
      <Bloom
        luminanceThreshold={0.8}
        intensity={0.35}
        radius={0.6}
        levels={4}
      />
      <Vignette
        offset={0.3}
        darkness={0.65}
      />
    </EffectComposer>
  )
}
```

### 2.6 Triangle Budget Breakdown

| Category | Asset(s) | Triangles |
|---|---|---|
| Room shell | #16 | 1,000-2,000 |
| Pendant lights | #17 x3 | 1,200-1,800 |
| Wall sconces | #18 x4 | 800-1,200 |
| Window + drapes | #19 | 800-1,200 |
| Drinks cabinet | #20 | 1,500-2,500 |
| Door | #21 | 600-800 |
| Poker table | #1 | 3,000-5,000 |
| Leather chairs | #2 x4 (instanced) | 2,000-3,000 (one instance) |
| Dealer avatar | #12 | 8,000-12,000 |
| Dealer hands | #13 | 2,000-3,000 |
| Cards (max 17 visible x 60 tri each) | `52-card_deck.glb` | ~1,020 |
| Card shoe + burn pile | #11a, #11b | 400-700 |
| Chips (instanced) | #4-8 | 300-500 (one instance) |
| Avatar frames | #14 x4 | 2,000-3,200 |
| Decorative props | #22-27 | 1,700-2,800 |
| UI elements (placards, bubbles) | #35, #37, #40 | 1,000-1,400 |
| Markers (dealer, SB, BB) | #3, #3a, #3b | 400-800 |
| **Total** | | **~28,000-43,000** |

The total is well within the 85,000 triangle budget. The remaining headroom accommodates chip stack instances (which add per-instance geometry) and particle sprites.

---

## 3. Animation System

### 3.1 Theatre.js Integration

Theatre.js provides declarative, timeline-based animation sequences integrated with React Three Fiber via `@theatre/r3f`. Each animation is authored as a Theatre.js **sheet** containing **sequences** with keyframed properties.

```typescript
import { getProject, types } from '@theatre/core'
import { editable as e, SheetProvider } from '@theatre/r3f'

// One Theatre.js project for the entire game
const pokerProject = getProject('WeekendPoker')

// Sheets for distinct animation contexts
const dealSheet = pokerProject.sheet('CardDeal')
const flopSheet = pokerProject.sheet('FlopReveal')
const chipPushSheet = pokerProject.sheet('ChipPush')
const potCollectSheet = pokerProject.sheet('PotCollect')
const showdownSheet = pokerProject.sheet('Showdown')
const winSheet = pokerProject.sheet('WinCelebration')
const dealerSheet = pokerProject.sheet('DealerGestures')
```

### 3.2 Animation Catalogue

| Animation | Sheet | Duration | Trigger | Description |
|---|---|---|---|---|
| Card deal | `CardDeal` | ~2s | `DEALING_HOLE_CARDS` phase begin | Cards fly from deck position to each player seat, one at a time clockwise. 4 players x 2 cards = 8 cards at 0.25s per card = 2.0s. Each card: 0.25s flight with arc trajectory, lands face-down. |
| Card flip | `FlopReveal` | ~1s per card | `DEALING_FLOP/TURN/RIVER` phase begin | Face-down card rotates 180 degrees on X-axis to reveal face. Gold edge-glow emission pulse on reveal (0.5s). |
| Chip push | `ChipPush` | ~0.5s | Bet placed (reducer callback) | Chip stack at player seat slides along felt toward pot centre. Easing: ease-out cubic. Particle trail (#29) accompanies motion. |
| Pot collect | `PotCollect` | ~1.5s | `POT_DISTRIBUTION` phase begin | Chips from centre slide to winner's seat position. Slight scatter on landing. Dealer nod accompanies. |
| Camera: overview | n/a (useFrame) | Continuous | Default gameplay | Gentle sinusoidal breathing: amplitude 0.1 units, period 6s, applied to camera Y and Z. |
| Camera: flop reveal | n/a (CameraRig) | ~1.5s | `DEALING_FLOP` | Lerp from overview to flop reveal position. |
| Camera: showdown orbit | `Showdown` | ~3s | `SHOWDOWN` phase begin | Camera orbits 180 degrees around table centre at 6 units height. Orbit centre: (0, 0.5, 0). |
| Camera: winner | n/a (CameraRig) | ~2s | `POT_DISTRIBUTION` | Pull-back dolly targeting winner's seat. |
| Turn timer | Custom shader | 30s | Active player's turn begins | Circular arc around avatar frame, depletes clockwise. Colour transitions: gold (#C9A84C) → amber (#D4A843) at 25% → red (#C23B22) at 10% with pulse. |
| Win sparkle | Particle system | ~2s | Winner determined | Gold sparkle particles (#31) rain down above winner's seat. 30-50 particles, gravity: -0.5, lifetime: 2s. |
| Dealer nod | `DealerGestures` | ~1s | Hand complete | Subtle head nod animation on dealer rig. Rotation: 5 degrees on X-axis, ease-in-out. |
| Active player glow | Custom shader (#33) | Continuous | Active player's turn | Emission pulse ring around avatar frame. Pulse frequency: 1Hz, emission intensity oscillates 0.0-0.5. |

### 3.3 Animation State Machine

Animations are triggered by VGF phase changes and state updates. An `AnimationController` component subscribes to phase and state changes and orchestrates Theatre.js sequences.

```typescript
interface AnimationState {
  currentSequence: string | null
  queue: AnimationRequest[]
  isPlaying: boolean
}

interface AnimationRequest {
  sheet: ISheet
  sequenceName: string
  range?: [number, number]  // [start, end] in seconds
  onComplete?: () => void
}
```

**Phase-to-animation mapping:**

```typescript
function AnimationController({ phase }: { phase: PokerPhase }) {
  const prevPhase = useRef<PokerPhase | null>(null)

  useEffect(() => {
    if (prevPhase.current === phase) return
    const prev = prevPhase.current
    prevPhase.current = phase

    switch (phase) {
      case PokerPhase.DealingHoleCards:
        dealSheet.sequence.play({ range: [0, 2] })
        break
      case PokerPhase.DealingFlop:
        flopSheet.sequence.play({ range: [0, 3] })  // 3 cards x ~1s each
        break
      case PokerPhase.DealingTurn:
      case PokerPhase.DealingRiver:
        flopSheet.sequence.play({ range: [0, 1] })  // Single card flip
        break
      case PokerPhase.Showdown:
        showdownSheet.sequence.play({ range: [0, 3] })
        break
      case PokerPhase.PotDistribution:
        potCollectSheet.sequence.play({ range: [0, 1.5] })
        break
      case PokerPhase.HandComplete:
        dealerSheet.sequence.play({ range: [0, 1] })  // Dealer nod
        break
    }
  }, [phase])

  return null
}
```

### 3.4 Animation-to-Phase Feedback

Dealing phases must not end until their animations complete. The VGF server's `endIf` for dealing phases checks a `dealingAnimationComplete` flag in game state. The Display client dispatches a reducer to set this flag when the Theatre.js sequence finishes:

```typescript
// Display client: after animation completes
dealSheet.sequence.play({ range: [0, 2] }).then(() => {
  dispatch('setDealingAnimationComplete', true)
})

// Server-side endIf for DEALING_HOLE_CARDS phase
endIf: (ctx) => {
  const state = ctx.getState()
  return state.dealingAnimationComplete
}
```

This ensures the game does not advance to the betting phase before the dealing animation finishes on the TV.

**Server timeout coordination:** The backend's `dealing-animation-complete` timeout (see backend TDD, dealing phase) must exceed the animation duration. For `DealingHoleCards` (8 cards x 0.25s = 2.0s), the server timeout should be set to ~2,500ms to account for frame-rate variance. For `DealingFlop` (3 cards x ~1s = 3.0s), timeout should be ~3,500ms. The `dealingAnimationComplete` dispatch is the primary phase-advance mechanism; the timeout is a safety net to prevent indefinite stalls if the Display client fails to dispatch.

### 3.5 Theatre.js Studio (Development Only)

During development, Theatre.js Studio provides a visual timeline editor for authoring and tweaking animation sequences:

```typescript
if (import.meta.env.DEV) {
  import('@theatre/studio').then(studio => {
    studio.default.initialize()
  })
}
```

Studio is excluded from production builds via Vite's tree-shaking of dead `import.meta.env.DEV` branches.

### 3.6 Dealer Character Animation

The dealer avatar (#12) uses a rigged skeleton with the following bone hierarchy:

```
Root
├── Spine
│   ├── Spine1
│   │   ├── Spine2
│   │   │   ├── Neck
│   │   │   │   └── Head
│   │   │   ├── LeftShoulder
│   │   │   │   └── LeftArm → LeftForeArm → LeftHand
│   │   │   └── RightShoulder
│   │   │       └── RightArm → RightForeArm → RightHand
```

**Animation clips** (authored in Theatre.js or imported from Meshy auto-rig):

| Clip | Loop | Description |
|---|---|---|
| `idle` | Yes | Subtle breathing motion, occasional weight shift |
| `nod` | No | Single approving head nod |
| `deal` | No | Right arm sweeps forward, mimicking card push |
| `gesture_left` | No | Left hand gestures toward a player seat |
| `gesture_right` | No | Right hand gestures toward a player seat |

Clips are blended using `THREE.AnimationMixer` with cross-fade transitions (0.3s blend time).

---

## 4. 3D Asset Pipeline

### 4.1 Pipeline Overview

```
1. GENERATE    Meshy.AI text-to-3D (prompts from art-direction.md)
2. EVALUATE    Review in Blender: topology, UV layout, texture quality
3. RETOPOLOGISE  Blender: clean topology for animation deformation (dealer only)
4. UV CLEANUP   Blender: re-lay UVs, eliminate overlaps, maximise texel density
5. TEXTURE REBAKE  Blender: re-bake diffuse, roughness, metalness, normal, AO
6. OPTIMISE    Reduce poly count to budget; compress textures to KTX2/Basis
7. EXPORT      glTF 2.0 / GLB (binary)
8. INTEGRATE   Import into R3F scene, assign PBR materials
9. RIG (dealer) Meshy auto-rig or manual Blender rig; export with skeleton
10. ANIMATE     Theatre.js keyframes for cameras/objects; skeleton clips for dealer
11. TEST        Verify on GameLift Streams cloud GPU at 60fps
```

### 4.2 Asset Format Specifications

| Aspect | Specification |
|---|---|
| **Geometry format** | glTF 2.0 binary (.glb) |
| **Texture format (production)** | KTX2 with Basis Universal compression (ETC1S for diffuse/roughness; UASTC for normal maps) |
| **Texture format (source)** | PNG 16-bit for normal/AO; PNG 8-bit for diffuse/roughness/metalness |
| **Colour space** | Diffuse/base colour: sRGB. Normal, roughness, metalness, AO: linear. |
| **HDRI** | "Studio Small 09" from Poly Haven, 256px, HDR compressed to KTX2 |
| **Card textures** | Source asset (`52-card_deck.glb`) uses 52 individual 256x512 JPEG textures (one per card face) plus shared front-face, back-design, and body materials (54 materials, 55 textures total). See Section 4.7 for loading strategy. |
| **Video textures** | MP4 H.264 Baseline profile. 4 Mbps for in-scene textures (city bokeh, room ambience). |

### 4.3 Texture Compression Pipeline

```bash
# Convert PNG source textures to KTX2 with Basis Universal
# Using toktx from Khronos KTX-Software

# Diffuse/base colour — ETC1S (smaller, lossy)
toktx --encode basis-lz --assign_oetf srgb diffuse.ktx2 diffuse.png

# Normal maps — UASTC (higher quality, lossless)
toktx --encode uastc --assign_oetf linear normal.ktx2 normal.png

# Roughness/Metalness/AO — ETC1S (smaller)
toktx --encode basis-lz --assign_oetf linear roughness.ktx2 roughness.png
```

R3F loads KTX2 textures via the `KTX2Loader` from Three.js, which decompresses on the GPU.

### 4.4 Asset Loading Strategy

Assets are loaded during the initial loading phase, whilst the loading cinematic (card fan transition video, #12) plays on screen.

```typescript
import { useGLTF, useKTX2 } from '@react-three/drei'

// Pre-declare all asset URLs for Suspense-based loading
useGLTF.preload('/assets/poker-table.glb')
useGLTF.preload('/assets/leather-chair.glb')
useGLTF.preload('/assets/dealer.glb')
useGLTF.preload('/assets/room-shell.glb')
useGLTF.preload('/assets/52-card-deck.glb')  // Full deck (3.6 MB, 52 cards x 3 primitives)
// ... all GLB assets

useKTX2.preload('/assets/textures/studio_small_09_256.ktx2')
// ... all KTX2 textures
```

Assets are served from a CDN and loaded by the cloud GPU instance's Chromium browser. The `<Suspense>` boundary wrapping the scene graph ensures nothing renders until all assets are ready. The loading cinematic (a `<video>` element layered over the canvas) plays until `<Suspense>` resolves.

### 4.5 Material Assignment

All materials use Three.js PBR materials with maps from the asset pipeline:

```typescript
function PokerTable() {
  const { scene } = useGLTF('/assets/poker-table.glb')

  // Override materials programmatically for consistency
  useMemo(() => {
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.name === 'felt') {
          child.material = new THREE.MeshStandardMaterial({
            color: new THREE.Color('#1B4D2E'),
            roughness: 0.87,
            metalness: 0.0,
            normalMap: feltNormalMap,
          })
        }
        // ... other sub-meshes
      }
    })
  }, [scene])

  return <primitive object={scene} />
}
```

**MeshPhysicalMaterial** is used sparingly (2-3 objects only):
- Table rim mahogany (clear-coat: `clearcoat: 1.0, clearcoatRoughness: 0.1`)
- Whisky tumbler (transmission: `transmission: 0.95, thickness: 2.0`)
- Whisky decanter (transmission: `transmission: 0.95, thickness: 3.0`)

All other surfaces use `MeshStandardMaterial`.

### 4.6 Dealer Asset Risk Mitigation

The dealer avatar (#12) and dealer hands (#13) are the highest-risk AI-generated assets. Mitigation plan:

1. **Primary path:** Generate via Meshy.AI with Refine Prompt OFF (character prompts). Budget 2-3 generation attempts. Retopologise in Blender for clean deformation.
2. **Fallback (hands):** Source pre-made rigged hand model from Sketchfab or TurboSquid (budget $20-50). Retopologise to hit 2,000-3,000 triangle budget.
3. **Fallback (full dealer):** If Meshy output is unsatisfactory after 3 attempts, source a pre-made upper-body character from a marketplace. Re-texture to match the waistcoat/shirt/bow-tie description.
4. **Rigging:** Meshy auto-rig for simple animations. If auto-rig produces poor results, manual rig in Blender (8-10 bones for upper body).

### 4.7 Card Deck Asset

The card deck uses a real Sketchfab-sourced GLB asset (`52-card_deck.glb`, 3.6 MB) rather than a texture atlas approach. Each of the 52 cards is a separate group of 3 mesh primitives (front face, back design, body/edge) with individual textures.

**Asset structure:**

| Property | Value |
|---|---|
| Per card | ~88 vertices, ~60 triangles, 3 mesh primitives |
| Total (52 cards) | ~9,360 render vertices, ~3,120 triangles |
| Textures | 55 total: 52 individual card faces (256x512 JPEG) + shared front, back, body |
| Materials | 54 total (52 unique card faces + shared front + shared body) |
| All materials | Opaque, double-sided |

**Card lookup by name (not index):**

The asset's mesh ordering is non-standard — Spades are in rank order, but Hearts/Diamonds/Clubs use a scrambled order. Cards must be looked up by parsed mesh name, not positional index:

```typescript
// Build a name-based lookup map from the GLB scene graph.
// Known typo: mesh names include "Eigh of Hearts" (should be "Eight") — handled below.
function buildCardMeshMap(deckScene: THREE.Group): Map<string, THREE.Group> {
  const map = new Map<string, THREE.Group>()

  deckScene.traverse((child) => {
    if (child.name && child.name.includes(' of ')) {
      // Normalise known typos
      const normalised = child.name.replace('Eigh of', 'Eight of')
      map.set(normalised, child as THREE.Group)
    }
  })

  return map
}

// Resolve a Card to its mesh group
function getCardMesh(card: Card, meshMap: Map<string, THREE.Group>): THREE.Group | undefined {
  const RANK_NAMES: Record<Rank, string> = {
    '2': 'Two', '3': 'Three', '4': 'Four', '5': 'Five', '6': 'Six',
    '7': 'Seven', '8': 'Eight', '9': 'Nine', '10': 'Ten',
    'J': 'Jack', 'Q': 'Queen', 'K': 'King', 'A': 'Ace',
  }
  const SUIT_NAMES: Record<Suit, string> = {
    hearts: 'Hearts', diamonds: 'Diamonds', clubs: 'Clubs', spades: 'Spades',
  }
  const key = `${RANK_NAMES[card.rank]} of ${SUIT_NAMES[card.suit]}`
  return meshMap.get(key)
}
```

**Visibility management:**

At most 17 cards are visible simultaneously (5 community + 4 players x 2 hole cards + deck). Only visible card meshes are set to `visible: true`; all others are hidden. This reduces draw calls from a worst-case 156 (52 x 3) to ~51 (17 x 3).

**GPU memory:**

All 55 textures total ~37.5 MB uncompressed GPU memory. This is within the 128 MB texture budget given the rest of the scene. For further optimisation, the individual card textures could be converted to KTX2/ETC1S (estimated ~60-70% size reduction to ~12-15 MB), but this is optional given the comfortable budget on GameLift Streams GPU hardware.

---

## 5. Mobile Controller Client

### 5.1 Overview

The mobile controller is a standalone React 19 web application served from a CDN. Players access it by scanning a QR code displayed on the TV. It runs in the phone's mobile browser (Chrome, Safari, Firefox) and connects to the VGF server via Socket.IO WebSocket — entirely independent of the GameLift Streams layer.

### 5.2 Technology Stack

| Technology | Role |
|---|---|
| React 19 | UI framework |
| VGF Client SDK (`@volley/vgf/client`) | State sync, dispatch, hooks |
| `@volley/recognition-client-sdk` | Push-to-talk voice capture + STT |
| Vite | Bundler and dev server |
| CSS Modules or Tailwind CSS | Styling (mobile-first, touch-optimised) |

### 5.3 Connection Flow

```
1. Player sees QR code on TV (rendered by Display client on cloud GPU)
2. Player scans QR with phone camera
3. Phone browser opens: https://controller.example.com?sessionId={sessionId}
4. Controller app extracts sessionId from URL query params
5. App generates a unique userId (crypto.randomUUID(), stored in sessionStorage)
6. SocketIOClientTransport created:
     url: wss://poker-api.example.com
     sessionId: from URL
     userId: generated
     clientType: ClientType.Controller
7. Socket.IO connection established (WebSocket-only, no polling)
8. VGF server adds client as SessionMember
9. Server broadcasts updated member list to all clients
10. Controller renders lobby UI
```

### 5.4 Component Hierarchy

```
<VGFProvider transport={controllerTransport}>
  <RecognitionProvider>         // Recognition SDK lifecycle
    <ControllerPhaseRouter />
  </RecognitionProvider>
</VGFProvider>
```

**ControllerPhaseRouter:**

```typescript
function ControllerPhaseRouter() {
  const phase = usePhase<PokerPhase>()

  switch (phase) {
    case PokerPhase.Lobby:
      return <ControllerLobby />
    default:
      return <ControllerGameplay phase={phase} />
  }
}
```

### 5.5 Lobby Screen

```
+----------------------------------+
|        Weekend Poker             |
|                                  |
|   Enter your name:              |
|   [ _________ ] [Mic icon]     |
|                                  |
|   Choose your avatar:           |
|   [A1] [A2] [A3] [A4] [A5]    |
|   [A6] [A7] [A8]               |
|                                  |
|         [ READY ]               |
|                                  |
|   Waiting for host to start...  |
+----------------------------------+
```

**Name entry** supports two modes:
1. **Voice:** Player taps the mic icon, speaks their name. Recognition SDK transcribes it. Player confirms ("That's right") or retries.
2. **Type:** Standard text input. Max 20 characters. Profanity filter applied client-side (basic word list) and server-side (thunk validation).

Name is stored in `SessionMember.state.displayName` via `updateState({ displayName: 'Alice' })`.

Avatar is stored in `SessionMember.state.avatarId` as a string identifier mapping to a pre-defined avatar set.

### 5.6 Gameplay Screen

```
+----------------------------------+
|  Blinds: 10/20  |  Pot: $850   |
|  Stack: $2,450  |  [Player]'s  |
|                  |    turn      |
+----------------------------------+
|                                  |
|      +------+  +------+         |
|      | A    |  | K    |         |
|      |  ♥   |  |  ♦   |         |
|      |    A |  |    K |         |
|      +------+  +------+         |
|                                  |
+----------------------------------+
|  [FOLD]          [CHECK/CALL]   |
|                   Call $200     |
|                                  |
|  Raise:  $400                   |
|  [-----|--------]               |
|   min             max           |
|  [2x] [3x] [1/2 pot] [Pot]    |
|                                  |
|  [ALL IN $2,450]                |
+----------------------------------+
|                                  |
|     [ 🎤 HOLD TO SPEAK ]       |
|                                  |
|  "Raise to four hundred"       |
+----------------------------------+
```

### 5.7 Controller Component Breakdown

```typescript
// Top-level gameplay component
function ControllerGameplay({ phase }: { phase: PokerPhase }) {
  return (
    <div className="controller-gameplay">
      <StatusBar />
      <HoleCards />
      <BettingControls />
      <PushToTalk />
      <VoiceTranscript />
    </div>
  )
}
```

**StatusBar:**

```typescript
interface StatusBarProps {}

function StatusBar() {
  const blindLevel = useStateSyncSelector(s => s.blindLevel)
  const pot = useStateSyncSelector(s => s.pot)
  const myPlayer = useMyPlayer()  // Custom hook: finds current player by sessionMemberId
  const activePlayerIndex = useStateSyncSelector(s => s.activePlayerIndex)
  const players = useStateSyncSelector(s => s.players)
  const isMyTurn = players[activePlayerIndex]?.id === myPlayer?.id

  return (
    <div className="status-bar">
      <span>Blinds: {blindLevel.smallBlind}/{blindLevel.bigBlind}</span>
      <span>Pot: ${pot.toLocaleString()}</span>
      <span>Stack: ${myPlayer?.stack.toLocaleString()}</span>
      {isMyTurn && <span className="turn-indicator">YOUR TURN</span>}
    </div>
  )
}
```

**HoleCards:**

```typescript
function HoleCards() {
  const myMember = useSessionMember()
  const phase = usePhase<PokerPhase>()
  const holeCards: [Card, Card] | null = myMember?.state?.holeCards ?? null

  // Between hands or pre-deal: show face-down card backs
  if (!holeCards && phase === PokerPhase.Lobby) {
    return <div className="hole-cards empty">Join the table to play</div>
  }
  if (!holeCards && (phase === PokerPhase.DealingHoleCards || phase === PokerPhase.PostingBlinds)) {
    return (
      <div className="hole-cards dealing">
        <CardBack pulse />
        <CardBack pulse />
      </div>
    )
  }
  if (!holeCards) {
    return <div className="hole-cards empty">Waiting for deal...</div>
  }

  return (
    <div className="hole-cards">
      <CardImage card={holeCards[0]} />
      <CardImage card={holeCards[1]} />
    </div>
  )
}
```

**BettingControls:**

```typescript
function BettingControls() {
  const phase = usePhase<PokerPhase>()
  const dispatchThunk = useDispatchThunk()
  const myPlayer = useMyPlayer()
  const currentBet = useStateSyncSelector(s => s.currentBet)
  const pot = useStateSyncSelector(s => s.pot)
  const blindLevel = useStateSyncSelector(s => s.blindLevel)
  const isMyTurn = useIsMyTurn()

  if (!isMyTurn || !isBettingPhase(phase)) return null

  const canCheck = myPlayer.bet >= currentBet
  const callAmount = currentBet - myPlayer.bet
  const minRaise = currentBet + blindLevel.bigBlind  // Simplified; actual min raise is tracked server-side

  const [raiseAmount, setRaiseAmount] = useState(minRaise)

  return (
    <div className="betting-controls">
      <div className="action-row">
        <button className="btn-fold" onClick={() => dispatchThunk('processPlayerAction', myPlayer.id, 'fold', 0)}>
          FOLD
        </button>
        {canCheck ? (
          <button className="btn-check" onClick={() => dispatchThunk('processPlayerAction', myPlayer.id, 'check', 0)}>
            CHECK
          </button>
        ) : (
          <button className="btn-call" onClick={() => dispatchThunk('processPlayerAction', myPlayer.id, 'call', callAmount)}>
            CALL ${callAmount.toLocaleString()}
          </button>
        )}
      </div>

      <div className="raise-row">
        <label>Raise: ${raiseAmount.toLocaleString()}</label>
        <input
          type="range"
          min={minRaise}
          max={myPlayer.stack}
          value={raiseAmount}
          onChange={e => setRaiseAmount(Number(e.target.value))}
        />
        <div className="raise-presets">
          <button onClick={() => setRaiseAmount(currentBet + blindLevel.bigBlind * 2)}>2x</button>
          <button onClick={() => setRaiseAmount(currentBet + blindLevel.bigBlind * 3)}>3x</button>
          <button onClick={() => setRaiseAmount(Math.round(pot / 2))}>1/2 Pot</button>
          <button onClick={() => setRaiseAmount(pot)}>Pot</button>
        </div>
        <button
          className="btn-raise"
          onClick={() => dispatchThunk('processPlayerAction', myPlayer.id, 'raise', raiseAmount)}
        >
          RAISE TO ${raiseAmount.toLocaleString()}
        </button>
      </div>

      <button
        className="btn-allin"
        onClick={() => dispatchThunk('processPlayerAction', myPlayer.id, 'all_in', myPlayer.stack)}
      >
        ALL IN ${myPlayer.stack.toLocaleString()}
      </button>
    </div>
  )
}
```

**Context-sensitive display:** Only legal actions are shown. The server validates all actions in the `processPlayerAction` thunk — the controller's UI gating is a UX convenience, not a security boundary.

### 5.8 Push-to-Talk Implementation

```typescript
function PushToTalk() {
  const recognitionClient = useRecognitionClient()
  const dispatchThunk = useDispatchThunk()
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')

  const startRecording = useCallback(async () => {
    setIsRecording(true)
    setTranscript('')

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: 16000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
      },
    })

    const audioContext = new AudioContext({ sampleRate: 16000 })
    const source = audioContext.createMediaStreamSource(stream)

    // Register AudioWorklet for PCM extraction (replaces deprecated ScriptProcessorNode)
    await audioContext.audioWorklet.addModule('/audio/pcm-worklet-processor.js')
    const workletNode = new AudioWorkletNode(audioContext, 'pcm-worklet-processor', {
      processorOptions: { bufferSize: 4096 },
    })

    workletNode.port.onmessage = (event: MessageEvent<{ int16: Int16Array }>) => {
      recognitionClient.sendAudio(event.data.int16.buffer)
    }

    source.connect(workletNode)
    workletNode.connect(audioContext.destination)

    // Connect first, then subscribe to transcription events
    await recognitionClient.connect()

    recognitionClient.onTranscript((result) => {
      if (result.pendingTranscript) {
        setTranscript(result.pendingTranscript)
      }
      if (result.is_finished && result.finalTranscript) {
        setTranscript(result.finalTranscript)
        // Dispatch voice command to server
        dispatchThunk('processVoiceCommand', result.finalTranscript)
      }
    })
  }, [recognitionClient])

  const stopRecording = useCallback(async () => {
    setIsRecording(false)
    await recognitionClient.stopRecording()
  }, [recognitionClient])

  return (
    <div className="push-to-talk">
      <button
        className={`ptt-button ${isRecording ? 'recording' : ''}`}
        onTouchStart={startRecording}
        onTouchEnd={stopRecording}
        onMouseDown={startRecording}
        onMouseUp={stopRecording}
      >
        {isRecording ? 'LISTENING...' : 'HOLD TO SPEAK'}
      </button>
      {transcript && <div className="voice-transcript">{transcript}</div>}
    </div>
  )
}
```

### 5.9 Recognition SDK Configuration

```typescript
const recognitionClient = createSimplifiedVGFClient({
  stage: STAGES.PRODUCTION,
  asrRequestConfig: {
    provider: RecognitionProvider.DEEPGRAM,
    model: 'nova-2',
    language: 'en',
    sampleRate: 16000,
    encoding: AudioEncoding.LINEAR16,
    interimResults: true,
  },
  gameContext: {
    type: RecognitionContextTypeV1.GAME_CONTEXT,
    gameId: 'weekend-poker',
    gamePhase: currentPhase,  // Updated per phase for slot map changes
    slotMap: getCurrentSlotMap(currentPhase),
  },
  onStateChange: (state) => {
    // Update local recognition state for UI feedback
  },
})
```

**Slot maps by phase:**

```typescript
// Slot maps match the backend's getSlotMapForPhase (see backend TDD, Section 4.2).
// The Controller client sends these to the Recognition Service to boost ASR accuracy.
function getCurrentSlotMap(phase: PokerPhase): Record<string, string[]> {
  switch (phase) {
    case PokerPhase.Lobby:
      return {
        command: ['ready', 'start', 'settings', 'easy', 'medium', 'hard'],
      }

    case PokerPhase.PreFlopBetting:
    case PokerPhase.FlopBetting:
    case PokerPhase.TurnBetting:
    case PokerPhase.RiverBetting:
      return {
        action: ['check', 'call', 'raise', 'fold', 'all in', 'bet'],
        amount: [
          'fifty', '50', 'hundred', '100', 'two hundred', '200',
          'three hundred', '300', 'five hundred', '500', 'thousand', '1000',
        ],
        relative: [
          'pot', 'half pot', 'min raise', 'minimum',
          'three x', '3x', 'two x', '2x',
        ],
      }

    case PokerPhase.Showdown:
    case PokerPhase.HandComplete:
      return {
        command: ['next hand', 'leave table', 'rebuy', 'cash out', 'sit out'],
      }

    default:
      return {
        query: ['what is the pot', 'how many chips', 'what is the bet',
          'what do i have', 'what are the blinds', 'help', 'repeat'],
      }
  }
}
```

### 5.10 Mobile-Specific Considerations

| Concern | Solution |
|---|---|
| **Touch targets** | Minimum 48x48 CSS pixels for all interactive elements (WCAG 2.5.5) |
| **Viewport** | `<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">` — prevents zoom on double-tap |
| **Orientation** | Portrait-locked via `screen.orientation.lock('portrait')` (where supported) |
| **Wake lock** | `navigator.wakeLock.request('screen')` to prevent display sleep during gameplay |
| **Safe areas** | `env(safe-area-inset-*)` for notch/home indicator avoidance |
| **Haptic feedback** | `navigator.vibrate(50)` on action confirmation (where supported) |
| **Offline** | No offline support required — the game requires an active network connection |
| **Bundle size** | Target < 200KB gzipped (no 3D assets; just React + VGF client + recognition SDK) |

---

## 6. Controller-Display Synchronisation

### 6.1 State Flow Architecture

Both the Display client and all Controller clients connect to the same VGF server session via Socket.IO. The VGF server is the single source of truth. All clients receive identical `StateUpdateMessage` broadcasts after every state mutation.

```
Controller (Phone A)  ──dispatch──►  VGF Server  ──broadcast──►  Display (Cloud GPU)
Controller (Phone B)  ──dispatch──►  VGF Server  ──broadcast──►  Controller (Phone A)
                                     VGF Server  ──broadcast──►  Controller (Phone B)
```

### 6.2 State Update Latency Path

| Segment | Protocol | Expected Latency |
|---|---|---|
| Controller → VGF Server | Socket.IO (WSS) | 10-50ms (phone WiFi → internet → AWS) |
| VGF Server processing | In-memory | 1-5ms |
| VGF Server → Display | Socket.IO (WSS) | 5-15ms (AWS internal networking) |
| Display render → TV | WebRTC (GameLift Streams) | 50-100ms (encode + stream + decode) |
| **Total: Controller action → TV visual** | | **~70-170ms** |

For a turn-based game, this latency is imperceptible. The dealer's TTS confirmation (which takes 200-500ms to generate) masks any visual delay.

### 6.3 Private State Handling

Hole cards are stored in `SessionMember.state.holeCards` (per-member state), set by the server during the `DEALING_HOLE_CARDS` phase `onBegin` hook:

```typescript
// Server-side: deal hole cards into member state
onBegin: async (ctx) => {
  const state = ctx.getState()
  const members = ctx.getMembers()
  const deck = shuffleDeck()
  let deckIndex = 0

  for (const player of state.players) {
    if (player.isBot) continue  // Bots' cards stored in game state only
    const member = findMemberByPlayerId(members, player.id)
    if (member) {
      ctx.sessionManager.updateMemberState(member.sessionMemberId, {
        holeCards: [deck[deckIndex++], deck[deckIndex++]],
      })
    }
  }

  return { ...state, deck: deck.slice(deckIndex) }
}
```

**Security boundary:** VGF broadcasts `SessionMember.state` to all clients. A technically savvy player could inspect WebSocket messages to see other players' cards. This is an accepted trade-off for v1 (casual play). The Controller UI simply does not render other players' hole cards. A `SessionMember.state` field named `holeCards` is only rendered by the owning controller.

### 6.4 Reconnection Handling

Socket.IO handles reconnection automatically with the following configuration:

```typescript
const controllerTransport = createSocketIOClientTransport({
  url: 'wss://poker-api.example.com',
  sessionId: sessionIdFromQR,
  userId: storedUserId,  // Retrieved from sessionStorage for reconnection
  clientType: ClientType.Controller,
  socketIOOptions: {
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 50,
    reconnectionDelayMax: 500,
    transports: ['websocket'],  // WebSocket-only, no polling
  },
})
```

On reconnection:
1. The `sessionMemberId` remains stable (the VGF server maps `userId` to `sessionMemberId`).
2. The server broadcasts full state to the reconnected client.
3. The Controller UI re-renders with current game state.
4. No QR re-scan required.
5. If the player was disconnected during their turn, the action timer continues. If the timer expired during disconnection, the server auto-checked or auto-folded.

### 6.5 Display-Side Controller Awareness

The Display client renders player representations based on `SessionMember` data:

```typescript
function PlayerSeats() {
  const members = useSessionMembers()
  const players = useStateSyncSelector(s => s.players)

  const controllerMembers = Object.values(members).filter(
    m => m.clientType === 'CONTROLLER' && m.connectionState === 'CONNECTED'
  )

  return (
    <>
      {players.map((player, index) => (
        <PlayerSeat
          key={player.id}
          player={player}
          seatIndex={index}
          isConnected={!player.isBot && controllerMembers.some(m => m.state?.playerId === player.id)}
        />
      ))}
    </>
  )
}
```

Disconnected human players show a "Disconnected" indicator on their avatar frame. Bot players never show a connection indicator.

---

## 7. UI/UX Component Design

### 7.1 Display HUD Elements

All HUD elements on the Display client are rendered in 3D space (billboarded quads or Three.js `Text` from `@react-three/drei`) to maintain visual consistency with the scene. No HTML overlay is used during gameplay — everything the viewer sees is part of the WebRTC-streamed 3D render.

### 7.2 Player Info Card (3D)

Each player seat has a floating info card rendered as a billboarded group:

```typescript
interface PlayerInfoCardProps {
  player: PokerPlayer
  seatIndex: number
  isActive: boolean
}

function PlayerInfoCard({ player, seatIndex, isActive }: PlayerInfoCardProps) {
  const seatPosition = SEAT_POSITIONS[seatIndex]

  return (
    <group position={[seatPosition.x, seatPosition.y + 0.8, seatPosition.z]}>
      {/* Background panel — dark green felt with brass border */}
      <mesh>
        <planeGeometry args={[1.2, 0.6]} />
        <meshStandardMaterial color="#1B4D2E" roughness={0.85} />
      </mesh>

      {/* Avatar frame (3D model #14) */}
      <AvatarFrame
        variant={player.avatarFrameVariant}
        avatarTexture={player.avatarTexture}
        position={[-0.4, 0, 0.01]}
        scale={0.3}
      />

      {/* Player name — ivory, 28px equivalent */}
      <Text
        position={[0.1, 0.12, 0.01]}
        fontSize={0.08}
        color="#F5F2ED"
        font="/fonts/inter-medium.woff2"
        anchorX="left"
      >
        {player.name}
      </Text>

      {/* Chip count — gold, 32px equivalent */}
      <Text
        position={[0.1, -0.02, 0.01]}
        fontSize={0.1}
        color="#C9A84C"
        font="/fonts/inter-bold.woff2"
        anchorX="left"
      >
        ${player.stack.toLocaleString()}
      </Text>

      {/* Action indicator strip */}
      <ActionIndicator
        action={player.lastAction}
        position={[0, -0.25, 0.01]}
      />

      {/* Turn timer arc (shader) */}
      {isActive && <TurnTimerArc position={[0, 0, -0.01]} />}
    </group>
  )
}
```

### 7.3 Action Indicator

The bottom strip of each player info card shows their current action with colour and text label:

```typescript
const ACTION_COLOURS: Record<PlayerAction | 'waiting', string> = {
  fold: '#4A4845',    // Warm grey
  check: '#2D8B4E',   // Green
  call: '#2D5F8B',    // Blue
  bet: '#C9A84C',     // Gold (opening bet, same as raise)
  raise: '#C9A84C',   // Gold
  all_in: '#C23B22',  // Red (pulsing)
  waiting: '#2A2A2E', // Charcoal (no action yet)
}
```

The `ACTION_COLOURS` keys match the backend's `PlayerAction` union (`'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all_in'`) plus `'waiting'` for the default no-action state. Note: `PlayerStatus` (`'active' | 'folded' | 'all_in' | 'sitting_out' | 'busted'`) is a separate type used for player lifecycle, not UI action display. The `player.lastAction` field is sourced from `PokerPlayer.lastAction: PlayerAction | null` (see backend TDD, `PokerPlayer` interface).

Each indicator displays both the colour AND a text label ("FOLD", "CALL $200", "RAISE $500", "ALL IN") to satisfy colour-blind accessibility requirements.

### 7.4 Pot Display (3D)

```typescript
function PotDisplay() {
  const pot = usePot()
  const sidePots = useSidePots()

  return (
    <group position={[0, 0.3, 0]}>
      {/* Physical chip pile — instanced chips scaled to represent pot size */}
      <ChipPile amount={pot} position={[0, 0, 0]} />

      {/* Brass-framed placard above pile */}
      <BrassPlacardWithText
        text={`$${pot.toLocaleString()}`}
        position={[0, 0.4, 0]}
        fontSize={0.14}  // 40px equivalent
        color="#C9A84C"
      />

      {/* Side pots (up to 2) */}
      {sidePots.map((sidePot, i) => (
        <group key={i} position={[0.8 * (i + 1), 0, 0.3]}>
          <ChipPile amount={sidePot.amount} position={[0, 0, 0]} scale={0.7} />
          <BrassPlacardWithText
            text={`SIDE POT: $${sidePot.amount.toLocaleString()}`}
            position={[0, 0.3, 0]}
            fontSize={0.08}
            color="#C9A84C"
          />
        </group>
      ))}
    </group>
  )
}
```

### 7.5 Community Cards Display (3D)

Community cards are positioned in a row at the centre of the table:

```typescript
const COMMUNITY_CARD_POSITIONS: [number, number, number][] = [
  [-0.6, 0.01, -0.3],
  [-0.3, 0.01, -0.3],
  [0.0, 0.01, -0.3],
  [0.3, 0.01, -0.3],
  [0.6, 0.01, -0.3],
]

function CommunityCards() {
  const cards = useCommunityCards()
  const phase = usePhase<PokerPhase>()

  return (
    <group>
      {cards.map((card, i) => (
        <CommunityCard
          key={i}
          card={card}
          position={COMMUNITY_CARD_POSITIONS[i]}
          isNewlyRevealed={isNewlyRevealed(card, phase)}
        />
      ))}
    </group>
  )
}
```

Newly revealed cards play a flip animation (180-degree rotation on X-axis over 1s) and display a gold edge-glow emission pulse for 0.5s after flipping.

### 7.6 Dealer Speech Bubble (3D)

The dealer speech bubble (#37) is an art-deco panel floating near the dealer avatar. Text is rendered dynamically using `@react-three/drei`'s `Text` component:

```typescript
function DealerSpeechBubble() {
  const dealerMessage = useStateSyncSelector(s => s.dealerMessage)
  const [visible, setVisible] = useState(false)
  const prevMessageRef = useRef(dealerMessage)

  // Show bubble when dealerMessage changes, auto-dismiss after 6 seconds
  useEffect(() => {
    if (dealerMessage && dealerMessage !== prevMessageRef.current) {
      prevMessageRef.current = dealerMessage
      setVisible(true)
      const timer = setTimeout(() => setVisible(false), 6000)
      return () => clearTimeout(timer)
    }
  }, [dealerMessage])

  if (!visible || !dealerMessage) return null

  return (
    <group position={[0, 2.5, -2]}>
      {/* Art-deco panel mesh (#37) */}
      <SpeechBubbleMesh />
      {/* Dynamic text — ivory, serif font */}
      <Text
        position={[0, 0, 0.02]}
        fontSize={0.07}
        color="#F5F2ED"
        font="/fonts/playfair-display-regular.woff2"
        maxWidth={2.0}
        textAlign="center"
        anchorY="middle"
      >
        {dealerMessage}
      </Text>
    </group>
  )
}
```

### 7.7 Voice Command Hints (3D)

Contextual hints displayed at the bottom-left of the screen in muted text. These use `<Hud>` from `@react-three/drei` to render in screen-space, preventing drift when the camera moves:

```typescript
function VoiceCommandHints() {
  const phase = usePhase<PokerPhase>()
  const isAnyPlayerTurn = useStateSyncSelector(s => s.activePlayerIndex >= 0)
  const [visible, setVisible] = useState(false)

  // Show hints when a player's turn begins, fade after 3 seconds
  useEffect(() => {
    if (isBettingPhase(phase) && isAnyPlayerTurn) {
      setVisible(true)
      const timer = setTimeout(() => setVisible(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [phase, isAnyPlayerTurn])

  if (!visible) return null

  return (
    <Hud renderPriority={2}>
      <OrthographicCamera makeDefault position={[0, 0, 100]} />
      <Text
        position={[-5.5, -3.5, 0]}  // Bottom-left in Hud ortho space
        fontSize={0.25}
        color="#4A4845"
        font="/fonts/inter-regular.woff2"
        fillOpacity={0.6}
      >
        Say: Check, Fold, Raise [amount], Call, All In
      </Text>
    </Hud>
  )
}
```

### 7.8 Lobby View (HTML Overlay)

The lobby is the one phase that uses an HTML overlay rather than 3D HUD elements, because it requires complex interactive elements (QR code rendering, form inputs, scrollable panels) that are impractical to build in 3D:

```typescript
function LobbyView() {
  return (
    <div className="lobby-overlay">
      <div className="lobby-left">
        {/* QR code for phone connection */}
        <QRCodePanel />
        {/* Connected players list */}
        <PlayerList />
      </div>

      <div className="lobby-right">
        {/* Host controls */}
        <DealerSelectionPanel />
        <BotConfigPanel />
        <BlindLevelSelector />
        <StartGameButton />
      </div>
    </div>
  )
}
```

The QR code is rendered via `qrcode.react` at a size large enough to scan from 2-3 metres (minimum 300x300 CSS pixels on the 1080p canvas, per PRD requirement).

### 7.9 Session Summary Screen (HTML Overlay)

When the host ends the session, an HTML overlay displays the session summary. The `sessionSummary` field in VGF state is populated by the backend's `endSession` thunk. The backend's current `SessionStats` interface provides `handsPlayed`, `totalPotDealt`, `startedAt`, and `playerStats` — but the frontend also needs highlight data. The following `SessionSummary` interface must be added to the shared types (coordination item with backend-staff):

```typescript
// Required in @weekend-poker/shared-types — extends backend's SessionStats
interface SessionSummary {
  players: Array<{ id: string; name: string; finalStack: number; netChange: number }>
  handsPlayed: number
  duration: number                  // milliseconds
  totalPots: number
  largestPot: HandHighlight | null  // "Hand of the Night"
  biggestBluff: HandHighlight | null // "Bluff of the Night"
  worstBeat: HandHighlight | null    // "Bad Beat of the Night"
}

interface HandHighlight {
  handNumber: number
  players: string[]
  potSize: number
  description: string               // e.g. "Player went all in with J-7 off-suit and won a $12,000 pot"
}
```

Component:

```typescript
function SessionSummary() {
  const dispatchThunk = useDispatchThunk()
  const summaryData = useStateSyncSelector(s => s.sessionSummary)

  return (
    <div className="session-summary-overlay">
      <h1>Game Over</h1>

      {/* Leaderboard */}
      <Leaderboard players={summaryData.players} />

      {/* Highlights */}
      <HighlightReel
        handOfTheNight={summaryData.largestPot}
        bluffOfTheNight={summaryData.biggestBluff}
        badBeat={summaryData.worstBeat}
      />

      {/* Session stats */}
      <SessionStats
        handsPlayed={summaryData.handsPlayed}
        duration={summaryData.duration}
        totalPots={summaryData.totalPots}
      />

      <div className="summary-actions">
        <button onClick={() => dispatchThunk('restartSession')}>New Game</button>
        <button onClick={() => window.close()}>Exit</button>
      </div>
    </div>
  )
}
```

### 7.10 Typography

| Element | Font | Weight | Size (3D units / CSS) | Colour |
|---|---|---|---|---|
| Player name | Inter | Medium (500) | 0.08 / 28px | #F5F2ED (Ivory) |
| Chip count | Inter | Bold (700) | 0.10 / 32px | #C9A84C (Gold) |
| Pot amount | Inter | Bold (700) | 0.14 / 40px | #C9A84C (Gold) |
| Dealer message | Playfair Display | Regular (400) | 0.07 / 26px | #F5F2ED (Ivory) |
| Action label | Inter | Bold (700) | 0.06 / 24px | Per action colour |
| Voice hints | Inter | Regular (400) | 0.06 / 22px | #4A4845 at 60% opacity |
| Card names (dealer bubble) | Playfair Display | Bold (700) | 0.08 / 28px | #C9A84C (Gold) |

Fonts are loaded as WOFF2 files and passed to `@react-three/drei`'s `Text` component (which uses troika-three-text under the hood for SDF text rendering).

**Font preloading:** All WOFF2 font files are preloaded via `<link rel="preload" as="font" type="font/woff2" crossorigin>` tags in `index.html`. This ensures fonts are cached before the 3D scene initialises, preventing blank text frames on first render. The four font files (Inter Regular, Inter Medium, Inter Bold, Playfair Display Regular) total approximately 200 KB.

---

## 8. Performance Optimisation

### 8.1 Performance Budget

| Metric | Target | Hard Limit |
|---|---|---|
| Frame rate | 60fps stable | Never below 55fps |
| Total triangles | < 85,000 | 100,000 |
| Draw calls per frame | < 150 | 200 |
| Texture memory | < 128 MB | 160 MB |
| JavaScript heap | < 200 MB | 300 MB |
| Scene load time | < 5s | 8s (loading cinematic covers wait) |
| React re-renders per state update | < 10 component re-renders | 20 |
| GC pause (major) | < 10ms | 20ms |

### 8.2 Rendering Optimisations

**Instanced Rendering for Chips:**

Chip stacks use `THREE.InstancedMesh` to render hundreds of chips in a single draw call:

```typescript
function ChipPile({ amount, position, scale = 1 }: ChipPileProps) {
  const chipMeshRef = useRef<THREE.InstancedMesh>(null)
  const chipLayout = useMemo(() => calculateChipLayout(amount), [amount])

  useEffect(() => {
    if (!chipMeshRef.current) return
    const matrix = new THREE.Matrix4()

    chipLayout.forEach((chip, i) => {
      matrix.compose(
        new THREE.Vector3(chip.x, chip.y, chip.z),
        new THREE.Quaternion(),
        new THREE.Vector3(scale, scale, scale)
      )
      chipMeshRef.current!.setMatrixAt(i, matrix)
      chipMeshRef.current!.setColorAt(i, new THREE.Color(CHIP_COLOURS[chip.denomination]))
    })

    chipMeshRef.current.instanceMatrix.needsUpdate = true
    if (chipMeshRef.current.instanceColor) chipMeshRef.current.instanceColor.needsUpdate = true
  }, [chipLayout, scale])

  return (
    <instancedMesh
      ref={chipMeshRef}
      args={[chipGeometry, chipMaterial, chipLayout.length]}
      position={position}
    />
  )
}
```

**Static Geometry Merging:**

Environment objects that never move or animate (room shell, drinks cabinet, framed posters, etc.) are merged into a single `BufferGeometry` at load time using `THREE.BufferGeometryUtils.mergeGeometries`. This reduces draw calls from ~15 (one per static object) to 1.

```typescript
function StaticEnvironment() {
  const mergedGeometry = useMemo(() => {
    const geometries = [
      roomShellGeometry,
      drinksCabinetGeometry,
      framedPosterGeometries,
      decorativeRugGeometry,
      // ... all static, non-animated environment meshes
    ]
    return BufferGeometryUtils.mergeGeometries(geometries)
  }, [])

  return (
    <mesh geometry={mergedGeometry}>
      <meshStandardMaterial map={environmentAtlas} />
    </mesh>
  )
}
```

**Card Deck Visibility Culling:**

The `52-card_deck.glb` asset contains 52 cards x 3 mesh primitives = 156 meshes. To limit draw calls, only cards currently in play (max 17: 5 community + up to 8 hole cards + deck placeholder) are set to `visible: true`. Hidden cards contribute zero draw calls and zero triangles. Worst-case card draw calls: 17 x 3 = 51. The individual-texture approach means cards cannot be batched into a single draw call, but 51 draw calls is well within the 150-target budget alongside the rest of the scene (~40-60 other draw calls for environment, chips, UI).

**Single Shadow Map:**

Only the key light (pendant spotlight) casts shadows. Shadow map resolution: 1024x1024 with `PCFShadowMap` (not `PCFSoftShadowMap`, which is more expensive). All other lights have `castShadow: false`.

### 8.3 React Re-render Mitigation

**`useStateSyncSelector` over `useStateSync`:**

Never use `useStateSync()` (which re-renders on every state change). Always use `useStateSyncSelector(selector)` with a granular selector that returns only the data the component needs.

**Component memoisation:**

Heavy 3D components are wrapped in `React.memo` with custom comparison functions:

```typescript
const PlayerSeat = React.memo(function PlayerSeat({
  player,
  seatIndex,
  isActive,
}: PlayerSeatProps) {
  // ... render player seat 3D group
}, (prev, next) => {
  return (
    prev.player.stack === next.player.stack &&
    prev.player.status === next.player.status &&
    prev.player.bet === next.player.bet &&
    prev.player.lastAction === next.player.lastAction &&
    prev.isActive === next.isActive
  )
})
```

**Ref-based animation updates:**

Animation loops (`useFrame`) operate on refs, not state. This avoids React re-renders during continuous animations (camera drift, timer arc depletion, particle systems):

```typescript
// GOOD: ref-based, no re-renders
const meshRef = useRef<THREE.Mesh>(null)
useFrame((_, delta) => {
  if (meshRef.current) meshRef.current.rotation.y += delta * 0.1
})

// BAD: state-based, 60 re-renders per second
const [rotation, setRotation] = useState(0)
useFrame((_, delta) => setRotation(r => r + delta * 0.1))
```

### 8.4 Garbage Collection Mitigation

R3F and Three.js generate garbage through object creation (vectors, matrices, colours). In hot paths (`useFrame` callbacks), pre-allocate reusable objects:

```typescript
// Pre-allocated outside component (module-level)
const _tempVec3 = new THREE.Vector3()
const _tempQuat = new THREE.Quaternion()
const _tempMatrix = new THREE.Matrix4()
const _tempColor = new THREE.Color()

function CameraRig({ phase }: { phase: PokerPhase }) {
  useFrame(() => {
    // Use pre-allocated objects — no GC pressure
    _tempVec3.set(targetX, targetY, targetZ)
    camera.position.lerp(_tempVec3, lerpFactor)
  })
}
```

### 8.5 Asset Loading Performance

| Strategy | Detail |
|---|---|
| **KTX2 compression** | All textures compressed with Basis Universal; GPU decompresses on load |
| **GLB binary** | All models in binary glTF (smaller than .gltf + separate .bin) |
| **CDN delivery** | Assets served from CloudFront with aggressive caching headers |
| **Preloading** | `useGLTF.preload()` and `useKTX2.preload()` called at app start |
| **Suspense boundary** | Loading cinematic plays until all preloads resolve |
| **No dynamic loading** | All assets loaded upfront; no lazy loading during gameplay (avoids mid-game hitches) |

### 8.6 Video Texture Performance

The city bokeh window backplate and room ambience loop are `VideoTexture` instances applied to planes in the scene. These loop continuously:

```typescript
function CityBokehWindow() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const texture = useMemo(() => {
    const video = document.createElement('video')
    video.src = '/assets/videos/city-bokeh.mp4'
    video.loop = true
    video.muted = true
    video.playsInline = true
    videoRef.current = video
    // play() returns a Promise that may reject if autoplay is blocked;
    // the video is muted so autoplay should succeed, but we handle rejection gracefully
    video.play().catch(() => {
      // Retry on first user interaction (GameLift Streams environment should not block muted autoplay)
      document.addEventListener('click', () => video.play(), { once: true })
    })
    return new THREE.VideoTexture(video)
  }, [])

  useEffect(() => {
    return () => {
      videoRef.current?.pause()
      texture.dispose()
    }
  }, [texture])

  return (
    <mesh position={[0, 3, -4.5]}>
      <planeGeometry args={[2, 3]} />
      <meshBasicMaterial map={texture} />
    </mesh>
  )
}
```

Video textures are encoded at 4 Mbps (lower than full-screen cinematics) to reduce decode cost. The `VideoTexture` updates once per frame — Three.js handles this efficiently via `requestVideoFrameCallback` where available.

### 8.7 Performance Monitoring

The Display client includes a hidden performance overlay (toggled via a keyboard shortcut in dev mode) showing:

- FPS (rolling average over 60 frames)
- Draw calls per frame
- Triangle count
- Texture memory usage
- JS heap size

In production, key metrics are sampled every 10 seconds and reported to Datadog via VGF's built-in metrics integration:

```typescript
const reportPerformanceMetrics = () => {
  const info = renderer.info
  datadogRum.addTiming('frame_time', 1000 / currentFps)
  datadogRum.addAction('perf_sample', {
    fps: currentFps,
    drawCalls: info.render.calls,
    triangles: info.render.triangles,
    textureMemory: info.memory.textures,
    geometries: info.memory.geometries,
  })
}
```

### 8.8 Performance Degradation Strategy

If frame rate drops below 55fps for more than 5 consecutive seconds, the Display client progressively reduces visual fidelity:

| Level | Trigger | Action |
|---|---|---|
| 0 | >= 55fps | Full quality (default) |
| 1 | < 55fps for 5s | Disable ambient dust motes particles |
| 2 | < 50fps for 5s | Disable cigar smoke particles |
| 3 | < 45fps for 5s | Disable bloom post-processing |
| 4 | < 40fps for 5s | Reduce shadow map to 512px |

**Recovery (hysteresis):** When the frame rate sustains above the current level's threshold + 5fps for 10 consecutive seconds, the client restores one level of visual fidelity. For example, if degraded to Level 2 and the frame rate holds above 55fps for 10s, bloom is re-enabled (restoring to Level 1). The +5fps offset and longer recovery window prevent rapid toggling between levels.

Frame rate is unlikely to drop below 55fps on a `gen4n_high` cloud GPU given the scene's modest budget, but this safety net prevents degraded user experience in edge cases (e.g., unusually high particle counts during win celebrations).

---

## Appendix A: Seat Positions (World Coordinates)

The 4 player seats are positioned around the oval table:

```typescript
const SEAT_POSITIONS: [number, number, number][] = [
  [0, 0, 3.5],     // Seat 0: closest to camera (bottom)
  [-3.2, 0, 0],    // Seat 1: left
  [0, 0, -3.5],    // Seat 2: far side (top, near dealer)
  [3.2, 0, 0],     // Seat 3: right
]

const DEALER_POSITION: [number, number, number] = [0, 0, -4.5]  // Behind far edge of table
```

## Appendix B: Full-Screen Cinematic Integration

Full-screen cinematics (intro, win celebrations, loading transitions) play as HTML `<video>` elements layered over the R3F `<Canvas>`:

```typescript
function CinematicOverlay({ videoSrc, onComplete }: CinematicProps) {
  return (
    <div className="cinematic-overlay" style={{ position: 'absolute', inset: 0, zIndex: 10 }}>
      <video
        src={videoSrc}
        autoPlay
        onEnded={onComplete}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    </div>
  )
}
```

During cinematic playback, the R3F canvas is dimmed (`opacity: 0.1`) but not unmounted — this avoids the cost of re-initialising the WebGL context and reloading assets.

## Appendix C: Colour-Blind Accessibility Summary

Every colour-coded UI element in both the Display and Controller clients has a secondary non-colour signal:

| Element | Colour Signal | Secondary Signal |
|---|---|---|
| Action indicator (fold/check/call/raise/all-in) | Grey/Green/Blue/Gold/Red | Text label ("FOLD", "CHECK", etc.) |
| Chip denominations | White/Red/Black/Purple/Gold | Printed value on chip face ("$5", "$25", etc.) |
| Turn timer arc | Gold → Amber → Red | Numeric countdown text inside the arc |
| Voice command state | Blue/Green/Amber | Icon change (mic → tick → question mark) |
| Active player | Glowing border | "YOUR TURN" text indicator (controller) |

The palette is designed with distinct luminance values across protanopia, deuteranopia, and tritanopia. Red (#C23B22) and green (#2D8B4E) are never used as the sole differentiator on the same UI element.

# Weekend Casino — Frontend Technical Design Document

> **Version:** 1.0
> **Date:** 2026-02-27
> **Author:** Staff SWE 2 (Frontend / 3D Rendering)
> **Status:** Final
> **Authority:** Frontend implementation specification for Weekend Casino. Covers Display (TV) and Controller (Phone) clients for v1 (Hold'em, 5-Card Draw, Blackjack) and v2 (Roulette, Three Card Poker, Craps, Game Night, retention, persistence).
> **Canonical Decisions:** See `docs/CANONICAL-DECISIONS.md`
> **Supersedes:** `docs/TDD-frontend.md` (v1 Hold'em-only frontend TDD, retained for historical reference)
> **Depends on:** `CASINO-GAME-DESIGN.md`, `CASINO-PRD.md`, `CASINO-V2-NEW-GAMES.md`, `CASINO-V2-RETENTION.md`, `CASINO-VIDEO-ASSETS.md`, `CASINO-V2-ROADMAP-FINAL.md`

---

## Table of Contents

### I. Display Client Architecture
1. [Runtime Environment & Bootstrap](#1-runtime-environment--bootstrap)
2. [Multi-Scene Architecture](#2-multi-scene-architecture)
3. [Component Hierarchy — Display](#3-component-hierarchy--display)
4. [State Consumption Pattern](#4-state-consumption-pattern)

### II. Per-Game 3D Rendering
5. [Hold'em — "The Vault"](#5-holdem--the-vault)
6. [5-Card Draw — "The Lounge"](#6-5-card-draw--the-lounge)
7. [Blackjack Classic — "The Floor"](#7-blackjack-classic--the-floor)
8. [Blackjack Competitive — "The Arena"](#8-blackjack-competitive--the-arena)
9. [Roulette — "The Wheel Room"](#9-roulette--the-wheel-room)
10. [Three Card Poker — "The Express"](#10-three-card-poker--the-express)
11. [Craps — "The Rail"](#11-craps--the-rail)

### III. Video Playback System
12. [Video Architecture](#12-video-architecture)
13. [Video Asset Registry](#13-video-asset-registry)
14. [Preloading Strategy](#14-preloading-strategy)

### IV. Casino Lobby Display
15. [Lobby Scene & Game Selection](#15-lobby-scene--game-selection)

### V. Game Night Display
16. [Game Night UI System](#16-game-night-ui-system)

### VI. HUD System
17. [Persistent & Per-Game HUD](#17-persistent--per-game-hud)

### VII. Controller Client Architecture
18. [Controller Runtime & Hierarchy](#18-controller-runtime--hierarchy)
19. [Per-Game Controller Layouts](#19-per-game-controller-layouts)
20. [Cross-Game Controller Elements](#20-cross-game-controller-elements)
21. [Game Night Controller](#21-game-night-controller)
22. [Retention UI (v2.2)](#22-retention-ui-v22)
23. [Phone Companion Mode (v2.2)](#23-phone-companion-mode-v22)

### VIII. Animation System
24. [Theatre.js Integration](#24-theatrejs-integration)
25. [Animation Catalogue Per Game](#25-animation-catalogue-per-game)
26. [Animation State Machine](#26-animation-state-machine)

### IX. Audio System
27. [Audio Architecture](#27-audio-architecture)

### X. Performance
28. [Performance Budgets & Degradation](#28-performance-budgets--degradation)

### XI. Asset Pipeline
29. [3D Model Pipeline](#29-3d-model-pipeline)
30. [Card Deck Asset](#30-card-deck-asset)
31. [Video Asset Management](#31-video-asset-management)

### XII. Testing
32. [Testing Strategy](#32-testing-strategy)

---

# I. Display Client Architecture

## 1. Runtime Environment & Bootstrap

### 1.1 Overview

The Display client is a React 19 application that renders the casino experience via React Three Fiber and Three.js. It runs on an AWS GameLift Streams cloud GPU instance (`gen4n_high`) inside an Electron shell, packaged as a Windows executable. The TV receives only a WebRTC video/audio stream.

### 1.2 Runtime Environment

| Aspect | Detail |
|---|---|
| **Host** | GameLift Streams cloud GPU instance (Windows Server 2022) |
| **Shell** | Electron (Chromium-based) |
| **Bundler** | Vite (production build) |
| **Output** | electron-builder Windows .exe |
| **Resolution** | 1920x1080 at 60fps |
| **Audio** | System audio output captured by GameLift Streams, streamed via WebRTC |

### 1.3 Bootstrap Sequence

```
1. Electron main process launches
2. Vite-built React app loads in BrowserWindow (fullscreen, frameless)
3. VGFProvider initialises with SocketIOClientTransport:
     - url: VGF server endpoint (wss://casino-api.example.com)
     - clientType: ClientType.Display
     - userId: 'display-1'
4. Display creates VGF session via POST /session/create
5. Session ID returned -> QR code URL generated
6. Shared 3D assets preloaded (lobby scene, common models)
7. Loading cinematic (casino_intro) plays during asset load
8. Lobby phase renders: game selection carousel, QR code, dealer selection
9. Players scan QR -> controllers connect -> lobby updates
10. Host selects game and taps "Start Game"
11. Game-specific scene loads lazily (D-013) -> gameplay begins
```

---

## 2. Multi-Scene Architecture

### 2.1 Scene Management Strategy

The casino supports 7 distinct game scenes plus a lobby, each with its own visual identity. Rather than a single persistent scene (as in the v1 Hold'em-only TDD), the casino uses a **scene-swap architecture** where only one game scene is mounted at a time, sharing a common environment shell.

**Per D-013:** Scene assets are loaded lazily per game. When the host selects a game, only that game's scene graph, models, and textures are loaded. On game switch, the current scene is unmounted and its assets are eligible for garbage collection.

```typescript
type GameSceneId =
  | 'lobby'
  | 'holdem'
  | 'five_card_draw'
  | 'blackjack_classic'
  | 'blackjack_competitive'
  | 'roulette'
  | 'three_card_poker'
  | 'craps'
```

### 2.2 Scene Lifecycle

```
LOBBY scene (always loaded)
  |
  Host selects game
  |
  v
Transition video plays (full_screen, 4s) -- D-013: preload game assets during transition
  |
  v
Previous game scene unmounts (if any)
  |
  v
New game scene mounts inside <Suspense>
  |
  v
Game assets resolve -> gameplay begins
  |
  Host triggers "Change game" between rounds
  |
  v
Current game scene stays mounted during transition
  |
  v
Transition video plays -> unmount old, mount new
```

### 2.3 Scene Loading Component

```typescript
function SceneRouter() {
  const selectedGame = useStateSyncSelector(s => s.selectedGame)
  const phase = usePhase<CasinoPhase>()
  const isLobby = phase === 'LOBBY' || phase === 'GAME_SELECT' || phase === 'GN_SETUP'

  if (isLobby) return <LobbyScene />

  return (
    <Suspense fallback={<SceneLoadingFallback />}>
      {selectedGame === 'holdem' && <HoldemScene />}
      {selectedGame === 'five_card_draw' && <FiveCardDrawScene />}
      {selectedGame === 'blackjack_classic' && <BlackjackClassicScene />}
      {selectedGame === 'blackjack_competitive' && <BlackjackCompetitiveScene />}
      {selectedGame === 'roulette' && <RouletteScene />}
      {selectedGame === 'three_card_poker' && <ThreeCardPokerScene />}
      {selectedGame === 'craps' && <CrapsScene />}
    </Suspense>
  )
}
```

### 2.4 Per-Game Visual Identity Summary

| Game | Room Name | Mood | Colour Temp | Key Colours |
|------|-----------|------|-------------|-------------|
| Hold'em | The Vault | Casino Royale — tense, exclusive | 2700K amber | Racing Green, Mahogany, Antique Brass |
| 5-Card Draw | The Lounge | Vintage Vegas — timeless, authentic | 2400K deep amber | Burgundy, Cognac, Warm Grey |
| BJ Classic | The Floor | Ocean's Eleven — glamorous, energetic | 3500K bright | Crystal Blue, Champagne, Chrome Silver |
| BJ Competitive | The Arena | UFC weigh-in — gladiatorial, intense | 3200K spotlight | Near-Black, Deep Gold, Accent Red |
| Roulette | The Wheel Room | Monte Carlo — opulent, spectacle | 3200K warm gold | Deep Gold, Emerald, Ivory |
| TCP | The Express | Speed lounge — fast, sleek | 3000K balanced | Silver, Teal, Obsidian |
| Craps | The Rail | Vegas energy — communal, electric | 3400K bright warm | Lime Felt, Cherry Red, Neon Gold |

### 2.5 Shared vs Game-Specific Elements

**Shared (loaded once, reused):**
- Card deck GLB (`52-card_deck.glb`, 3.6 MB) — used by Hold'em, 5-Card Draw, BJ, TCP
- Chip stack instanced meshes (5 denominations)
- Dealer avatar rig skeleton (shared bone hierarchy)
- Common SFX audio buffers (chip_click, card_deal, card_flip)
- Post-processing pipeline (Bloom, Vignette)

**Game-specific (loaded on game select):**
- Room shell geometry and textures
- Lighting presets (colour temperature, shadow config)
- Unique props (roulette wheel, craps table, card shoe variants)
- Game-specific animations (Theatre.js sheets)
- Per-game video assets

---

## 3. Component Hierarchy — Display

```
<ElectronApp>
  <VGFProvider transport={displayTransport}>
    <AudioProvider>
      <ThemeProvider>
        <VideoOverlayManager />       // 3-layer video playback stack
        <Canvas
          gl={{ antialias: true, toneMapping: ACESFilmic, powerPreference: 'high-performance' }}
          shadows={{ type: PCFShadowMap }}
          dpr={1}
        >
          <Suspense fallback={null}>
            <SceneRouter />            // Switches game scenes
            <SharedPostProcessing />   // Bloom + Vignette
          </Suspense>
        </Canvas>
        <HUDOverlay />                 // 2D overlay: wallet, names, game indicator
        <GameNightOverlay />           // Leaderboard, champion ceremony (when active)
        <PhaseRouter />                // Non-3D phase views (lobby 2D elements)
      </ThemeProvider>
    </AudioProvider>
  </VGFProvider>
</ElectronApp>
```

---

## 4. State Consumption Pattern

The Display consumes VGF state via typed hooks. All state access uses `useStateSyncSelector` with granular selectors. Per **D-002**, `CasinoGameState` is a flat union with optional game-specific sub-objects.

```typescript
const {
  useStateSync,
  useStateSyncSelector,
  useDispatch,
  useDispatchThunk,
  usePhase,
} = getVGFHooks<typeof casinoRuleset, CasinoGameState, CasinoPhase>()

// Cross-game selectors
const useSelectedGame = () => useStateSyncSelector(s => s.selectedGame)
const useWallet = (playerId: string) => useStateSyncSelector(s => s.wallet[playerId])
const usePlayers = () => useStateSyncSelector(s => s.players)
const useVideoPlayback = () => useStateSyncSelector(s => s.videoPlayback)
const useBackgroundVideo = () => useStateSyncSelector(s => s.backgroundVideo)

// Game-specific selectors (safe access with optional chaining)
const useHoldemState = () => useStateSyncSelector(s => s.holdem)
const useBlackjackState = () => useStateSyncSelector(s => s.blackjack)
const useCrapsState = () => useStateSyncSelector(s => s.craps)
const useRouletteState = () => useStateSyncSelector(s => s.roulette)
const useTCPState = () => useStateSyncSelector(s => s.threeCardPoker)
const useGameNightState = () => useStateSyncSelector(s => s.gameNight)
```

---

# II. Per-Game 3D Rendering

## 5. Hold'em — "The Vault"

### 5.1 Scene Graph

```
HoldemScene (root)
├── Environment Group
│   ├── VaultRoomShell — dark wood panelling, art-deco moulding
│   ├── PendantLights x3 — emissive glass + SpotLight (2700K)
│   ├── WallSconces x4 — emissive glass
│   ├── Window — drapes + city bokeh VideoTexture backplate
│   ├── DrinksCabinet, WhiskyDecanter, WhiskyTumblers x2
│   ├── CigarInAshtray, FramedPosters x2, VelvetRope, DecorativeRug
│   └── Door
│
├── Table Group
│   ├── PokerTable — green felt, brass rail
│   ├── LeatherChairs x4 (instanced)
│   ├── DealerButton, SBMarker, BBMarker
│   ├── CardShoe, BurnPile
│   └── CommunityCardsArea (5 card positions)
│
├── Dealer Group
│   ├── DealerAvatar — upper body, rigged (Vincent/Maya/Remy/Jade)
│   └── DealerHands — rigged, animated dealing
│
├── Player Seats x4
│   ├── AvatarFrame, PlayerChipStack (instanced)
│   ├── HoleCardPositions (2 cards per player)
│   ├── BetPlacard, TurnTimerArc, VoiceIndicator
│   └── PlayerNameplate
│
├── Pot Group
│   ├── MainPotChipPile + Placard
│   └── SidePotChipPiles x2 + Placards
│
├── Particles
│   ├── CigarSmoke (10-20 sprites)
│   ├── AmbientDustMotes
│   └── WinCelebration (triggered, gold sparkle burst)
│
├── Lights
│   ├── KeyLight — SpotLight (2700K, penumbra 0.5, shadow 1024px)
│   ├── RimLightA, RimLightB — DirectionalLight (5500K, low)
│   └── AmbientFill — HemisphereLight + HDRI Environment
│
└── Camera (PerspectiveCamera, managed by HoldemCameraRig)
```

### 5.2 Camera Presets

| Preset | Position | LookAt | FOV | Trigger |
|--------|----------|--------|-----|---------|
| `overview` | [0, 8, 10] | [0, 0.5, 0] | 45 | Default, betting phases |
| `flopReveal` | [0, 4, 3] | [0, 0.3, -0.5] | 35 | DEALING_FLOP/TURN/RIVER |
| `showdownOrbit` | [0, 6, 8] | [0, 0.5, 0] | 40 | SHOWDOWN (180-degree orbit, 3s) |
| `winnerCelebration` | [0, 5, 6] | dynamic | 42 | POT_DISTRIBUTION |
| `dealerFocal` | [0, 3, 2] | [0, 1.5, -2] | 38 | DEALING_HOLE_CARDS |
| `idleDrift` | sinusoidal | [0, 0.5, 0] | 45 | Continuous during betting |

### 5.3 Key Animations

| Animation | Duration | Trigger | Description |
|-----------|----------|---------|-------------|
| Card deal | ~2s | DEALING_HOLE_CARDS | 8 cards (4 players x 2), 0.25s per card, arc trajectory |
| Card flip | ~1s/card | DEALING_FLOP/TURN/RIVER | 180-degree X rotation, gold edge-glow pulse |
| Chip push | ~0.5s | Bet placed | Slides along felt to pot, ease-out cubic |
| Pot collect | ~1.5s | POT_DISTRIBUTION | Chips slide to winner, slight scatter |
| Showdown orbit | ~3s | SHOWDOWN | Camera 180-degree orbit at height 6 |
| Win sparkle | ~2s | Winner determined | 30-50 gold particles, gravity -0.5 |
| Turn timer | 30s | Active turn | Circular arc depletion, gold -> amber -> red |

### 5.4 Triangle Budget

| Category | Triangles |
|----------|-----------|
| Room shell + props | ~8,000-14,000 |
| Poker table + chairs (instanced) | ~5,000-8,000 |
| Dealer avatar + hands | ~10,000-15,000 |
| Cards (max 17 visible x 60 tri) | ~1,020 |
| Chips, placards, markers, UI | ~2,100-3,400 |
| **Total** | **~26,000-41,400** |

Budget: 85,000 triangles. Comfortable headroom for instanced chips and particle sprites.

---

## 6. 5-Card Draw — "The Lounge"

### 6.1 Scene Graph

Same structure as Hold'em with the following differences:

```
FiveCardDrawScene (root)
├── Environment Group
│   ├── LoungeRoomShell — vintage bar, leather banquettes, dark walnut
│   ├── TiffanyLamps x3 (2400K, deep amber pools)
│   ├── VintageBarShelf, OldCardBox, BrassSprittoon, BoxingPrints
│   └── Atmosphere: warmer, more intimate than The Vault
│
├── Table Group
│   ├── PokerTable — same model, worn green felt variant texture
│   ├── NO CommunityCardsArea (hidden)
│   ├── DiscardPile (face-down stack, centre table)
│   └── DealerButton, SBMarker, BBMarker
│
├── Player Seats x4
│   └── HoleCardPositions (5 cards per player, fanned)
│
└── (rest identical to Hold'em)
```

### 6.2 Unique Animations

| Animation | Duration | Trigger | Description |
|-----------|----------|---------|-------------|
| 5-card deal | ~2-4s | DRAW_DEALING | 5 cards/player, 200ms per card, clockwise rounds |
| Discard slide | ~300ms/card | DRAW_DRAW_PHASE | Selected cards slide up, flip down, fly to discard pile |
| Replacement deal | ~300ms/card | DRAW_DRAW_PHASE | New cards from deck to seat, land face-down then flip |
| Draw camera pan | ~1s | Active drawer | Camera pans to current player during draw phase |

### 6.3 Key Differences from Hold'em Scene

- No community cards area
- 5 card positions per seat (instead of 2)
- Draw phase animations unique to this game
- Discard pile visual in table centre
- Tiffany lamp lighting (2400K vs 2700K)

---

## 7. Blackjack Classic — "The Floor"

### 7.1 Scene Graph

```
BlackjackClassicScene (root)
├── Environment Group
│   ├── FloorRoomShell — open casino floor, grand ceiling
│   ├── CrystalChandeliers x2 (3500K, prismatic refractions)
│   ├── NeonSignage (vintage typography)
│   ├── MirroredPanels, ChampagneFlutes (background dressing)
│   └── BokehBackground (distant casino floor, VideoTexture)
│
├── Table Group
│   ├── BlackjackTable — semicircular, green felt, mahogany rail
│   ├── ChromeCardShoe — dealer's left
│   ├── ChipTray — dealer position
│   ├── DiscardTray — dealer's right
│   └── BettingCircles x4 — brass inlay on felt (player positions)
│
├── Dealer Group
│   ├── DealerAvatar — BJ-specific: Ace Malone / Scarlett Vega / Chip Dubois (D-010)
│   └── DealerHands — dealing from shoe animation
│
├── Player Seats x4 (semicircular arc)
│   ├── PlayerCardFan (up to 8 cards for split hands)
│   ├── SplitHandPositions (up to 4 hands with connector lines)
│   ├── BetChipStack on BettingCircle
│   ├── SideBetIndicators (Perfect Pairs, 21+3 markers)
│   └── PlayerNameplate, HandValueDisplay
│
├── Dealer Card Area
│   ├── DealerUpcard (face-up, prominent)
│   ├── DealerHoleCard (face-down until reveal)
│   └── DealerHitCards (additional dealt cards)
│
├── Hand Result Indicators
│   ├── BustOverlay (red X, "BUST" text)
│   ├── BlackjackGlow (gold glow, "BLACKJACK!" text + sparkle)
│   └── PushIndicator (yellow, "PUSH" text)
│
└── Lights
    ├── ChandelierLights x2 (3500K, high intensity, prismatic)
    ├── TableSpot (warm, focused on felt)
    └── AmbientFill (brighter than poker scenes)
```

### 7.2 Camera Presets

| Preset | Position | FOV | Trigger |
|--------|----------|-----|---------|
| `bjOverview` | [0, 7, 9] | 50 | Default, betting phase |
| `dealFocus` | [0, 4, 4] | 40 | BJ_DEAL_INITIAL |
| `playerFocus` | dynamic per seat | 35 | BJ_PLAYER_TURNS (follows active player) |
| `dealerReveal` | [0, 3, 2] | 38 | BJ_DEALER_TURN |
| `settlementPan` | sweep L-to-R | 45 | BJ_SETTLEMENT |

### 7.3 Split Hand Visualisation

When a player splits:
1. Original betting circle "divides" — animation splits the circle into 2, with a connector line
2. Cards separate with a 0.3s slide animation
3. New card dealt to first split hand
4. Up to 4 hands: circles fan outward with connector lines to the original position
5. Active split hand gets a gold highlight border; inactive hands dim

### 7.4 Key Animations

| Animation | Duration | Trigger |
|-----------|----------|---------|
| Shoe deal | ~0.4s/card | BJ_DEAL_INITIAL | Cards slide from chrome shoe |
| Card flip (dealer reveal) | ~1s | BJ_DEALER_TURN | Dramatic hole card flip |
| Bust slam | ~0.5s | Player bust | Red X slams onto cards |
| Blackjack burst | ~1.5s | Natural BJ | Gold burst, sparkle, "BLACKJACK!" |
| Split divide | ~0.5s | Player splits | Circle divides, cards separate |
| Settlement sweep | ~3s | BJ_SETTLEMENT | Camera sweeps across all positions showing results |

---

## 8. Blackjack Competitive — "The Arena"

### 8.1 Scene Graph

Same BlackjackTable model, dramatically different environment:

```
BlackjackCompetitiveScene (root)
├── Environment Group
│   ├── ArenaShell — near-total darkness surrounding the table
│   ├── OverheadSpotlight (3200K, tight cone, single shadow)
│   ├── RimLights (edge highlights on players, dramatic)
│   └── NO background dressing (minimal, gladiatorial)
│
├── Table Group
│   ├── BlackjackTable — dark felt variant, brushed steel rail
│   ├── NO CardShoe (cards dealt directly by dealer)
│   └── BettingCircles x4 (simpler, no side bet markers)
│
├── Player Seats x4
│   ├── PlayerCardFan (max 6 cards, no splits per D-007)
│   ├── AntePlacard (fixed ante display)
│   └── HandValueDisplay
│
├── Showdown Area
│   └── ComparisonOverlay — split-screen reveal, hands side by side
│
└── Lights
    ├── ArenaSpotlight (single, harsh, 3200K)
    ├── PlayerRimLights x4 (accent colour per player)
    └── Minimal ambient (very low)
```

### 8.2 Key Differences from Classic

- No splits (D-007), no side bets, no insurance, no surrender
- Sequential turns (D-007, v1)
- Showdown reveal: all hands revealed simultaneously, comparison animation
- Darker, more intense atmosphere
- No card shoe — dealer deals directly
- Pot display instead of per-player payout indicators

---

## 9. Roulette — "The Wheel Room"

### 9.1 Scene Graph

```
RouletteScene (root)
├── Environment Group
│   ├── WheelRoomShell — opulent, Monte Carlo aesthetic
│   ├── GrandChandelier (3200K, warm gold)
│   ├── OrnateWallPanels, GoldTrimMoulding
│   └── BacklitBottleDisplay
│
├── Roulette Wheel Group (CENTREPIECE)
│   ├── WheelBase — wooden bowl, static
│   ├── WheelRotor — 37 numbered pockets (0-36), spins on Y axis
│   ├── Ball — small sphere, physics-driven trajectory
│   ├── WheelFrets — pocket dividers
│   └── WheelDecorator — brass centre, number ring
│
├── Betting Board
│   ├── FeltBoard — European layout (0-36 grid + outside bets)
│   ├── PlayerChipPositions — colour-coded per player
│   └── WinningNumberHighlight — illuminated pocket/number
│
├── History Display
│   └── ResultsBoard — last 10-15 results, number + colour
│
├── Dealer Group
│   ├── CroupierAvatar — standing behind wheel (shared BJ dealer chars, D-010 note: reuse BJ dealers)
│   └── CroupierHands — ball launch, chip sweep animations
│
├── Player Rail (4 positions, linear along board edge)
│   ├── PlayerNameplate, ChipRack
│   └── ActiveBetsIndicator (mini icons)
│
└── Lights
    ├── WheelSpotlight — focused on wheel, warm gold
    ├── BoardLights — even illumination on betting felt
    └── AmbientGlow (warm, opulent)
```

### 9.2 Roulette Wheel — 3D Specification

The wheel is the visual centrepiece and MUST look spectacular.

**Geometry:**
- WheelBase: ~2,000 triangles (wooden bowl shape)
- WheelRotor: ~4,000 triangles (37 pockets, number engravings, frets)
- Ball: ~200 triangles (smooth sphere)
- Total wheel group: ~6,200 triangles

**Materials:**
- Bowl: MeshStandardMaterial, dark walnut, clearcoat
- Rotor: MeshStandardMaterial, deep mahogany + brass inlays
- Pocket colours: Red (#C23B22), Black (#1A1A1D), Green (#1B4D2E)
- Numbers: emissive text or texture atlas on pocket rims
- Ball: MeshPhysicalMaterial, ivory white, high metalness for gleam

**Spin Animation (6-second target, per ROULETTE_SPIN_ANIMATION_TARGET_MS):**

```typescript
interface RouletteSpinAnimation {
  // Phase 1: Launch (0-0.5s)
  ballLaunch: {
    startPosition: 'outer_rim'
    initialAngularVelocity: 12  // radians/sec
    direction: 'counter_clockwise'
  }
  // Phase 2: Ball orbit (0.5-3.5s)
  ballOrbit: {
    deceleration: 'exponential'  // angular velocity decays
    dropRadius: 'progressive'    // ball spirals inward
    bounceCount: 3-5             // random bounces off frets
  }
  // Phase 3: Ball settle (3.5-5.5s)
  ballSettle: {
    finalBounces: 2-3            // smaller bounces
    pocketEntry: 'physics_driven'
    deceleration: 'final_exponential'
  }
  // Phase 4: Result (5.5-6.0s)
  resultReveal: {
    cameraZoomToPocket: true
    pocketGlow: true             // winning pocket illuminates
    numberFlash: true            // large number overlay
    duration: 500                // ms
  }
}
```

**Physics recommendation:** React Three Fiber with **Rapier** physics engine (`@react-three/rapier`) for ball dynamics. Rapier provides deterministic physics at low CPU cost. The ball trajectory is cosmetic only — the winning number is determined server-side and dispatched via `setRouletteWinningNumber`. The animation must land in the correct pocket.

**Completion signal:** Per D-011 and the roadmap Decision 8, the Display dispatches `completeRouletteSpin` when the ball settles. Server hard timeout at 8 seconds (ROULETTE_SPIN_HARD_TIMEOUT_MS).

### 9.3 Betting Board Display

The TV shows the European betting board with:
- Player chips colour-coded (P1=blue, P2=red, P3=green, P4=gold)
- Multiple chips stack on same number with slight offset
- Winning number illuminates across the board (straight-up, splits, streets, corners all highlight)
- Losing chips fade out; winning chips pulse with payout amount

### 9.4 History Display

A results board (right side of screen) shows the last 15 spin results:
- Number + colour (red/black/green dot)
- Hot numbers (appeared 3+ times) highlighted
- Cold numbers (absent 20+ spins) dimmed

---

## 10. Three Card Poker — "The Express"

### 10.1 Scene Graph

TCP shares the Blackjack dealer characters and a simplified table layout. Per D-015, ships in v2.0.

```
ThreeCardPokerScene (root)
├── Environment Group
│   ├── ExpressRoomShell — sleek lounge, muted tones
│   ├── LinearLightStrips (3000K, modern aesthetic)
│   └── MinimalProps — clean, fast-paced feeling
│
├── Table Group
│   ├── TCPTable — compact semicircular, teal felt
│   ├── AnteBettingCircles x4
│   ├── PairPlusBettingCircles x4 (adjacent to ante)
│   └── DealerCardArea (3 cards)
│
├── Dealer Group
│   ├── DealerAvatar — reuses BJ dealer characters
│   └── DealerHands — 3-card deal animation
│
├── Player Seats x4
│   ├── PlayerCards (3 cards, face-down then face-up)
│   ├── AntePlacard, PairPlusPlacard
│   └── DecisionIndicator ("PLAY" / "FOLD" / "WAITING")
│
└── Lights (same as BJ Classic but slightly cooler)
```

### 10.2 Key Animations

| Animation | Duration | Trigger |
|-----------|----------|---------|
| 3-card deal | ~1.5s | TCP_DEAL | 3 cards per player + 3 for dealer, 200ms/card |
| Card reveal (player) | ~0.5s | Player views cards | 3 cards flip sequentially |
| Dealer qualifying reveal | ~1s | TCP_DEALER_REVEAL | Dealer's 3 cards flip with dramatic pause |
| Play/Fold indicator | ~0.3s | Player decides | "PLAY" stamp (green) or "FOLD" stamp (red) |

### 10.3 Missing Tutorial Note

TCP is missing a dedicated tutorial in the source documents. **Recommendation:** implement a 3-step tutorial (~20 seconds) mirroring the Roulette tutorial pattern:

| Step | Content | Duration |
|------|---------|----------|
| 1 | "Welcome to Three Card Poker! You get 3 cards. Beat the dealer to win." | 5s |
| 2 | "Place your ANTE to play. Tap PAIR PLUS for a bonus bet on your hand strength." | 8s |
| 3 | "See your cards, then choose PLAY or FOLD. Simple as that!" | 7s |

---

## 11. Craps — "The Rail"

### 11.1 Scene Graph

Per D-016, Craps ships in v2.1. The most complex Display scene.

```
CrapsScene (root)
├── Environment Group
│   ├── CrapsRoomShell — energetic, bright, Vegas floor energy
│   ├── OverheadLightBars (3400K, broad coverage)
│   ├── NeonAccents (celebration triggers)
│   └── CrowdSilhouettes (background, atmospheric)
│
├── Craps Table Group (CENTREPIECE, top-down angled view)
│   ├── CrapsTableFelt — full layout:
│   │   ├── PassLineArea (curved along edge)
│   │   ├── DontPassBar
│   │   ├── ComeArea
│   │   ├── DontComeArea
│   │   ├── PlaceNumbers (4, 5, SIX, 8, NINE, 10)
│   │   ├── FieldBetArea (2,3,4,9,10,11,12)
│   │   └── OddsBetPositions
│   ├── TableRail — padded bumper
│   └── Backboard — dice bouncing wall
│
├── Puck Group
│   ├── OnOffPuck — 3D disc, ON(white)/OFF(black) with flip animation
│   └── PuckPositionMarker — glows at current point number
│
├── Dice Group (THE MONEY SHOT)
│   ├── Die1 — 3D cube, physics-driven
│   ├── Die2 — 3D cube, physics-driven
│   └── DiceResultDisplay — floating number overlay
│
├── Player Rail (4 positions along bottom)
│   ├── PlayerNameplate, ChipRack
│   ├── ActiveBetIndicators (mini icons per bet type)
│   └── ShooterIndicator (gold dice icon)
│
├── Stickman/Dealer Group
│   ├── StickmanAvatar — "Lucky" Luciano / "Diamond" Dolores
│   └── StickmanHands — dice push animation
│
├── Player Chips on Table
│   └── ColourCodedChipStacks — P1=blue, P2=red, P3=green, P4=gold
│       (physically placed on bet areas)
│
└── Lights
    ├── BroadOverheads x3 (3400K, wide coverage)
    ├── TableEdgeLighting (warm accent)
    └── DiceSpotlight (follows dice during roll)
```

### 11.2 Dice Roll Animation — THE SPECTACULAR MOMENT

This is the single most important animation in the craps experience. Per the game design doc, it must feel visceral, physical, and electric.

**Physics recommendation:** Rapier physics engine (`@react-three/rapier`) for dice simulation. Die geometry: 6-sided cube with rounded edges, ~300 triangles each. Physics material: high restitution (0.6) for bouncy impact, moderate friction (0.4).

**Roll Sequence:**

| Phase | Duration | Description |
|-------|----------|-------------|
| Wind-up | 500ms | Camera pushes in, ambient dips, shooter chips glow |
| Throw | 300ms | Dice launch with arc, physics calculates trajectory |
| Bounce & tumble | 800-1200ms | Hit backboard, bounce back, tumble on felt. REAL physics. |
| Settle | 400ms | Dice come to rest, camera zooms to result |
| Result flash | 300ms | Dice faces illuminate, total appears as large text |
| Crowd reaction | 500ms | Chips fly to winners, losers' chips fade, nameplates flash green/red |

**Total: ~2.5-3.5 seconds**

**Predetermined outcome:** The server determines the dice values. The physics simulation is cosmetic — the dice MUST land on the server-determined values. Implementation: calculate the final resting orientation for the target values, then run physics backward or constrain the final state.

**Dramatic outcomes:** On seven-out or point-hit, the camera lingers with a slow-motion effect on the dice for an extra 500ms.

### 11.3 Puck Animation

When point is established:
1. Puck flips from OFF (black) to ON (white) — 3D rotation, 0.5s
2. Puck slides to the point number position on the table — 0.3s
3. Point number on puck glows

### 11.4 Bet Placement Visualisation

When a player places a bet:
1. Chip in player's colour flies from rail to bet area — 0.4s, arc trajectory
2. Chip "clinks" on felt — satisfying SFX
3. Bet amount as floating text above chip
4. Multiple players' chips stack with slight offset

---

# III. Video Playback System

## 12. Video Architecture

### 12.1 Three-Layer Rendering Stack

Per the video system design, the Display uses a 3-layer compositing stack:

```
Layer 3 (top):    Foreground Video Overlay    // overlay, full_screen, transition modes
Layer 2 (middle): React Three Fiber Canvas    // 3D game scene
Layer 1 (bottom): Background Video            // background ambient loops
```

Implementation:

```typescript
function DisplayRoot() {
  return (
    <div className="display-stack">
      {/* Layer 1: Background video (behind canvas) */}
      <BackgroundVideoPlayer />

      {/* Layer 2: 3D Canvas */}
      <Canvas className="game-canvas" style={{ position: 'absolute' }}>
        <SceneRouter />
      </Canvas>

      {/* Layer 3: Foreground video overlay (above canvas) */}
      <ForegroundVideoPlayer />

      {/* Layer 4: 2D HUD (above everything) */}
      <HUDOverlay />
    </div>
  )
}
```

### 12.2 Playback Modes

**Foreground video modes** (3 modes via `VideoPlayback.mode` — D-011):

| Mode | Behaviour | Canvas Visibility | Gameplay Paused |
|------|-----------|-------------------|-----------------|
| `full_screen` | Video covers 100% viewport | Hidden | Yes |
| `overlay` | Video composited over 3D scene | Visible | No |
| `transition` | Full-screen bridge between scenes | Hidden | Yes |

**Background video** (separate `BackgroundVideo` interface — NOT a `VideoPlayback.mode`, per V-MAJOR-3 fix):

| Interface | Behaviour | Canvas Visibility | Gameplay Paused |
|-----------|-----------|-------------------|-----------------|
| `BackgroundVideo` | Video behind 3D scene as ambient loop | Visible (above video) | No |

### 12.3 Priority Queue and Preemption

Per V-MAJOR-1, videos have priority levels:

```typescript
type VideoPriority = 'low' | 'medium' | 'high' | 'critical'

interface VideoRequest {
  assetKey: string
  mode: VideoPlaybackMode
  priority: VideoPriority
  durationMs: number
  blocksPhase: boolean
  skippable: boolean
  skipDelayMs: number  // delay before skip is available
}
```

**Preemption rules:**
- `critical` preempts everything
- `high` preempts `low` and `medium`
- `medium` preempts `low`
- Same priority: queue (FIFO)
- Per-round cap for overlay videos (max 3 per BJ round, unlimited for celebrations)

### 12.4 Graceful Degradation

Per D-013, if a video asset is not yet loaded when triggered:

1. Check if asset is in cache -> play immediately
2. If not cached, check if currently downloading -> wait up to 500ms
3. If not downloading, skip the video entirely
4. For full_screen/transition: show a CSS opacity ramp (0 -> 1 over 300ms) with a solid colour matching the game's palette, hold for the video duration, then fade back
5. For overlay: skip silently, no visual disruption
6. For background: play previous background or show static ambient colour

---

## 13. Video Asset Registry

### 13.1 v1 Assets (51 total, per D-012)

| Category | Count | Examples |
|----------|-------|---------|
| Shared | 7 | casino_intro, casino_outro, 4x game_select_*, win_big_generic |
| Hold'em | 9 | holdem_ambient, holdem_intro, holdem_big_pot, etc. |
| 5-Card Draw | 10 | draw_ambient, draw_intro, draw_stand_pat, etc. |
| BJ Classic | 16 | bj_ambient, bj_intro, bj_blackjack_natural, bj_bust, etc. |
| BJ Competitive | 9 | bjc_ambient, bjc_intro, bjc_showdown, etc. |

### 13.2 v2 Assets (32 total)

| Category | Count | Ship Version |
|----------|-------|-------------|
| Roulette | 11 | v2.0 |
| TCP | 9 | v2.0 |
| Craps | 12 | v2.1 |

**v2.0 cumulative total:** 51 + 21 (11 Roulette + 9 TCP + 1 game-select intro) = **72**
**v2.1 cumulative total:** 72 + 12 (Craps) = **84**

---

## 14. Preloading Strategy

Per **D-013**: per-game lazy loading with priority queue, max 3 concurrent downloads.

### 14.1 Loading Rules

```typescript
interface VideoPreloadConfig {
  maxConcurrent: 3
  strategy: 'per_game_lazy'
  evictionPolicy: 'lru_per_game'  // evict previous game's assets first
}
```

### 14.2 Load Sequence Per Game Switch

1. On game select, begin preloading the selected game's **critical** videos (intro, ambient)
2. During transition video playback (~4s), preload **high** priority videos
3. After scene loads, continue preloading **medium** and **low** in background
4. Previous game's videos are evicted from cache (LRU) as memory pressure requires
5. Shared assets (casino_intro, casino_outro, game_select_*) are never evicted

### 14.3 GN_LEADERBOARD as Preload Buffer

During Game Night, the leaderboard display phase (15-20 seconds) is used as a preloading window. Per the roadmap (A3):

1. Evict current game's video assets (except shared)
2. Begin preloading next game's critical and high-priority assets
3. The 15-20 second leaderboard provides ample time for 3-5 video downloads

---

# IV. Casino Lobby Display

## 15. Lobby Scene & Game Selection

### 15.1 Lobby Scene Graph

```
LobbyScene (root)
├── LobbyEnvironment
│   ├── GrandLobbyShell — open atrium, chandeliers, marble
│   ├── MainChandelier (3000K, balanced)
│   └── VelvetRopes, GoldStanchions
│
├── GameSelectionCarousel
│   ├── GameCard_Holdem — animated preview thumbnail
│   ├── GameCard_FiveCardDraw
│   ├── GameCard_BlackjackClassic
│   ├── GameCard_BlackjackCompetitive
│   ├── GameCard_Roulette (v2.0)
│   ├── GameCard_TCP (v2.0)
│   └── GameCard_Craps (v2.1)
│
├── QRCodeDisplay (2D overlay, top-right)
├── PlayerList (2D overlay, bottom)
└── GameNightButton (v2.1, prominent above game cards)
```

### 15.2 Game Card Design

Each game card in the carousel:

| Element | Specification |
|---------|--------------|
| Thumbnail | 400x300 animated preview (3D mini-scene or looping video) |
| Title | Game name, large bold text |
| Player count | "1-4 players" / "2-4 players" |
| Description | 1-line hook (e.g., "The classic. Bet, bluff, win.") |
| Selection state | Unselected: normal. Selected: gold border, 1.2x scale, glow |

### 15.3 Transition Animations

| Transition | Duration | Description |
|------------|----------|-------------|
| Lobby -> Game | 4s | Game-select transition video (full_screen) |
| Game -> Lobby | 1.5s | Quick fade-to-lobby (no video) |
| Game -> Game | 4s | New game-select transition video |

---

# V. Game Night Display

## 16. Game Night UI System

### 16.1 Leaderboard Overlay (Between Games)

Per D-014, Game Night uses rank-based scoring. The leaderboard displays for 15-20 seconds between games.

```
+----------------------------------------------------------+
|            GAME NIGHT LEADERBOARD                         |
|                                                            |
|  After: Blackjack (Game 2 of 4)                           |
|                                                            |
|  1st  ████████████████  Player 1    245 pts    [crown]    |
|  2nd  ██████████████    Player 3    210 pts               |
|  3rd  ████████████      Player 2    185 pts               |
|  4th  ██████████        Player 4    155 pts               |
|                                                            |
|  Last game MVP: Player 3 (+75 pts from Blackjack)          |
|  Hot streak: Player 1 (1st in last 2 games)                |
|                                                            |
|  Next up: CRAPS       [animated game preview]              |
|  "Player 3 is closing in!" — Dealer                        |
+----------------------------------------------------------+
```

**Score animations:**
- Score bars animate from previous totals to new totals (1s ease-out)
- Rank changes: player rows slide up/down to new positions (0.5s)
- Bonus points: "+20 BONUS" pop-up next to player name (gold text, fade out)

### 16.2 Champion Ceremony

Triggered at the end of the final game in a Game Night:

| Step | Duration | Visual |
|------|----------|--------|
| Dramatic pause | 2s | Screen dims, drumroll audio |
| 4th place reveal | 2s | Slide-in with total points and highlight stat |
| 3rd place reveal | 2s | Same pattern |
| 2nd place reveal | 2s | Same pattern |
| Champion reveal | 3s | Large name + avatar, confetti particles, crown animation, victory jingle |
| Stats card | 5s | Branded results card (date, rankings, highlights, session duration) |

**Confetti particle system:**
- 200-300 particles
- Colours: gold, silver, game-theme accent
- Gravity: -2.0
- Lifetime: 4s
- Emitter: top of screen, wide spread

### 16.3 Progressive Jackpot Ticker (v2.2)

Always visible during gameplay (when jackpot is active):

```
Top-right corner:
+----------------------------+
|  🎰 JACKPOT: $1,247,350   |
|  Mini: $12,450             |
+----------------------------+
```

- Gold text, ticker-tape number animation on increment
- 1% of all bets contribute (server-side)
- Updates in real-time via state sync
- Pulsing glow when jackpot exceeds threshold

---

# VI. HUD System

## 17. Persistent & Per-Game HUD

### 17.1 Persistent HUD Elements (All Games)

```
+----------------------------------------------------------+
| [Game Icon] BLACKJACK CLASSIC    $10,000 [wallet icon]   |  <- Top bar
|                                                            |
|              [3D GAME SCENE]                               |
|                                                            |
| P1: Alice $3,200  P2: Bob $5,100  P3: Carol $1,700       |  <- Bottom bar
|                    [dealer name]                            |
+----------------------------------------------------------+
```

| Element | Position | Content |
|---------|----------|---------|
| Game indicator | Top-left | Game icon + name |
| Wallet balance | Top-right | Current wallet (updates on sync points) |
| Player names | Bottom bar | Names + wallet balances for all players |
| Dealer name | Bottom-centre | Active dealer character name |
| Connection status | Top-right (icon) | Green dot = all connected |

### 17.2 Per-Game HUD Variations

| Game | Additional HUD |
|------|---------------|
| Hold'em | Pot amount, blinds level, hand number |
| 5-Card Draw | Pot amount, blinds level, "Draw Phase" indicator |
| BJ Classic | Shoe cards remaining (approximate), hand count |
| BJ Competitive | Pot total, round number |
| Roulette | Last 5 results (mini history), timer bar |
| TCP | Ante amount, round number |
| Craps | Point puck (ON/OFF + number), shooter name, roll count |

### 17.3 Game Night Score HUD

When Game Night is active, an additional overlay:

```
Top-centre:
+--------------------------------+
|  GAME NIGHT  |  Game 2 of 4   |
|  1st: Alice 145  2nd: Bob 130 |
+--------------------------------+
```

Compact, semi-transparent, does not obstruct gameplay.

---

# VII. Controller Client Architecture

## 18. Controller Runtime & Hierarchy

### 18.1 Technology Stack

| Technology | Role |
|---|---|
| React 19 | UI framework |
| VGF Client SDK (`@volley/vgf/client`) | State sync, dispatch, hooks |
| `@volley/recognition-client-sdk` | Push-to-talk voice + STT |
| Vite | Bundler |
| CSS Modules / Tailwind CSS | Mobile-first styling |

### 18.2 Performance Requirements

| Metric | Target |
|--------|--------|
| Bundle size (gzipped) | < 200 KB |
| Touch target minimum | 48x48 px |
| Orientation | Portrait-locked |
| First meaningful paint | < 2s on 4G |
| Input latency (touch to dispatch) | < 100ms |

### 18.3 Component Hierarchy

```
<VGFProvider transport={controllerTransport}>
  <RecognitionProvider>
    <CasinoControllerRouter />
  </RecognitionProvider>
</VGFProvider>
```

```typescript
function CasinoControllerRouter() {
  const phase = usePhase<CasinoPhase>()
  const selectedGame = useStateSyncSelector(s => s.selectedGame)
  const videoPlayback = useStateSyncSelector(s => s.videoPlayback)

  // Video overlay state: dim + "Watch the screen" during full-screen videos
  if (videoPlayback?.mode === 'full_screen') {
    return <VideoOverlayState />
  }

  // Lobby/setup phases
  if (phase === 'LOBBY') return <ControllerLobby />
  if (phase === 'GAME_SELECT' || phase === 'GN_SETUP') return <GameSelectController />

  // Game Night inter-game phases
  if (phase === 'GN_LEADERBOARD') return <GameNightLeaderboardController />
  if (phase === 'GN_CHAMPION') return <GameNightChampionController />

  // Per-game controllers
  switch (selectedGame) {
    case 'holdem': return <HoldemController phase={phase} />
    case 'five_card_draw': return <FiveCardDrawController phase={phase} />
    case 'blackjack_classic': return <BlackjackClassicController phase={phase} />
    case 'blackjack_competitive': return <BlackjackCompetitiveController phase={phase} />
    case 'roulette': return <RouletteController phase={phase} />
    case 'three_card_poker': return <TCPController phase={phase} />
    case 'craps': return <CrapsController phase={phase} />
    default: return <WaitingScreen />
  }
}
```

---

## 19. Per-Game Controller Layouts

### 19.1 Hold'em Controller

```
+----------------------------------+
|  Blinds: 10/20  |  Pot: $850    |  <- StatusBar
|  Stack: $2,450  |  YOUR TURN    |
+----------------------------------+
|                                  |
|      +------+  +------+         |  <- HoleCards (2 cards)
|      | A    |  | K    |         |
|      |  ♥   |  |  ♦   |         |
|      +------+  +------+         |
|                                  |
+----------------------------------+
|  [FOLD]          [CHECK/CALL]   |  <- BettingControls
|                   Call $200     |
|  Raise: $400                    |
|  [-----|--------]               |  <- RaiseSlider
|  [2x] [3x] [½ pot] [Pot]      |  <- PresetButtons
|  [ALL IN $2,450]                |
+----------------------------------+
|  [ HOLD TO SPEAK ]              |  <- PushToTalk
|  "Raise to four hundred"       |  <- VoiceTranscript
+----------------------------------+
```

**Components:** `StatusBar`, `HoleCards` (2 cards), `BettingControls` (fold/check/call/raise/all-in), `RaiseSlider` with presets, `PushToTalk`, `VoiceTranscript`

### 19.2 5-Card Draw Controller

```
+----------------------------------+
|  Blinds: 10/20  |  Pot: $850    |
|  Stack: $2,450  |  DRAW PHASE   |
+----------------------------------+
|                                  |
| [Ah] [Kd] [7s] [3c] [2h]      |  <- 5 tappable cards
|       ^         ^               |  <- Selected (shifted up)
|  Discarding: 2 of 3             |
+----------------------------------+
|  -- Betting Phase --             |
|  [FOLD] [CHECK/CALL] [RAISE]   |
|  [ALL IN $2,450]                |
|                                  |
|  -- Draw Phase --                |
|  [DISCARD 2 SELECTED]           |  <- Green confirm
|  [STAND PAT]                    |  <- Always visible
+----------------------------------+
|  [ HOLD TO SPEAK ]              |
+----------------------------------+
```

**Unique elements:**
- 5 cards in a fan layout (60x90px each, 15px overlap)
- Tap to toggle discard selection (card shifts up 20px, red border)
- Selection counter: "Discarding: X of 3"
- Max 3 enforcement: 4th tap shows "Maximum 3" flash message
- `selectedForDiscard: Set<number>` is local React state only (NOT VGF state)
- On confirm: dispatches `confirmDraw` with indices
- Timer: 30s + 15s time bank, auto-stands-pat on expiry

### 19.3 Blackjack Classic Controller

```
+----------------------------------+
|  Bet: $200  |  Wallet: $4,800   |
|  Dealer shows: 7                 |
+----------------------------------+
|                                  |
|  [Ah] [Kd]     Hand: 21         |  <- Player's cards
|                 BLACKJACK!       |
|                                  |
+----------------------------------+
|  -- Betting Phase --             |
|  Chip selector:                  |
|  [$10] [$25] [$50] [$100]      |  <- Tap to set bet
|  Bet: $___  [PLACE BET]         |
|                                  |
|  Side Bets (toggles):            |
|  [ ] Perfect Pairs $___          |
|  [ ] 21+3 $___                   |
+----------------------------------+
|  -- Play Phase --                |
|  [HIT]  [STAND]  [DOUBLE DOWN]  |
|  [SPLIT]  [SURRENDER]           |  <- Shown/hidden based on legality
|  [INSURANCE YES/NO]             |  <- Only during insurance phase
+----------------------------------+
|  [ HOLD TO SPEAK ]              |
+----------------------------------+
```

**Dynamic button visibility:**
- `SPLIT` shown only when initial 2 cards are a pair
- `DOUBLE DOWN` shown only on initial 2 cards (before any hit)
- `SURRENDER` shown only on initial 2 cards, Classic mode only
- `INSURANCE` shown only when dealer upcard is Ace (5-second decision)
- All unavailable actions are hidden (not greyed out — reduces cognitive load)
- After hit, if hand < 21: show HIT + STAND only
- After bust: show "BUST" indicator, disable all actions

### 19.4 Blackjack Competitive Controller

```
+----------------------------------+
|  Ante: $50  |  Pot: $200        |
|  Round 7 of 15                   |
+----------------------------------+
|                                  |
|  [9h] [Kd]     Hand: 19         |
|                                  |
+----------------------------------+
|  [HIT]  [STAND]  [DOUBLE DOWN]  |  <- No split, no surrender, no insurance
|                                  |
|  -- Waiting for others --        |  <- Shown during other players' turns
|  Player 2 is thinking...         |
+----------------------------------+
|  [ HOLD TO SPEAK ]              |
+----------------------------------+
```

**Differences from Classic:**
- Fixed ante display (not configurable per round)
- No split, surrender, insurance buttons (D-007)
- Waiting state shown during other players' turns
- Pot total shown instead of "Dealer shows"

### 19.5 Roulette Controller — TWO-TAB LAYOUT

Per Roadmap Decision 7, the Roulette controller uses a two-tab design:

```
+----------------------------------+
|  Wallet: $4,800  |  Timer: 0:35 |
|  Total Bet: $150                 |
+----------------------------------+
|  [QUICK BETS]  [NUMBER GRID]    |  <- Tab selector
+----------------------------------+

--- TAB 1: QUICK BETS (default) ---
+----------------------------------+
|  [  RED  ]    [  BLACK  ]       |  <- Large, 1:1 payout
|  [  ODD  ]    [  EVEN   ]       |  <- Large, 1:1 payout
|  [ HIGH  ]    [  LOW    ]       |  <- Large, 1:1 payout (19-36 / 1-18)
|                                  |
|  [1st 12] [2nd 12] [3rd 12]    |  <- Dozens, 2:1 payout
|  [Col 1]  [Col 2]  [Col 3]     |  <- Columns, 2:1 payout
|                                  |
|  Favourites: [17] [23] [7]     |  <- 3-5 saved lucky numbers
|                                  |
|  [REPEAT LAST]                   |  <- Disabled on round 1 (no previous bets)
+----------------------------------+
|  Chip: [$5] [$10] [$25] [$50]  |
|  [CONFIRM BETS]  [CLEAR ALL]    |
+----------------------------------+
|  [ HOLD TO SPEAK ]              |
+----------------------------------+

--- TAB 2: NUMBER GRID ---
+----------------------------------+
|  [0]                             |
|  [ 1][ 2][ 3]                   |
|  [ 4][ 5][ 6]                   |
|  [ 7][ 8][ 9]                   |
|  [10][11][12]                    |  <- Full 0-36 grid
|  [13][14][15]                    |     Tap = straight up
|  [16][17][18]                    |     Long-press = context menu
|  [19][20][21]                    |       for split/corner/street
|  [22][23][24]                    |
|  [25][26][27]                    |
|  [28][29][30]                    |
|  [31][32][33]                    |
|  [34][35][36]                    |
+----------------------------------+
|  Chip: [$5] [$10] [$25] [$50]  |
|  [CONFIRM BETS]  [CLEAR ALL]    |
+----------------------------------+
```

**Known issue — REPEAT LAST on round 1:** The "REPEAT LAST" button must be disabled when no previous bets exist (`roulette.previousBets === null || roulette.previousBets.length === 0`). Show as greyed out with tooltip "No previous bets".

**Number grid context menu (long-press):**
- Tap = Straight Up (35:1)
- Long-press opens a radial context menu:
  - "Split with [adjacent]" (17:1)
  - "Street [row]" (11:1)
  - "Corner" (8:1) — if applicable
  - "Six Line" (5:1) — if applicable

**Timer:** 45 seconds (ROULETTE_BET_TIMEOUT_MS). Visible countdown bar. "Last bets!" warning at 10 seconds.

### 19.6 Three Card Poker Controller

```
+----------------------------------+
|  Wallet: $4,800  |  Round 5     |
+----------------------------------+

--- ANTE SCREEN ---
+----------------------------------+
|  Place your ante:                |
|  [$10] [$25] [$50] [$100]      |
|                                  |
|  [ ] Pair Plus: $___             |  <- Optional side bet toggle
|                                  |
|  [DEAL ME IN]                    |
|                                  |
|  Timer: 0:15                     |
+----------------------------------+

--- DECISION SCREEN ---
+----------------------------------+
|  Your hand:                      |
|  [Kh] [Jd] [9s]                |  <- 3 cards displayed
|                                  |
|  Hand: King High                 |
|                                  |
|  [  PLAY  ]    [  FOLD  ]       |  <- Large buttons
|                                  |
|  Timer: 0:15                     |
+----------------------------------+
|  [ HOLD TO SPEAK ]              |
+----------------------------------+
```

**Key details:**
- Ante screen: chip selector + optional Pair Plus toggle
- Decision screen: 3 cards, PLAY/FOLD, 15-second timer (TCP_DECISION_TIMEOUT_MS)
- After decision: "Waiting for dealer reveal..." state
- Result: "You WIN +$200" or "Dealer doesn't qualify — ante returned" or "You LOSE -$100"

### 19.7 Craps Controller

#### Come-Out Betting Screen

```
+----------------------------------+
|  COME OUT ROLL  |  Wallet: $4,800|
|  Shooter: Alice                   |
+----------------------------------+
|                                  |
|  [    PASS LINE    ]             |  <- Large green button
|  [   DON'T PASS    ]             |  <- Large red button
|                                  |
|  -- Simple Mode active --        |
|  [Show Advanced Bets v]          |  <- Toggle (persists per session)
|                                  |
|  Chip: [$10] [$25] [$50] [$100]|
|  [CONFIRM BETS]                  |
|  Timer: |||||||||||  0:25        |
+----------------------------------+
|  [ HOLD TO SPEAK ]              |
+----------------------------------+
```

**Shooter's controller additionally shows:**
- "YOU ARE THE SHOOTER" gold banner at top
- Pass/Don't Pass is required — confirm disabled until one selected

#### Simple Mode vs Advanced Mode

Per Roadmap Decision 6, Simple Mode is the default:

| Mode | Visible Bets | Target Audience |
|------|-------------|-----------------|
| Simple (default) | Pass Line, Don't Pass | Casual players |
| Advanced (toggle) | + Come, Don't Come, Place (4/5/6/8/9/10), Field, Odds | Experienced players |

**Important: Simple Mode is purely a UI filter.** The server accepts all bet types regardless. The `craps.config.simpleMode` flag controls only what the controller renders.

#### Point Betting Screen (Advanced Mode)

```
+----------------------------------+
|  POINT IS 8  |  Wallet: $4,200  |
+----------------------------------+
|  Active bets:                    |
|  Pass Line: $50  [ADD ODDS]     |
|                                  |
|  [COME]    [DON'T COME]         |
|  [PLACE 4] [PLACE 5] [PLACE 6] |
|  [PLACE 8] [PLACE 9] [PLACE 10]|
|  [FIELD]                         |
+----------------------------------+
|  Chip: [$10] [$25] [$50] [$100]|
|  [CONFIRM]  Timer: 0:22         |
+----------------------------------+
```

#### Shooter's Roll Screen

```
+----------------------------------+
|  YOUR ROLL                       |
|  Roll for the point: 8          |
+----------------------------------+
|                                  |
|          +----------+            |
|          |          |            |
|          |  ROLL!   |            |  <- 40% of screen, pulsing
|          |          |            |
|          +----------+            |
|                                  |
|  Your bets: Pass Line $50       |
|  [ HOLD TO SPEAK: "Roll!" ]     |
+----------------------------------+
```

#### Roll Result View

```
+----------------------------------+
|  [⚃] [⚄]   =   9              |  <- Large dice faces + total
|                                  |
|  THE POINT IS 8. NOT THIS TIME. |
|                                  |
|  Pass Line: active               |
|  Field bet: +$25 (WIN)          |  <- Per-bet results
|                                  |
|  Net this roll: +$25             |
+----------------------------------+
```

---

## 20. Cross-Game Controller Elements

### 20.1 Status Bar (Always Visible)

```typescript
function ControllerStatusBar() {
  const wallet = useWallet(myPlayerId)
  const selectedGame = useSelectedGame()
  const connectionStatus = useConnectionStatus()

  return (
    <div className="status-bar">
      <span className="game-name">{GAME_DISPLAY_NAMES[selectedGame]}</span>
      <span className="wallet">${wallet.toLocaleString()}</span>
      <span className={`connection ${connectionStatus}`} />
    </div>
  )
}
```

### 20.2 Push-to-Talk Button

Persistent across all game controllers. Bottom of screen, large touch target (min 64x64px).

```typescript
function PushToTalk() {
  const { startRecording, stopRecording, isRecording } = useRecognition()
  return (
    <button
      className={`ptt-button ${isRecording ? 'recording' : ''}`}
      onTouchStart={startRecording}
      onTouchEnd={stopRecording}
    >
      {isRecording ? 'Listening...' : 'HOLD TO SPEAK'}
    </button>
  )
}
```

### 20.3 Video Overlay State

During full_screen video playback on the TV, controllers show:

```
+----------------------------------+
|                                  |
|         [50% dimmed]             |
|                                  |
|      Watch the screen            |
|                                  |
|                                  |
+----------------------------------+
```

- 50% black overlay
- "Watch the screen" centred text
- All controls disabled
- Dismiss when video completes (state sync)

### 20.4 Game Switching UI

**Host controller:**
- "Change Game" button visible between rounds
- Opens game selection carousel (same as lobby)
- Non-host players see "Host is switching games..."

**Non-host controller (v2 vote-based, D-008):**
- v1: "Only the host can switch games" message if attempted
- v2: "Propose Game Change" button, triggers vote

---

## 21. Game Night Controller

### 21.1 Between-Game Score Display

```
+----------------------------------+
|  GAME NIGHT  |  Game 2 of 4     |
+----------------------------------+
|  Your rank: 2nd                  |
|  Your points: 210                |
|                                  |
|  1st: Alice    245 pts          |
|  2nd: YOU      210 pts          |
|  3rd: Bob      185 pts          |
|  4th: Carol    155 pts          |
|                                  |
|  Bonus: +20 (Three wins in row) |
|                                  |
|  Next up: CRAPS                  |
+----------------------------------+
```

### 21.2 Champion Ceremony Controller

- Final standings
- "Share Results" button (Web Share API -> PNG generation)
- Download option for results card image

---

## 22. Retention UI (v2.2)

### 22.1 Daily Bonus Claim Screen

Shown on app open (TV or companion):

```
+----------------------------------+
|  DAILY BONUS - Day 4 of 7       |
|                                  |
|  [x][x][x][ ][ ][ ][ ]         |  <- 7-day progress dots
|                                  |
|  Today's reward:                 |
|  +1,500 chips (1.3x streak!)    |
|                                  |
|  [CLAIM BONUS]                   |
|                                  |
|  Streak: Week 3 (1.3x)          |
+----------------------------------+
```

### 22.2 Weekly Challenge Progress

```
+----------------------------------+
|  WEEKLY CHALLENGES               |
|                                  |
|  [Bronze] Play 5 hands           |
|  ████████░░  4/5                 |
|  Reward: 1,000 chips             |
|                                  |
|  [Silver] Win 3 BJ in a row     |
|  ██░░░░░░░░  1/3                 |
|  Reward: 3,000 chips + XP        |
|                                  |
|  [Gold] Hit a flush in Hold'em   |
|  ░░░░░░░░░░  0/1                 |
|  Reward: 8,000 chips + cosmetic  |
+----------------------------------+
```

### 22.3 Profile View

```
+----------------------------------+
|  PLAYER PROFILE                  |
|  [Avatar]  Alice                 |
|  Member since: Feb 2026          |
+----------------------------------+
|  Stats:                          |
|  Total hands: 1,247              |
|  Favourite game: Hold'em (45%)   |
|  Win rate: 52%                   |
|  Best hand: Royal Flush          |
|  Game Nights: 12                 |
|  Championships: 3                |
+----------------------------------+
|  Cosmetics:                      |
|  Card back: [selected]           |
|  Table felt: [equipped]          |
|  Chip set: [default]             |
|  Avatar frame: [gold crown]      |
+----------------------------------+
```

---

## 23. Phone Companion Mode (v2.2)

Per D-018, Phone Companion Mode is a standalone web app (no TV required). P0 for v2.2.

### 23.1 Architecture

```typescript
// Separate entry point from the game controller
// URL: https://companion.weekend-casino.com

function CompanionApp() {
  return (
    <PersistenceProvider>
      <CompanionRouter />
    </PersistenceProvider>
  )
}

function CompanionRouter() {
  return (
    <Routes>
      <Route path="/" element={<CompanionHome />} />
      <Route path="/daily" element={<DailyBonusScreen />} />
      <Route path="/challenges" element={<ChallengesScreen />} />
      <Route path="/profile" element={<ProfileScreen />} />
      <Route path="/crew" element={<CrewScreen />} />
    </Routes>
  )
}
```

### 23.2 Push Notifications (PWA)

Implemented via Service Workers:

```typescript
// Service Worker registration
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
}

// Push notification types
type PushNotificationType =
  | 'daily_bonus_available'     // "Your daily bonus is ready!"
  | 'challenge_progress'        // "Almost there! 4/5 hands played"
  | 'game_night_reminder'       // "Game Night tonight at 7!"
  | 'streak_at_risk'            // "Don't break your 6-week streak!"
```

### 23.3 Companion Bundle Size

Target: < 100 KB gzipped. No 3D rendering, no VGF SDK, no Recognition SDK. REST API calls to persistence layer only.

---

# VIII. Animation System

## 24. Theatre.js Integration

### 24.1 Project Structure

```typescript
import { getProject } from '@theatre/core'

// One Theatre.js project for the casino
const casinoProject = getProject('WeekendCasino')

// Per-game animation sheets
const holdemSheets = {
  deal: casinoProject.sheet('Holdem_CardDeal'),
  flop: casinoProject.sheet('Holdem_FlopReveal'),
  chipPush: casinoProject.sheet('Holdem_ChipPush'),
  potCollect: casinoProject.sheet('Holdem_PotCollect'),
  showdown: casinoProject.sheet('Holdem_Showdown'),
  win: casinoProject.sheet('Holdem_WinCelebration'),
}

const drawSheets = {
  deal: casinoProject.sheet('Draw_5CardDeal'),
  discard: casinoProject.sheet('Draw_DiscardSlide'),
  replacement: casinoProject.sheet('Draw_ReplacementDeal'),
}

const bjSheets = {
  shoeDeal: casinoProject.sheet('BJ_ShoeDeal'),
  dealerReveal: casinoProject.sheet('BJ_DealerReveal'),
  bust: casinoProject.sheet('BJ_BustSlam'),
  blackjack: casinoProject.sheet('BJ_BlackjackBurst'),
  split: casinoProject.sheet('BJ_SplitDivide'),
}

const rouletteSheets = {
  spin: casinoProject.sheet('Roulette_WheelSpin'),
  ballSettle: casinoProject.sheet('Roulette_BallSettle'),
  resultReveal: casinoProject.sheet('Roulette_ResultReveal'),
}

const crapsSheets = {
  diceRoll: casinoProject.sheet('Craps_DiceRoll'),
  puckFlip: casinoProject.sheet('Craps_PuckFlip'),
  chipFly: casinoProject.sheet('Craps_ChipFly'),
}

const tcpSheets = {
  deal: casinoProject.sheet('TCP_3CardDeal'),
  dealerReveal: casinoProject.sheet('TCP_DealerReveal'),
}

const sharedSheets = {
  dealerGestures: casinoProject.sheet('Shared_DealerGestures'),
  championCeremony: casinoProject.sheet('GN_ChampionCeremony'),
}
```

---

## 25. Animation Catalogue Per Game

### 25.1 Full Animation Timing Table

| Game | Animation | Duration | Trigger Phase | Blocks Phase |
|------|-----------|----------|--------------|--------------|
| **Hold'em** | Card deal (2 per player) | 2.0s | DEALING_HOLE_CARDS | Yes |
| | Flop reveal (3 cards) | 3.0s | DEALING_FLOP | Yes |
| | Turn/River reveal | 1.0s | DEALING_TURN/RIVER | Yes |
| | Chip push | 0.5s | Bet placed | No |
| | Pot collect | 1.5s | POT_DISTRIBUTION | Yes |
| | Showdown orbit | 3.0s | SHOWDOWN | No |
| | Win sparkle | 2.0s | Winner determined | No |
| **5-Card Draw** | 5-card deal | 2.0-4.0s | DRAW_DEALING | Yes |
| | Discard slide | 0.3s/card | DRAW_DRAW_PHASE | Yes |
| | Replacement deal | 0.3s/card | DRAW_DRAW_PHASE | Yes |
| **BJ Classic** | Shoe deal (2/player + 2 dealer) | 3.0s | BJ_DEAL_INITIAL | Yes |
| | Hit card | 0.4s | BJ_PLAYER_TURNS | No |
| | Dealer reveal | 1.0s | BJ_DEALER_TURN | Yes |
| | Bust slam | 0.5s | Player busts | No |
| | Blackjack burst | 1.5s | Natural BJ | No |
| | Split divide | 0.5s | Player splits | No |
| | Settlement sweep | 3.0s | BJ_SETTLEMENT | Yes |
| **BJ Competitive** | Deal (2/player) | 2.0s | BJC_DEAL_INITIAL | Yes |
| | Showdown reveal | 2.0s | BJC_SHOWDOWN | Yes |
| **Roulette** | Wheel spin + ball | 6.0s target | ROULETTE_SPIN | Yes |
| | Result reveal (pocket glow) | 0.5s | End of spin | No |
| | Chip sweep (losing bets) | 1.0s | ROULETTE_PAYOUT | No |
| | Chip push (winnings) | 0.5s | ROULETTE_PAYOUT | No |
| **TCP** | 3-card deal | 1.5s | TCP_DEAL | Yes |
| | Player card reveal | 0.5s | Player views | No |
| | Dealer qualifying reveal | 1.0s | TCP_DEALER_REVEAL | Yes |
| | Play/Fold stamp | 0.3s | Player decides | No |
| **Craps** | Dice roll (full sequence) | 2.5-3.5s | CRAPS_*_ROLL | Yes |
| | Puck flip (OFF->ON) | 0.5s | Point established | No |
| | Puck slide to number | 0.3s | Point established | No |
| | Chip fly to bet area | 0.4s | Bet placed | No |
| | Bet resolution flash | 0.5s/bet | CRAPS_*_RESOLUTION | No |
| **Game Night** | Leaderboard score animation | 1.0s | GN_LEADERBOARD | No |
| | Rank change slide | 0.5s | GN_LEADERBOARD | No |
| | Champion confetti | 4.0s | GN_CHAMPION | No |
| | Crown animation | 2.0s | GN_CHAMPION | No |
| **Shared** | Dealer nod | 1.0s | Various | No |
| | Dealer gesture (L/R) | 0.8s | Active player | No |
| | Turn timer arc | 30s | Active turn | No |
| | Active player glow | Continuous | Active turn | No |

---

## 26. Animation State Machine

### 26.1 State Machine

```typescript
interface AnimationState {
  currentSequence: string | null
  queue: AnimationRequest[]
  isPlaying: boolean
  currentGame: GameSceneId
}

interface AnimationRequest {
  sheet: ISheet
  sequenceName: string
  range?: [number, number]
  priority: 'blocking' | 'normal' | 'ambient'
  onComplete?: () => void
}
```

### 26.2 Phase-Animation Feedback

Dealing/spinning phases MUST NOT end until their animations complete. The Display dispatches completion signals:

```typescript
// Pattern: animation completion -> dispatch -> endIf resolves
dealSheet.sequence.play({ range: [0, 2] }).then(() => {
  dispatch('setDealingAnimationComplete', true)
})

// Server endIf pattern (per D-011, server is authoritative)
endIf: (ctx) => ctx.getState().dealingAnimationComplete
// Server timeout is the safety net, not the primary mechanism
```

---

# IX. Audio System

## 27. Audio Architecture

### 27.1 Audio Manager

```typescript
interface AudioManager {
  playDealerSpeech(text: string, dealerVoiceId: string): Promise<void>
  playSFX(name: SFXName): void
  setAmbientTrack(track: AmbientTrack, volume: number): void
  setAmbientVolume(volume: number): void
}

type SFXName =
  | 'card_deal' | 'card_flip' | 'chip_click' | 'chip_slide'
  | 'shuffle' | 'timer_tick' | 'win_fanfare' | 'all_in_hit'
  | 'fold_muck' | 'dice_throw' | 'dice_bounce' | 'dice_settle'
  | 'wheel_spin' | 'ball_bounce' | 'ball_settle'
  | 'crowd_cheer' | 'crowd_groan'
  | 'bust_slam' | 'blackjack_chime' | 'split_divide'
  | 'puck_flip' | 'confetti_burst' | 'drumroll' | 'victory_jingle'

type AmbientTrack =
  | 'holdem_vault'        // jazz lounge, intimate
  | 'draw_lounge'         // vintage warmth
  | 'bj_floor'            // glamorous casino energy
  | 'bjc_arena'           // tense, percussive
  | 'roulette_wheel_room' // opulent, anticipation
  | 'tcp_express'         // sleek, rhythmic
  | 'craps_rail'          // lively, crowd energy
  | 'lobby_grand'         // balanced, welcoming
```

### 27.2 Audio Priority

1. Dealer TTS announcements (highest)
2. Game result SFX (win_fanfare, bust_slam)
3. Action SFX (card_deal, chip_click, dice_throw)
4. Ambient track (lowest, always playing)

---

# X. Performance

## 28. Performance Budgets & Degradation

### 28.1 Target

| Metric | Target |
|--------|--------|
| Frame rate | 60fps on GameLift Streams gen4n_high |
| Triangle budget per scene | 85,000 |
| Texture memory | 128 MB max |
| Draw calls per frame | < 200 |
| State broadcast size | < 50 KB (per D-002 flat state) |

### 28.2 Per-Game Performance Budget

| Game | Triangles | Textures (MB) | Draw Calls | Notes |
|------|-----------|---------------|------------|-------|
| Hold'em | ~40,000 | ~45 | ~80 | Baseline |
| 5-Card Draw | ~38,000 | ~45 | ~85 | +5 cards/player |
| BJ Classic | ~42,000 | ~50 | ~90 | Split hands add draws |
| BJ Competitive | ~35,000 | ~40 | ~70 | Minimal environment |
| Roulette | ~55,000 | ~55 | ~110 | Wheel is geometry-heavy |
| TCP | ~35,000 | ~40 | ~70 | Simplest scene |
| Craps | ~50,000 | ~50 | ~100 | Table + dice physics |

### 28.3 Progressive Degradation (4 Levels)

If frame rate drops below 55fps for 5 consecutive seconds:

| Level | Action | FPS Threshold |
|-------|--------|---------------|
| 1 | Disable particle effects (smoke, dust, confetti) | < 55 |
| 2 | Disable Bloom post-processing | < 50 |
| 3 | Disable shadow maps (switch to baked shadows) | < 45 |
| 4 | Reduce environment geometry (LOD swap) | < 40 |

### 28.4 Controller Performance

| Metric | Target |
|--------|--------|
| Bundle size (gzipped) | < 200 KB |
| Touch targets | 48x48 px minimum |
| Orientation | Portrait-locked |
| First meaningful paint | < 2s (4G) |

### 28.5 Fire TV Stick Considerations

- State size: monitor `CasinoGameState` serialised size. Target < 50 KB.
- Batch craps resolution dispatches (per RC-1) to reduce broadcast frequency
- Video preload limit: max 2 concurrent on Stick (vs 3 on Cube/gen4n)

---

# XI. Asset Pipeline

## 29. 3D Model Pipeline

```
1. GENERATE    Meshy.AI text-to-3D (per art direction prompts)
2. EVALUATE    Review in Blender (topology, UV, texture quality)
3. RETOPOLOGISE  Blender: clean topology for animation (dealers, dice)
4. UV CLEANUP   Re-lay UVs, maximise texel density
5. TEXTURE REBAKE  Diffuse, roughness, metalness, normal, AO
6. OPTIMISE    Reduce to triangle budget; compress to KTX2/Basis
7. EXPORT      glTF 2.0 / GLB (binary)
8. INTEGRATE   Import into R3F scene, assign PBR materials
9. RIG         Dealer avatars: Meshy auto-rig or manual Blender
10. ANIMATE    Theatre.js keyframes + skeleton clips
11. TEST       Verify on GameLift Streams at 60fps
```

### 29.1 New v2 Assets Required

| Asset | Game | Triangles | Notes |
|-------|------|-----------|-------|
| Roulette wheel (base + rotor) | Roulette | ~6,200 | Most complex new model |
| Roulette ball | Roulette | ~200 | Physics-driven |
| Betting board felt | Roulette | ~500 | Flat, texture-heavy |
| Craps table | Craps | ~4,000 | Top-down simplified |
| ON/OFF puck | Craps | ~200 | Animated flip |
| Dice x2 | Craps | ~600 | Physics-driven, rounded edges |
| TCP table | TCP | ~2,500 | Compact semicircular |
| New dealer avatars (2 craps stickmen) | Craps | ~10,000 each | Lucky Luciano, Diamond Dolores |

---

## 30. Card Deck Asset

Reused across Hold'em, 5-Card Draw, Blackjack, and TCP.

**Source:** `52-card_deck.glb` (3.6 MB, Sketchfab)

**Structure:** 52 cards, each 3 mesh primitives (front, back, body). Name-based lookup required due to non-standard ordering.

**Known typo:** "Eigh of Hearts" (should be "Eight") — handled in `buildCardMeshMap()` normalisation.

**Visibility management:** Max visible cards varies by game:
- Hold'em: 17 (5 community + 4x2 hole + deck)
- 5-Card Draw: 25 (4x5 hole + deck + discard)
- BJ Classic: ~30 (4x8 split + dealer 6 + shoe)
- TCP: 10 (4x3 + dealer 3 + deck)
- Roulette/Craps: 0 (no cards)

---

## 31. Video Asset Management

### 31.1 CDN Configuration

```
CDN: CloudFront
Path: /assets/video/{game}/{asset_key}.mp4
Cache: public, max-age=604800 (7 days)
Format: MP4 H.264 Baseline, 4 Mbps, 1920x1080
Background videos: 1024x576 (lower resolution, occluded)
```

### 31.2 Cache Strategy

```typescript
interface VideoCache {
  maxEntries: 20              // LRU eviction
  maxTotalSizeBytes: 200_000_000  // 200 MB
  persistAcrossSessions: false  // cleared on app close
  neverEvict: string[]        // ['casino_intro', 'casino_outro', ...]
}
```

---

# XII. Observability & Analytics (Client-Side)

## 32. Datadog RUM — Display Client

The Display client (running on GameLift Streams cloud GPU) is instrumented with Datadog Real User Monitoring for performance tracking and error reporting.

```typescript
import { datadogRum } from '@datadog/browser-rum'

datadogRum.init({
  applicationId: process.env.DD_RUM_APP_ID!,
  clientToken: process.env.DD_RUM_CLIENT_TOKEN!,
  site: 'datadoghq.com',
  service: 'weekend-casino-display',
  env: process.env.DD_ENV ?? 'development',
  version: process.env.APP_VERSION,
  sessionSampleRate: 100,
  sessionReplaySampleRate: 0,  // No session replay on cloud GPU
  trackUserInteractions: false, // No direct user interaction on Display
  trackResources: true,
  trackLongTasks: true,
})
```

**Custom RUM Actions:**

| Action | Trigger | Properties |
|--------|---------|------------|
| `scene_loaded` | Scene mount complete | `game_type`, `load_duration_ms`, `asset_count` |
| `animation_played` | Theatre.js sheet complete | `animation_name`, `duration_ms`, `game_type` |
| `video_playback_started` | Video element `playing` event | `asset_key`, `mode`, `preloaded` (bool) |
| `video_playback_degraded` | Fallback triggered | `asset_key`, `reason` (not_loaded/error/timeout) |
| `frame_drop_detected` | FPS monitor < 30fps for 2s | `game_type`, `phase`, `avg_fps`, `triangle_count` |
| `degradation_level_changed` | Performance auto-tuner | `from_level`, `to_level`, `trigger_metric` |

**Performance Vitals (Datadog):**
- Frame rate (via `requestAnimationFrame` sampling)
- WebGL draw calls per frame
- JS heap size
- Scene load time per game
- Video preload hit rate

## 33. Amplitude SDK — Controller Client

The Controller client (mobile browser) tracks UI interaction events via the Amplitude JS SDK.

```typescript
import * as amplitude from '@amplitude/analytics-browser'

amplitude.init(process.env.AMPLITUDE_API_KEY!, {
  defaultTracking: {
    sessions: true,
    pageViews: false,  // SPA, not relevant
    formInteractions: false,
    fileDownloads: false,
  },
})
```

**Client-Side Events (Controller):**

| Event | Trigger | Properties |
|-------|---------|------------|
| `controller_connected` | VGF connection established | `join_method` (qr/direct), `device_type`, `browser` |
| `voice_command_attempted` | Push-to-talk released | `transcript`, `game_type`, `phase` |
| `voice_fallback_to_touch` | Action taken via button after voice fail | `intended_action`, `game_type` |
| `bet_ui_interaction` | Chip selector / slider used | `game_type`, `input_type` (chip/slider/preset/voice) |
| `draw_card_selected` | 5-Card Draw card tapped | `card_index`, `total_selected` |
| `roulette_tab_switched` | Quick Bets ↔ Number Grid | `from_tab`, `to_tab` |
| `roulette_repeat_last` | REPEAT LAST tapped | `bet_count`, `total_amount` |
| `craps_simple_mode_toggled` | Advanced bets toggle | `new_state` (simple/advanced) |
| `video_overlay_shown` | Controller dims for full-screen video | `asset_key`, `duration_ms` |
| `game_night_score_viewed` | Leaderboard shown between games | `current_rank`, `points` |
| `tutorial_started` | First-play tutorial triggered | `game_type` |
| `tutorial_completed` | Tutorial finished/skipped | `game_type`, `completed` (bool), `duration_ms` |

**Amplitude User Identity:**
```typescript
// Set on controller connection, before any events
amplitude.setUserId(playerId)  // Device fingerprint or identity ID
amplitude.identify(new amplitude.Identify()
  .set('device_type', deviceType)
  .set('browser', browserName)
  .set('platform', 'controller')
)
```

## 34. Amplitude SDK — Display Client

The Display client also tracks high-level session events for cross-referencing with server-side data.

| Event | Trigger | Properties |
|-------|---------|------------|
| `display_session_started` | VGF connection + first state | `player_count`, `device_model` |
| `scene_transition` | Game switch | `from_game`, `to_game`, `transition_duration_ms` |
| `video_played` | Video playback complete | `asset_key`, `mode`, `was_preloaded`, `skip_requested` |
| `game_night_ceremony` | Champion ceremony triggered | `champion_id`, `total_games`, `margin` |

## 35. Tracking Library Integration (Client-Side)

> **[PENDING]** The shared tracking library will also be integrated on the client side. Assumptions:
>
> - The library will be added as a dependency to `@weekend-casino/display` and `@weekend-casino/controller`
> - It will provide a unified `track()` API that routes to Amplitude (and optionally Datadog custom actions)
> - Client-side tracking is non-blocking and internally batched
> - The library will share event schema definitions with the server-side instance
>
> This section will be updated once the tracking library specification is provided. Current Amplitude calls use the native SDK syntax as a placeholder.

---

# XIII. Testing

## 36. Testing Strategy

### 32.1 Unit Tests (Vitest)

```typescript
// Per-game component tests
describe('HoldemController', () => {
  it('renders fold/check/call/raise buttons during betting phase')
  it('disables actions when not player turn')
  it('shows raise slider with correct min/max')
})

describe('RouletteController', () => {
  it('renders two tabs: Quick Bets and Number Grid')
  it('disables REPEAT LAST when no previous bets')
  it('enforces ROULETTE_MAX_TOTAL_BET limit')
  it('shows context menu on long-press of number')
})

describe('CrapsController', () => {
  it('shows only Pass Line and Dont Pass in Simple Mode')
  it('shows full bet menu in Advanced Mode')
  it('shows ROLL button only to shooter')
  it('disables confirm until shooter has placed required bet')
})

describe('VideoOverlayManager', () => {
  it('plays full_screen video above canvas')
  it('plays background video behind canvas')
  it('preempts low priority with high priority')
  it('respects per-round overlay cap')
  it('gracefully degrades when asset not loaded')
})

describe('SceneRouter', () => {
  it('mounts correct scene for selected game')
  it('unmounts previous scene on game switch')
  it('shows loading fallback during Suspense')
})
```

### 32.2 E2E Tests (Playwright)

```typescript
// Cross-game flow tests
test('complete game switch from Hold em to Blackjack preserves wallet')
test('Game Night flows through 3 games with leaderboard between each')
test('Roulette spin animation completes and dispatches result')
test('Craps Simple Mode hides advanced bets')
test('TCP full round: ante, deal, play/fold, resolution')
test('Video overlay shows Watch the screen on controller during full_screen')
test('Daily bonus claim on companion mode')
```

### 32.3 Visual Regression

- Storybook snapshots for all 7 controller layouts
- Percy or Chromatic for Display scene screenshots (per-game, key phases)
- Roulette wheel spin visual test (ball lands in correct pocket)
- Craps dice roll visual test (dice show correct faces)

### 32.4 Performance Testing

- Frame rate monitoring during each game scene (target: 60fps sustained)
- State broadcast size measurement per game
- Controller bundle size gate (< 200 KB gzipped, CI check)
- Video preload timing measurement (< 2s for critical assets on warm cache)

---

## Appendix A: Canonical Decision Cross-Reference

| Decision | Impact on Frontend |
|----------|-------------------|
| D-001 | Single ruleset -> single VGFProvider, no session switching on game change |
| D-002 | Flat state with optional sub-objects -> granular selectors per game |
| D-003 | Phase naming convention -> PhaseRouter switch cases |
| D-004 | CasinoGame enum values -> SceneRouter switch, controller router |
| D-005 | 10,000 starting chips -> wallet display default |
| D-006 | BJ max bet 500 -> chip selector cap |
| D-007 | BJ Competitive sequential, no splits -> simplified controller |
| D-008 | Host-only game switch (v1) -> "Change Game" button host-only |
| D-009 | Soft 17 configurable -> no frontend impact (server logic) |
| D-010 | BJ dealer characters -> avatar selection in lobby |
| D-011 | Server-authoritative video -> Display dispatches completion, not authority |
| D-012 | 51 v1 video assets -> asset registry size |
| D-013 | Per-game lazy loading -> SceneRouter Suspense, video cache strategy |
| D-014 | Rank-based Game Night scoring -> leaderboard display |
| D-015 | TCP in v2.0 -> include in v2.0 scene router |
| D-016 | Craps in v2.1 -> defer craps scene to v2.1 build |
| D-017 | DAU targets -> no direct frontend impact |
| D-018 | Phone Companion P0 v2.2 -> separate companion web app |
| D-019 | Persistence parallel -> companion depends on persistence APIs |

---

## Appendix B: Known Issues and Gaps

| Issue | Status | Recommendation |
|-------|--------|---------------|
| Roulette REPEAT LAST on round 1 | Documented | Disable button when `previousBets` is null/empty |
| Craps Simple Mode server-side | Documented | Pure UI filter; server accepts all bets |
| TCP missing tutorial | Gap | 3-step ~20s tutorial mirroring Roulette pattern |
| 3D dice/wheel physics engine | Not specified | React Three Fiber + Rapier (deterministic, low CPU) |
| Roulette near-miss detection | Server-side | Display triggers visual effect based on server adjacency flag |
| Fire TV Stick state size | Risk | Monitor serialised state; batch craps dispatches |

---

*This document is implementation-ready. All component hierarchies, animation timings, wireframes, and performance budgets are specified to enable parallel frontend development across all 7 games and the retention meta-systems.*

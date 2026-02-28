# Weekend Casino — Video Asset Specification

> **Status:** Final
> **Authority:** Video asset prompts, specifications, and production pipeline. Authoritative for asset keys, visual direction, and encoding specs.
> **Last Aligned:** 2026-02-28
> **Canonical Decisions:** See `docs/CANONICAL-DECISIONS.md`
> **Supersedes:** — | **Superseded By:** —
>
> **Version:** 2.0
> **Date:** 2026-02-27
> **Author:** Motion Design / Video Art Direction
> **Cross-reference:** `docs/CASINO-GAME-DESIGN.md` Section 27 — Video Asset Key Registry

---

## Table of Contents

- [1. Overview & Vision](#1-overview--vision)
- [2. Vegas Atmosphere Guidelines](#2-vegas-atmosphere-guidelines)
- [3. Per-Game Visual Identity](#3-per-game-visual-identity)
- [4. Playback Mode Production Notes](#4-playback-mode-production-notes)
- [5. Asset Inventory & Prompts — Shared](#5-asset-inventory--prompts--shared)
- [6. Asset Inventory & Prompts — Texas Hold'em](#6-asset-inventory--prompts--texas-holdem)
- [7. Asset Inventory & Prompts — 5-Card Draw](#7-asset-inventory--prompts--5-card-draw)
- [8. Asset Inventory & Prompts — Blackjack Classic](#8-asset-inventory--prompts--blackjack-classic)
- [9. Asset Inventory & Prompts — Blackjack Competitive](#9-asset-inventory--prompts--blackjack-competitive)
- [10. Integration Notes](#10-integration-notes)
- [11. Production Pipeline](#11-production-pipeline)
- [12. Asset Key Cross-Reference](#12-asset-key-cross-reference)

---

## 1. Overview & Vision

Weekend Casino is a multi-game platform (Texas Hold'em, 5-Card Draw, Blackjack Classic, Blackjack Competitive) rendered in React Three Fiber and streamed via Amazon GameLift Streams to Smart TVs and Fire TVs. Pre-generated AI videos provide cinematic moments of spectacle, atmosphere, and polish throughout the experience.

### Role of Video

Videos play on the **Display (TV) only**. The controller phone does not play videos -- it shows a dimmed overlay with "Watch the screen" during full-screen/transition moments.

### Playback Modes

The game design document defines four playback modes. Every asset in this spec is tagged to one of these:

| Mode | Behaviour | Display Area | Gameplay Paused? |
|------|-----------|-------------|-----------------|
| **`full_screen`** | Video covers entire Display. 3D scene hidden. | 100% viewport | Yes |
| **`overlay`** | Video composited on top of 3D scene. | Partial viewport | No |
| **`background`** | Video behind/beneath 3D scene as ambient. | Full viewport, behind 3D | No |
| **`transition`** | Full-screen video bridging two scenes. | 100% viewport | Yes |

### The Standard

Every frame should make the player feel they have been invited into the private gaming salon at the Bellagio. Cinematic, luxurious, deliberate.

---

## 2. Vegas Atmosphere Guidelines

### 2.1 Colour Palette

Aligned with PRD Section 20.2:

```
Primary:
  Racing Green       #1B4D2E   Felt, brand accent, Hold'em identity
  Mahogany           #4A1C0A   Wood trim, warm base tones
  Antique Brass      #C9A84C   Metal accents, highlights, gold particles
  Near-Black         #1A1A1D   Deep shadows, backgrounds

Secondary:
  Burgundy           #6B1D2A   Deep accents, card backs, 5-Card Draw identity
  Cognac Leather     #5C3A1E   Warm mid-tones, vintage elements
  Champagne          #F5E6C8   Highlights, particle glints
  Crystal Blue       #4A90D9   Cool accents, Blackjack identity
  Charcoal           #2A2A2E   Walls, shadows

Lighting Temperatures:
  Hold'em            2700K     Warm amber pendant lights
  5-Card Draw        2400K     Deep amber, Tiffany lamp warmth
  Blackjack Classic  3500K     Brighter, crystal chandelier energy
  Blackjack Comp.    3200K     Arena spotlights, tighter, more intense
  Casino Lobby       3000K     Grand, balanced
```

### 2.2 Key Visual Motifs

- Crystal chandeliers with prismatic refractions
- Polished mahogany surfaces and brass fittings
- Green baize felt, immaculate
- Cascading casino chips in slow motion
- Gold particle effects for celebrations
- Cigar smoke wisps drifting through light beams
- Elegant neon signage (vintage typography, not garish)
- Velvet, leather, and rich fabric textures
- Bokeh city lights through windows
- Playing cards in fluid motion

### 2.3 Cinematography References

- **Casino Royale (2006)** — Poker tension, deliberate camera, close-ups on hands and chips
- **Ocean's Eleven (2001)** — Casino floor glamour, warm tones, smooth tracking
- **Rounders (1998)** — Underground intensity, tight framing, shallow depth of field
- **The Sting (1973)** — Vintage elegance, dusty light beams
- **Molly's Game (2017)** — Private room luxury, exclusivity

### 2.4 Audio Pairing

| Video Category | Audio Direction |
|---------------|----------------|
| Full-screen intros | Orchestral swell, strings and brass, subtle electronic pulse |
| Full-screen celebrations | Triumphant brass fanfare, cascading chimes, crowd murmur |
| Overlay celebrations | Brief stinger -- 1-2 second brass hit or sparkle chime |
| Overlay actions (bust, split, etc.) | Dramatic beat, bass hit, tension sting |
| Transitions | Smooth jazz stings, piano runs, brushed cymbal |
| Background ambient | Minimal: room tone, distant jazz piano, ice clinking |
| Competitive moments | Tighter, more percussive, arena energy |

---

## 3. Per-Game Visual Identity

### 3.1 Texas Hold'em — "The Vault"

The serious, high-stakes private room.

| Attribute | Detail |
|-----------|--------|
| **Room** | Octagonal private room, dark wood panelling, art-deco moulding |
| **Lighting** | Warm amber pendant (2700K), dramatic spotlights, deep shadows |
| **Colours** | Racing Green, Mahogany, Antique Brass, Near-Black |
| **Materials** | Green felt, polished mahogany, brushed brass, cognac leather |
| **Props** | Whisky decanter, cigar ashtray, heavy drapes, Persian rug |
| **Mood** | Casino Royale private room. Tense. Exclusive. |

### 3.2 5-Card Draw — "The Lounge"

Vintage Vegas. Dean Martin's card room.

| Attribute | Detail |
|-----------|--------|
| **Room** | Rectangular lounge, vintage bar, leather banquettes |
| **Lighting** | Deep amber (2400K), Tiffany lamps, warm pools of light |
| **Colours** | Burgundy, Cognac, Antique Brass, Warm Grey |
| **Materials** | Aged leather, worn green felt, tarnished brass, dark walnut |
| **Props** | Vintage whisky bottles, old card box, brass spittoon, boxing prints |
| **Mood** | Rounders meets The Sting. Timeless. Authentic. |

### 3.3 Blackjack Classic — "The Floor"

Glamorous main casino floor.

| Attribute | Detail |
|-----------|--------|
| **Room** | Open casino floor, multiple tables in bokeh, grand ceiling |
| **Lighting** | Brighter (3500K), crystal chandeliers, prismatic light, neon accents |
| **Colours** | Crystal Blue, Champagne, Chrome Silver, Deep Gold, Near-Black |
| **Materials** | Polished chrome, crystal glass, black lacquer, deep green felt |
| **Props** | Champagne flutes, chrome card shoe, art-deco signage, mirrored panels |
| **Mood** | Ocean's Eleven floor. Glamorous. Energetic. |

### 3.4 Blackjack Competitive — "The Arena"

Intense, stripped-down tournament setting.

| Attribute | Detail |
|-----------|--------|
| **Room** | Single table isolated by darkness, arena-style spotlight from above |
| **Lighting** | Tight spotlight (3200K) on table, surrounding darkness, rim lights on players |
| **Colours** | Near-Black, Deep Gold, Chrome Silver, accent red (#C23B22) |
| **Materials** | Dark felt, brushed steel, matte black surfaces |
| **Props** | Minimal -- the focus is the table and the cards. No distractions. |
| **Mood** | UFC weigh-in meets high-stakes poker tournament. Gladiatorial. |

---

## 4. Playback Mode Production Notes

Different playback modes require different production approaches:

### `full_screen` — Cinematic Takes

- Frame as standalone short film -- complete compositions, no transparency needed
- Fills entire 1920x1080 viewport; 3D scene is hidden during playback
- Can use full cinematic camera movements: cranes, dollies, orbits
- Rich detail throughout the frame; viewer's full attention is here
- These **pause gameplay** -- they earn their runtime

### `overlay` — Compositable Elements

- Must work visually when composited over the live 3D game scene
- Use **high-contrast elements against darker/neutral backgrounds** that blend naturally
- Centre visual interest in the **top third or corners** of the frame to avoid obscuring the game table
- Keep motion contained -- no wild camera moves that fight the static game camera
- Keep **brief and punchy** -- these play over live gameplay and must not distract
- Consider semi-transparent smoke/particle elements that composite well
- Blackjack overlays especially must be brief (1.5-3s) and non-blocking

### `background` — Ambient Loops

- Seamless loops are mandatory -- cross-fade last 0.5s into first 0.5s in post
- Lower visual intensity -- this sits BEHIND the 3D scene
- Atmospheric and subtle: smoke, light flicker, distant activity, bokeh
- No sharp visual events that would pull attention from the game
- Render at lower resolution (1024x576 or 512x288) since it's partially occluded

### `transition` — Scene Bridges

- Full-screen, similar to cinematic but specifically bridges between two states
- Start frame should visually connect to the outgoing scene
- End frame should visually connect to the incoming scene
- These are shorter (3-4s) and more purposeful than intros

---

## 5. Asset Inventory & Prompts — Shared

**7 assets** used across all games.

### `casino_intro`

| Attribute | Value |
|-----------|-------|
| **Mode** | `full_screen` |
| **Duration** | 8,000ms |
| **Blocks phase** | Yes |
| **Skippable** | Yes (after 3s) |
| **Trigger** | First player connects (`LOBBY.onBegin`, first time only) |
| **Loop** | No |

```
PROMPT: Cinematic establishing sequence of an ultra-luxury Las Vegas casino at night.
The camera begins with a wide exterior shot — polished marble columns, gold-framed glass
doors, warm amber light spilling from within, neon signage glowing softly overhead.
The camera pushes forward through the entrance doors, into a grand lobby atrium with a
massive crystal chandelier throwing prismatic light across polished marble floors. Gold
leaf trim on crown moulding. Velvet rope barriers. The camera continues tracking forward,
gliding across the lobby, through a corridor, and arriving at a poker table with green
felt, brass accents, and neat chip stacks under a warm pendant light. The entire journey
feels like an invitation.

CAMERA: Continuous tracking push-in. Starts wide exterior (15m out), pushes through
doors, across lobby, down corridor, arriving at table level. Slight low angle on the
exterior, levelling as it enters.
LIGHTING: Cool moonlight exterior (6500K) transitioning to warm chandelier interior
(3000K) transitioning to intimate pendant warmth (2700K) at the table.
MOOD: Arrival. Anticipation. "Welcome to the Bellagio."
DURATION: 8 seconds
ASPECT: 16:9, 1920x1080
STYLE: Deep focus for the lobby reveal, transitioning to shallow depth of field at the
table. Warm cinematic grading (teal-orange exterior, pure warmth interior).
```

### `casino_outro`

| Attribute | Value |
|-----------|-------|
| **Mode** | `full_screen` |
| **Duration** | 6,000ms |
| **Blocks phase** | No |
| **Skippable** | Yes |
| **Trigger** | Session end / all players leave |
| **Loop** | No |

```
PROMPT: Reverse journey from inside a luxury casino. Camera pulls back from a poker
table with scattered chips and face-down cards, rising slowly. The warm pendant light
recedes above. The camera retreats through the room doorway, down a corridor lit by
brass sconces, across the grand lobby. The chandelier passes overhead as we move toward
the glass entrance doors. The camera pushes through the doors into the cool night air.
A final wide shot of the casino exterior, lights glowing warmly within, the city
skyline beyond. Fade to black.

CAMERA: Continuous reverse tracking. Rises from table level to eye level, retreats
through the casino, exits through doors. Final wide shot with a gentle 2% zoom-out.
LIGHTING: Warm interior fading as we exit. Cool exterior night. The casino glows
behind us like a warm memory.
MOOD: Departure. Satisfaction. "Until next time."
DURATION: 6 seconds
ASPECT: 16:9, 1920x1080
STYLE: Dreamlike reverse of the intro. Slight motion blur on corridor elements.
Fade to black over the final 1 second.
```

### `game_select_holdem`

| Attribute | Value |
|-----------|-------|
| **Mode** | `transition` |
| **Duration** | 4,000ms |
| **Blocks phase** | Yes |
| **Skippable** | Yes (after 1s) |
| **Trigger** | Player selects Texas Hold'em |
| **Loop** | No |

```
PROMPT: Camera swoops through a casino corridor toward heavy mahogany double doors.
The doors swing open, revealing the intimate Hold'em room — green felt table under warm
pendant lights, brass accents gleaming, leather chairs waiting. Chips scatter across
the felt in a dramatic flourish as if placed by invisible hands. Playing cards fan
outward from the deck in a dealer's flourish.

CAMERA: Fast tracking push-in through corridor, slowing as doors open. Ends with
the table filling the frame.
LIGHTING: Dark corridor transitioning to warm amber room (2700K). Dramatic light/shadow
at the doorway.
MOOD: "You've chosen the serious game." Exclusive. Dramatic.
DURATION: 4 seconds
ASPECT: 16:9, 1920x1080
STYLE: Casino Royale energy. High contrast at the door threshold. The room reveal
is the hero moment.
```

### `game_select_five_card_draw`

| Attribute | Value |
|-----------|-------|
| **Mode** | `transition` |
| **Duration** | 4,000ms |
| **Blocks phase** | Yes |
| **Skippable** | Yes (after 1s) |
| **Trigger** | Player selects 5-Card Draw |
| **Loop** | No |

```
PROMPT: Close-up of five playing cards being drawn one by one from a deck and fanned
into a hand against the warm amber atmosphere of a vintage poker parlour. Each card
slides out with a satisfying motion. Behind the cards, a Tiffany lamp glows warmly,
vintage whisky bottles are backlit on glass shelves, worn leather and walnut surfaces
are visible. The five cards settle into a perfect fan. The atmosphere is intimate,
warm, nostalgic — 1960s Las Vegas.

CAMERA: Close-up macro shot. Cards enter frame and arrange. Very shallow depth of
field — cards sharp, parlour background in warm bokeh.
LIGHTING: Deep amber Tiffany lamp (2400K). Backlit whisky bottles. Card surfaces
catching warm light.
MOOD: Classic. Timeless. "The way poker was meant to be played."
DURATION: 4 seconds
ASPECT: 16:9, 1920x1080
STYLE: Vintage warmth, subtle film grain. Intimate macro photography.
```

### `game_select_blackjack_classic`

| Attribute | Value |
|-----------|-------|
| **Mode** | `transition` |
| **Duration** | 4,000ms |
| **Blocks phase** | Yes |
| **Skippable** | Yes (after 1s) |
| **Trigger** | Player selects Blackjack Classic |
| **Loop** | No |

```
PROMPT: Dealer's hands visible on deep green felt. A chrome card shoe gleams under
crystal chandelier light. The hands slide two cards from the shoe — smooth, precise,
practiced. The first card lands face-up: an Ace. A beat. The second card slides and
lands: a King. The Ace and King sit together on the felt — natural blackjack. A pulse
of warm white light spreads from the cards. Crystal chandelier refractions dance across
the chrome surfaces.

CAMERA: Close-up on the dealing action, starting tight on the shoe and hands, widening
slightly as the cards land.
LIGHTING: Crystal chandelier (3500K). Chrome reflections. The natural blackjack moment
triggers a subtle light pulse.
MOOD: "The perfect hand, dealt first try." Glamorous. Electric.
DURATION: 4 seconds
ASPECT: 16:9, 1920x1080
STYLE: Clean, modern, gleaming. The chrome card shoe is a hero element.
```

### `game_select_blackjack_competitive`

| Attribute | Value |
|-----------|-------|
| **Mode** | `transition` |
| **Duration** | 4,000ms |
| **Blocks phase** | Yes |
| **Skippable** | Yes (after 1s) |
| **Trigger** | Player selects Competitive Blackjack |
| **Loop** | No |

```
PROMPT: Split-screen composition. Two sides of a blackjack table, each showing a
player's hand from their perspective. Both hands receive cards simultaneously.
A tight spotlight isolates each side against surrounding darkness. Tension music
energy — the lighting pulses subtly. Cards flip face-up on both sides. The split
screen contracts toward the centre, suggesting the moment of comparison. Rim lights
outline both positions. The atmosphere is stripped back, intense, gladiatorial.

CAMERA: Symmetrical split-screen composition. Each side has its own slight push-in.
Both halves converge at the end.
LIGHTING: Arena-style spotlights (3200K) on each position. Deep darkness surrounding.
Rim lights on table edges. Minimal ambient — stark contrast.
MOOD: "Player vs player. No mercy." Tournament intensity.
DURATION: 4 seconds
ASPECT: 16:9, 1920x1080
STYLE: High contrast. Split-screen is the signature visual. UFC/boxing weigh-in energy.
```

### `game_transition`

| Attribute | Value |
|-----------|-------|
| **Mode** | `transition` |
| **Duration** | 3,000ms |
| **Blocks phase** | Yes |
| **Skippable** | No |
| **Trigger** | Switching between games (from `HandComplete` to `GAME_SELECT`) |
| **Loop** | No |

```
PROMPT: Casino chips cascade through the frame in slow motion — a mix of all
denominations (white, red, black, purple, gold). The chips fill the frame like a
curtain falling, then clear to reveal a grand casino corridor stretching ahead with
warm light. The chip cascade serves as a transition wipe between worlds. Each chip
catches light on its metallic inlay as it tumbles.

CAMERA: Static, locked-off. Chips fall through frame. Second half shows the corridor
behind them.
LIGHTING: Warm overhead (2700K). Metallic chip edges catching light as they rotate.
Corridor warm and inviting behind.
MOOD: "Changing tables." Excitement for what's next.
DURATION: 3 seconds
ASPECT: 16:9, 1920x1080
STYLE: Slow motion on the chips. The transition wipe is the key technique.
```

---

## 6. Asset Inventory & Prompts — Texas Hold'em

**9 assets** (8 gameplay + 1 ambient).

### `holdem_first_hand`

| Attribute | Value |
|-----------|-------|
| **Mode** | `overlay` |
| **Duration** | 3,000ms |
| **Blocks phase** | No |
| **Trigger** | Hand #1 of session (`POSTING_BLINDS`) |

```
PROMPT: Against a dark, semi-transparent background, a subtle animation plays:
poker chips slide into frame from the left, stacking neatly. A warm golden glow
builds behind the chip stack. Playing cards flutter down like leaves from the top
of frame, settling around the chips. Gold particles drift lazily through the
composition. The entire animation is contained in the upper third of the frame,
leaving the lower two-thirds clear for the game scene beneath.

CAMERA: Static. Overlay composition — no camera movement.
LIGHTING: Self-illuminated gold particles and chip glow against dark/transparent
background. Warm amber tone (2700K feel).
MOOD: "Here we go. First hand." Anticipation with warmth.
DURATION: 3 seconds
ASPECT: 16:9, 1920x1080
STYLE: Overlay-friendly — visual interest concentrated in top third. Elements
should composite cleanly over a game scene. Semi-transparent dark gradient at base.
```

### `holdem_showdown_reveal`

| Attribute | Value |
|-----------|-------|
| **Mode** | `overlay` |
| **Duration** | 2,000ms |
| **Blocks phase** | No |
| **Trigger** | Any showdown reached (`SHOWDOWN`) |

```
PROMPT: A dramatic slow-motion card-flip sequence. Two playing cards rotate from
face-down to face-up in sequence, each catching warm pendant light as they turn.
Subtle lens flares pulse from the card edges during the flip. Gold particle traces
follow each card's rotation arc. The composition is centred but leaves the bottom
half of the frame relatively clear. The background is a dark vignette — this plays
over the actual 3D card reveal happening beneath it.

CAMERA: Static close-up. Cards flip in the centre-upper portion of frame.
LIGHTING: Warm pendant glow (2700K). Card edges catching light = lens flare triggers.
Self-illuminated gold particle trails.
MOOD: Moment of truth. Deliberate. Dramatic.
DURATION: 2 seconds
ASPECT: 16:9, 1920x1080
STYLE: Overlay-optimised — dark/transparent base. Slow-motion card flips are the star.
Composites over the real 3D reveal for a layered cinematic effect.
```

### `holdem_big_pot`

| Attribute | Value |
|-----------|-------|
| **Mode** | `overlay` |
| **Duration** | 3,000ms |
| **Blocks phase** | No |
| **Trigger** | Pot >= 500 chips (`POT_DISTRIBUTION`) |

```
PROMPT: Overlay celebration: casino chips cascade downward through the frame in slow
motion like golden rain. The chips are a mix of denominations — emphasis on gold ($1000)
and purple ($500) chips. Each chip catches warm light on its metallic edge as it falls.
Subtle firework-style gold sparkle bursts appear at random points in the upper frame.
The lower half is kept relatively clear with only a few stray chips passing through.
Background is dark with a warm amber gradient.

CAMERA: Static. Chips fall from top of frame.
LIGHTING: Warm overhead (2700K). Self-illuminated gold sparkle effects. Metallic chip
reflections.
MOOD: "That's a massive pot." Abundance. Triumph.
DURATION: 3 seconds
ASPECT: 16:9, 1920x1080
STYLE: Overlay-friendly — visual weight in upper half. Chips cascade naturally with
gravity. The gold/purple denominations sell the "big money" story.
```

### `holdem_royal_flush`

| Attribute | Value |
|-----------|-------|
| **Mode** | `full_screen` |
| **Duration** | 5,000ms |
| **Blocks phase** | Yes |
| **Skippable** | Yes (after 2s) |
| **Trigger** | Royal Flush at `POT_DISTRIBUTION` |

```
PROMPT: Five playing cards — 10, Jack, Queen, King, Ace of the same suit — fan out
in a perfect arc on deep green felt under warm amber pendant light. As each card reaches
position, a burst of gold particles erupts. The fan completes and a massive golden
shockwave pulses outward from the cards. The pendant light above flares dramatically.
Casino chips rain down from above in slow motion. The entire frame bathes in triumphant
gold light. The camera orbits slowly around the card arrangement as chips continue
to cascade. The intimate poker room — dark wood, brass fittings — is visible in the
warm golden haze.

CAMERA: Starts tight on fanning cards, pulls back as shockwave expands. Slow orbit
(~30 degrees) during the celebration.
LIGHTING: Pendant flare. Self-illuminated gold particles. Deep gold wash. The room
itself glows.
MOOD: Peak triumph. The rarest, greatest hand. Absolute glory.
DURATION: 5 seconds
ASPECT: 16:9, 1920x1080
STYLE: Maximum cinematic drama. Full-screen takeover. Every particle visible. This
is the single most spectacular video in the Hold'em set.
```

### `holdem_straight_flush`

| Attribute | Value |
|-----------|-------|
| **Mode** | `full_screen` |
| **Duration** | 4,000ms |
| **Blocks phase** | Yes |
| **Skippable** | Yes (after 2s) |
| **Trigger** | Straight Flush at `POT_DISTRIBUTION` |

```
PROMPT: Five suited playing cards arrange in sequence on dark green felt. Each card
slides into position trailing electric blue energy that contrasts against the warm
amber room. As the sequence completes, a pulse of blue-gold energy travels through the
cards from lowest to highest. The pendant light pulses. Chips scatter outward from the
pot and collect toward the winning position. The warm poker room — mahogany, brass,
leather — frames the celebration.

CAMERA: Overhead tracking following the card sequence, pulling back to show all five.
LIGHTING: Electric blue card trails against warm amber room (2700K). The contrast of
cool effect and warm room is the signature look.
MOOD: Precision. Power. Nearly as rare as a royal flush.
DURATION: 4 seconds
ASPECT: 16:9, 1920x1080
STYLE: Dynamic energy effects in a warm, grounded environment. The blue-gold colour
contrast distinguishes this from the all-gold Royal Flush celebration.
```

### `holdem_four_of_a_kind`

| Attribute | Value |
|-----------|-------|
| **Mode** | `overlay` |
| **Duration** | 3,000ms |
| **Blocks phase** | No |
| **Trigger** | Four of a Kind at `POT_DISTRIBUTION` |

```
PROMPT: Four matching playing cards slam down in rapid succession against a dark
overlay background — boom, boom, boom, boom. Each impact creates a ripple of warm
amber light that expands outward. On the fourth card, a larger golden shockwave
pulses. Gold particles scatter from the final impact. The composition stays in the
centre-upper portion of frame, leaving the bottom relatively clear for the game
scene beneath. The energy is powerful but contained to the overlay space.

CAMERA: Static. Cards enter from above, slamming down centre-frame.
LIGHTING: Self-illuminated impact ripples. Gold shockwave on fourth card. Dark
background.
MOOD: Dominance. Power. Four of a kind is a statement hand.
DURATION: 3 seconds
ASPECT: 16:9, 1920x1080
STYLE: Overlay-friendly. Each slam should FEEL heavy. Slight screen-shake energy
on impacts. The dark background composites cleanly over the game scene.
```

### `holdem_player_busted`

| Attribute | Value |
|-----------|-------|
| **Mode** | `overlay` |
| **Duration** | 2,500ms |
| **Blocks phase** | No |
| **Trigger** | Player stack reaches 0 (`HAND_COMPLETE`) |

```
PROMPT: Overlay composition: a small stack of chips topples and scatters across a dark
surface, each chip rolling away until they fade from view. The warm amber light that
was illuminating the chips contracts and dims, leaving expanding darkness. A single
pendant light swings gently at the top of frame, its light cone narrowing. The mood
is sympathetic — loss, not humiliation. The animation occupies the centre of frame
with dark borders that composite over the game scene.

CAMERA: Static. The toppling chips and dimming light are the motion.
LIGHTING: Warm pendant (2700K) dimming and contracting. Chips losing their illumination
as they scatter.
MOOD: "Out of chips." Commiseration. The quiet after the storm.
DURATION: 2.5 seconds
ASPECT: 16:9, 1920x1080
STYLE: Overlay-friendly. Understated. The dimming light tells the story — no dramatic
destruction.
```

### `holdem_all_in_runout`

| Attribute | Value |
|-----------|-------|
| **Mode** | `overlay` |
| **Duration** | 2,000ms |
| **Blocks phase** | No |
| **Trigger** | All-in runout begins (`ALL_IN_RUNOUT`) |

```
PROMPT: Tension-building overlay: a slow-motion heartbeat effect — a warm golden
light pulse that expands and contracts rhythmically against a dark background. Subtle
slow-motion particles drift downward. The edges of the frame darken progressively
(vignette intensifying). The pulse rate is slow and heavy, suggesting a heartbeat
under pressure. A faint warm glow illuminates the top of frame where community cards
would be revealed.

CAMERA: Static. The pulsing light is the motion.
LIGHTING: Pulsing warm gold against near-black. Intensifying vignette.
MOOD: Maximum tension. "Everything is on the line." Heartbeat moment.
DURATION: 2 seconds
ASPECT: 16:9, 1920x1080
STYLE: Overlay-optimised. Minimal visual elements — the pulsing light and darkening
edges create tension without obscuring the actual runout cards being dealt beneath.
```

### `holdem_ambient_table`

| Attribute | Value |
|-----------|-------|
| **Mode** | `background` |
| **Duration** | Indefinite (loop) |
| **Blocks phase** | No |
| **Trigger** | Active during all Hold'em gameplay phases |

```
PROMPT: Slow atmospheric shot of an intimate, high-end private poker room. Dark wood
panelled walls with art-deco moulding. Warm brass pendant lights cast pools of amber
light. Cigar smoke wisps drift lazily through visible light beams. A whisky decanter
catches light on a side table. Leather chairs cast long shadows. Ambient dust motes
float slowly through the warm air. The motion is minimal, meditative — just smoke,
light, and dust. No cards, no chips, no action — pure atmosphere.

CAMERA: Very slow pan (left to right, ~10 degrees over 6s).
LIGHTING: Warm pendant lights (2700K). Visible light beams through smoke. Deep shadows.
MOOD: The room breathes. Expectation. Atmosphere as character.
DURATION: 6 seconds (seamless loop — cross-fade last 0.5s into first 0.5s in post)
ASPECT: 16:9, 1024x576 (background resolution)
STYLE: Rich, warm, atmospheric. Low visual intensity — this sits behind the 3D scene.
No sharp events. Everything drifts.
```

---

## 7. Asset Inventory & Prompts — 5-Card Draw

**10 assets** (9 gameplay + 1 ambient).

### `draw_dealing_cinematic`

| Attribute | Value |
|-----------|-------|
| **Mode** | `overlay` |
| **Duration** | 2,000ms |
| **Blocks phase** | No |
| **Trigger** | Deal begins (`DRAW_DEALING`) |

```
PROMPT: Brief overlay cinematic: a deck of cards being shuffled with a classic riffle
shuffle technique, then five cards dealt in a smooth arc. The warm amber glow of a
Tiffany lamp illuminates the cards as they move. Vintage poker parlour atmosphere —
walnut surfaces and green felt visible in soft focus behind. The animation is contained
in the upper-centre of frame. Background is a dark amber gradient for clean compositing.

CAMERA: Static macro shot. Cards shuffle and deal in centre-upper frame.
LIGHTING: Tiffany lamp amber (2400K). Card surfaces catching warm light.
MOOD: Ritual. "The deal." Classic and rhythmic.
DURATION: 2 seconds
ASPECT: 16:9, 1920x1080
STYLE: Overlay-friendly. Vintage warmth, subtle film grain. The shuffle sound should
pair beautifully with this visual.
```

### `draw_the_draw`

| Attribute | Value |
|-----------|-------|
| **Mode** | `overlay` |
| **Duration** | 1,500ms |
| **Blocks phase** | No |
| **Trigger** | Draw phase begins (`DRAW_DRAW_PHASE`) |

```
PROMPT: Dramatic overlay: cards slide away from a hand (the discards), leaving gaps.
Replacement cards fly in from the side with trails of warm golden light, slotting into
the gaps. The exchange happens in the centre of frame against a dark amber background.
Each arriving card creates a small burst of gold particles on landing. Brief and punchy.

CAMERA: Static. Cards exit and enter frame horizontally.
LIGHTING: Self-illuminated golden card trails. Dark amber background. Tiffany warmth.
MOOD: "The moment of truth." Exchange. Possibility. The signature mechanic.
DURATION: 1.5 seconds
ASPECT: 16:9, 1920x1080
STYLE: Overlay-optimised. Quick, satisfying. The card exchange is fluid and precise.
```

### `draw_showdown_reveal`

| Attribute | Value |
|-----------|-------|
| **Mode** | `overlay` |
| **Duration** | 2,000ms |
| **Blocks phase** | No |
| **Trigger** | Showdown reached (`DRAW_SHOWDOWN`) |

```
PROMPT: Five playing cards fan out dramatically in the upper portion of frame, each
card flipping face-up in sequence with a warm amber light pulse on each reveal. The
fan is wider than Hold'em's two-card flip — a full five-card spread. Warm golden
particles drift from each card as it settles. Background is dark with a warm amber
vignette. The composition is designed to layer over the 3D showdown happening below.

CAMERA: Static. Cards fan outward from a central point.
LIGHTING: Warm amber light pulse per card flip. Self-illuminated gold particles.
MOOD: All five revealed. The full hand. Judgment.
DURATION: 2 seconds
ASPECT: 16:9, 1920x1080
STYLE: Overlay-friendly. The five-card fan is wider and more dramatic than Hold'em's
showdown overlay — it's the visual signature of 5-Card Draw.
```

### `draw_royal_flush`

| Attribute | Value |
|-----------|-------|
| **Mode** | `full_screen` |
| **Duration** | 5,000ms |
| **Blocks phase** | Yes |
| **Skippable** | Yes (after 2s) |
| **Trigger** | Royal Flush at `DRAW_POT_DISTRIBUTION` |

```
PROMPT: Five playing cards fan out in a perfect arc against the warm amber atmosphere
of a vintage poker lounge. 10, Jack, Queen, King, Ace of the same suit. Each card
trails warm golden particles. As the fan completes, the Tiffany lamp overhead flickers
dramatically — a surge of warm light fills the room. Gold flecks drift like vintage
confetti. The walnut bar with amber whisky bottles gleams. Leather banquettes and
brass fittings catch the golden surge. The room itself celebrates.

CAMERA: Starts tight on the fanning cards, pulls back to show the full lounge bathed
in golden light.
LIGHTING: Tiffany lamp surge (2400K intensifying). Self-illuminated gold particles.
Whisky bottle reflections. The room glows.
MOOD: Once in a lifetime, in the most timeless of settings. Vintage glory.
DURATION: 5 seconds
ASPECT: 16:9, 1920x1080
STYLE: Warm, golden, not chrome-flashy. The celebration matches the room — intimate
and rich. Distinct from Hold'em's darker drama.
```

### `draw_straight_flush`

| Attribute | Value |
|-----------|-------|
| **Mode** | `full_screen` |
| **Duration** | 4,000ms |
| **Blocks phase** | Yes |
| **Skippable** | Yes (after 2s) |
| **Trigger** | Straight Flush at `DRAW_POT_DISTRIBUTION` |

```
PROMPT: Five suited cards arrange in sequence on vintage green felt under Tiffany
lamp light. Each card slides into position with a warm golden trail. As the sequence
completes, a pulse of amber-gold energy travels through the cards. The vintage lounge
— walnut bar, leather banquettes, brass fittings — frames the moment. Chips collect
smoothly toward the winning position. Warm confetti-like gold flecks fill the air.

CAMERA: Overhead tracking following the card sequence. Pulls back to show the
lounge environment.
LIGHTING: Tiffany lamp (2400K) with golden energy pulse. Warm throughout.
MOOD: Precision in a classic setting. Warm triumph.
DURATION: 4 seconds
ASPECT: 16:9, 1920x1080
STYLE: Vintage warmth with energy effects. The amber colour palette distinguishes
this from Hold'em's blue-gold Straight Flush.
```

### `draw_four_of_a_kind`

| Attribute | Value |
|-----------|-------|
| **Mode** | `overlay` |
| **Duration** | 3,000ms |
| **Blocks phase** | No |
| **Trigger** | Four of a Kind at `DRAW_POT_DISTRIBUTION` |

```
PROMPT: Four matching cards slam down in sequence against a dark amber overlay
background. Each impact sends amber light ripples outward. The fourth card triggers
a larger warm golden pulse. The Tiffany lamp aesthetic carries through — the light
effects are amber and golden, not the cooler tones of Hold'em. Composition stays in
centre-upper frame.

CAMERA: Static. Cards slam from above.
LIGHTING: Amber impact ripples (2400K tone). Golden pulse on fourth card.
MOOD: Powerful. Warm dominance. The classic game's big hand.
DURATION: 3 seconds
ASPECT: 16:9, 1920x1080
STYLE: Overlay-friendly. Same structure as Hold'em's four-of-a-kind but warmer,
more vintage in colour tone.
```

### `draw_big_hand`

| Attribute | Value |
|-----------|-------|
| **Mode** | `overlay` |
| **Duration** | 2,500ms |
| **Blocks phase** | No |
| **Trigger** | Full House or better + pot >= 300 at `DRAW_POT_DISTRIBUTION` |

```
PROMPT: Overlay: chips cascade downward through the frame in slow motion, emphasis on
warm amber tones. Fewer chips than Hold'em's big pot (this is a more modest celebration).
A warm golden glow pulses once at the centre of frame. Vintage confetti-like gold
flecks drift through. Dark amber background for compositing.

CAMERA: Static. Chips fall, glow pulses.
LIGHTING: Warm amber (2400K). Self-illuminated gold flecks. Modest but satisfying.
MOOD: "Solid hand, solid pot." Warm satisfaction without excess.
DURATION: 2.5 seconds
ASPECT: 16:9, 1920x1080
STYLE: Overlay-friendly. More restrained than the Hold'em big pot. Warm, vintage.
```

### `draw_stand_pat`

| Attribute | Value |
|-----------|-------|
| **Mode** | `overlay` |
| **Duration** | 1,500ms |
| **Blocks phase** | No |
| **Trigger** | Player stands pat (draws 0) at `DRAW_DRAW_PHASE` |

```
PROMPT: Brief dramatic overlay: a hand of five face-down cards on dark background.
A golden light traces the outline of all five cards simultaneously — a confident,
assured glow that says "I'm keeping them all." The light holds steady for a beat,
then fades. No particle effects — the confidence is in the stillness. The cards are
arranged in the centre-upper frame.

CAMERA: Static. The light tracing is the only motion.
LIGHTING: Golden edge-light tracing the card outlines against dark background.
MOOD: Confidence. "I don't need anything." Power move.
DURATION: 1.5 seconds
ASPECT: 16:9, 1920x1080
STYLE: Overlay-friendly. Minimal, confident. The stillness sells the boldness.
```

### `draw_going_deep`

| Attribute | Value |
|-----------|-------|
| **Mode** | `overlay` |
| **Duration** | 1,500ms |
| **Blocks phase** | No |
| **Trigger** | Player discards 3 (maximum) at `DRAW_DRAW_PHASE` |

```
PROMPT: Brief dramatic overlay: three cards fly away from a hand, scattering into
the darkness with trails of amber sparks. Two remaining cards sit isolated, exposed.
Three replacement cards rush in from the opposite direction with golden trails,
completing the hand. The exchange is aggressive, bold — a big move. Dark background
with warm amber accents.

CAMERA: Static. Cards fly in opposite directions through centre frame.
LIGHTING: Amber spark trails on departing cards. Golden trails on arriving cards.
MOOD: Desperation or boldness — the viewer decides. "Going deep."
DURATION: 1.5 seconds
ASPECT: 16:9, 1920x1080
STYLE: Overlay-friendly. More aggressive motion than draw_the_draw. The three-card
exchange should feel like a gamble.
```

### `draw_ambient_parlour`

| Attribute | Value |
|-----------|-------|
| **Mode** | `background` |
| **Duration** | Indefinite (loop) |
| **Blocks phase** | No |
| **Trigger** | Active during all 5-Card Draw phases |

```
PROMPT: Slow atmospheric shot of a vintage poker parlour. Walnut bar with amber whisky
bottles backlit on glass shelves. Tiffany lamps casting pools of warm coloured light.
Leather banquettes with brass studs. Cigar smoke curling through warm light beams.
Framed vintage boxing prints on panelled walls. The motion is minimal — smoke, dust
motes, flickering lamp light. No players, no action — pure old-school atmosphere.

CAMERA: Very slow pan (left to right, ~10 degrees over 6s).
LIGHTING: Deep amber Tiffany lamps (2400K). Backlit bar bottles. Visible light beams.
MOOD: Nostalgia. The old Las Vegas. Timeless.
DURATION: 6 seconds (seamless loop — cross-fade last 0.5s into first 0.5s in post)
ASPECT: 16:9, 1024x576 (background resolution)
STYLE: Warm, slightly desaturated, subtle film grain. Low intensity — sits behind the
3D scene. Distinct from Hold'em's ambient through the warmer, more vintage grading.
```

---

## 8. Asset Inventory & Prompts — Blackjack Classic

**16 assets** (15 gameplay + 1 ambient).

**Important pacing note:** Blackjack hands resolve in 30-60 seconds. Overlays must be **brief and non-blocking**. Full-screen moments are reserved only for extremely rare outcomes and major financial wins.

### `bj_place_bets_prompt`

| Attribute | Value |
|-----------|-------|
| **Mode** | `overlay` |
| **Duration** | 1,500ms |
| **Blocks phase** | No |
| **Trigger** | Each round begins (`BJ_PLACE_BETS`) |

```
PROMPT: Brief overlay: a single casino chip tosses upward from the bottom of frame,
spinning in slow motion, catching crystal chandelier light on its metallic edge.
The chip reaches the apex of its arc and begins to descend. The composition is
compact, centred in the upper third. Background is a dark gradient with subtle
crystal light refractions. Quick, non-intrusive, rhythmic — this plays every round.

CAMERA: Static. Chip tosses and arcs in upper frame.
LIGHTING: Crystal chandelier refractions (3500K). Chrome highlights on chip edge.
MOOD: "Place your bets." Routine but energetic. The round begins.
DURATION: 1.5 seconds
ASPECT: 16:9, 1920x1080
STYLE: Overlay-optimised. Compact. This plays frequently so it must be brief and
never tiresome. The chip toss is satisfying but not elaborate.
```

### `bj_deal_cinematic`

| Attribute | Value |
|-----------|-------|
| **Mode** | `overlay` |
| **Duration** | 2,000ms |
| **Blocks phase** | No |
| **Trigger** | Initial deal begins (`BJ_DEAL_INITIAL`) |

```
PROMPT: Overlay: close-up of cards sliding from a gleaming chrome card shoe. The
shoe is detailed — polished chrome surfaces catching crystal chandelier light. Cards
emerge smoothly, one by one, each tracing a short arc before exiting frame downward.
The dealing rhythm is precise and mechanical. Background is dark with chrome reflections
and subtle crystal refractions. Composition is in the upper portion of frame.

CAMERA: Static macro on the card shoe. Cards emerge and exit.
LIGHTING: Chrome shoe reflections. Crystal chandelier light (3500K). Each card catches
light briefly.
MOOD: Precision. The mechanical beauty of the deal. Ritual.
DURATION: 2 seconds
ASPECT: 16:9, 1920x1080
STYLE: Overlay-friendly. The chrome card shoe is Blackjack's signature prop. Clean,
modern, gleaming.
```

### `bj_natural_blackjack`

| Attribute | Value |
|-----------|-------|
| **Mode** | `overlay` |
| **Duration** | 3,000ms |
| **Blocks phase** | No |
| **Trigger** | Natural blackjack dealt (`BJ_DEAL_INITIAL`) |

```
PROMPT: Celebration overlay: an Ace and a face card slam together with an electric
pulse of warm white light expanding outward from the point of impact. Crystal
chandelier refractions shatter across the frame — prismatic rainbow fragments. Gold
and crystal particles cascade downward. The light pulse is bright, jubilant, electric.
Chrome surfaces in the background catch and amplify the celebration. Composition is
centred with the light pulse radiating outward.

CAMERA: Static. The card impact and light explosion are the motion.
LIGHTING: Electric warm white pulse. Crystal prismatic refractions. Gold particle glow.
Chrome amplification.
MOOD: Perfection. "Natural blackjack!" Pure elation. The best hand dealt clean.
DURATION: 3 seconds
ASPECT: 16:9, 1920x1080
STYLE: Overlay-optimised. Bright, electric, celebratory. Distinctly Blackjack —
the crystal/chrome aesthetic vs poker's warm amber.
```

### `bj_insurance_dramatic`

| Attribute | Value |
|-----------|-------|
| **Mode** | `overlay` |
| **Duration** | 2,000ms |
| **Blocks phase** | No |
| **Trigger** | Insurance offered (dealer shows Ace, `BJ_INSURANCE`) |

```
PROMPT: Tension overlay: a single Ace sits face-up on green felt, glowing with a
pulsing ominous amber-red light. The glow pulses like a heartbeat — slow, heavy,
warning. The surrounding frame darkens progressively. Crystal chandelier light above
dims. The Ace is isolated in a pool of ominous light. Is the dealer hiding a 10?
The uncertainty is visual.

CAMERA: Static. The pulsing glow is the motion.
LIGHTING: Ominous amber-red pulse on the Ace. Surrounding light dimming. The mood
shifts from bright Blackjack floor to tension.
MOOD: Danger. Uncertainty. "Do you take the insurance?"
DURATION: 2 seconds
ASPECT: 16:9, 1920x1080
STYLE: Overlay-friendly. The ominous colour shift is the key technique. Darker and
more tense than other Blackjack overlays.
```

### `bj_double_down_bold`

| Attribute | Value |
|-----------|-------|
| **Mode** | `overlay` |
| **Duration** | 1,500ms |
| **Blocks phase** | No |
| **Trigger** | Player doubles down (`BJ_PLAYER_TURNS`) |

```
PROMPT: Brief punchy overlay: a chip stack doubles in height — a second stack slams
down on top of the first with an impact flash. A bold golden light pulse outward from
the doubled stack. Chrome edges flash. Quick, confident, decisive. Composition is
compact in the upper third.

CAMERA: Static. Chip stack doubles with impact.
LIGHTING: Impact flash. Gold pulse. Chrome reflections.
MOOD: Bold move. Confidence. "Doubling down." Decisive.
DURATION: 1.5 seconds
ASPECT: 16:9, 1920x1080
STYLE: Overlay-optimised. Punchy and brief. The doubling visual is immediately readable.
```

### `bj_split_action`

| Attribute | Value |
|-----------|-------|
| **Mode** | `overlay` |
| **Duration** | 1,500ms |
| **Blocks phase** | No |
| **Trigger** | Player splits (`BJ_PLAYER_TURNS`) |

```
PROMPT: Brief overlay: two identical cards sit together, then separate — sliding apart
to opposite sides of the frame with a visual flourish. A bright dividing line of light
appears between them as they split. Each card leaves a trail of crystal-white particles.
The split motion is clean and satisfying. Dark background with chrome accent lighting.

CAMERA: Static. Cards separate horizontally through centre frame.
LIGHTING: Bright dividing light line. Crystal particle trails. Chrome accents.
MOOD: Division. "Split." Two chances instead of one.
DURATION: 1.5 seconds
ASPECT: 16:9, 1920x1080
STYLE: Overlay-friendly. The splitting motion should feel precise and mechanical,
like the game mechanic it represents.
```

### `bj_player_bust`

| Attribute | Value |
|-----------|-------|
| **Mode** | `overlay` |
| **Duration** | 2,000ms |
| **Blocks phase** | No |
| **Trigger** | Player busts, exceeds 21 (`BJ_PLAYER_TURNS`) |

```
PROMPT: Sympathetic bust overlay: playing cards visible in the upper frame crumble
and shatter into fragments, like glass breaking in slow motion. The fragments dissolve
into dark particles that drift downward and fade. The bright crystal chandelier light
above dims and desaturates. The overall frame darkens. The effect is sympathetic —
loss, not punishment.

CAMERA: Static. Cards shatter and dissolve.
LIGHTING: Crystal light dimming. Card fragments briefly self-illuminated before fading.
Desaturation.
MOOD: "Too many." Bust. Sympathetic but final.
DURATION: 2 seconds
ASPECT: 16:9, 1920x1080
STYLE: Overlay-optimised. The crumble/shatter effect is the signature bust visual.
Brief enough not to slow the game's pace.
```

### `bj_twenty_one`

| Attribute | Value |
|-----------|-------|
| **Mode** | `overlay` |
| **Duration** | 2,000ms |
| **Blocks phase** | No |
| **Trigger** | Player hits exactly 21 (non-natural, `BJ_PLAYER_TURNS`) |

```
PROMPT: Celebration overlay: gold sparkle particles burst from the centre of frame
in a radial pattern. Crystal light refractions dance through the sparkle. The
celebration is bright but more contained than the natural blackjack — this is a
great result but not the ultimate one. Chrome surfaces catch the sparkle light.
Composition centred in upper frame.

CAMERA: Static. Radial sparkle burst.
LIGHTING: Gold sparkle (self-illuminated). Crystal refractions. Chrome reflections.
MOOD: "Twenty-one!" Celebration. Less dramatic than a natural but still worth marking.
DURATION: 2 seconds
ASPECT: 16:9, 1920x1080
STYLE: Overlay-friendly. Scaled-down version of the natural blackjack celebration.
The tier difference should be visually obvious.
```

### `bj_hole_card_reveal`

| Attribute | Value |
|-----------|-------|
| **Mode** | `overlay` |
| **Duration** | 2,500ms |
| **Blocks phase** | No |
| **Trigger** | Dealer reveals hole card (`BJ_DEALER_TURN`) |

```
PROMPT: The marquee moment. A single face-down card on green felt, lit by a tight
spotlight. A beat of stillness — pure tension. Then the card slowly, deliberately
rotates 180 degrees from face-down to face-up. The rotation takes about 1.5 seconds
and is captured in extreme slow motion. As the card reaches face-up, the spotlight
widens. Crystal chandelier refractions pulse briefly. The chrome card shoe gleams in
the background bokeh. This is the single most important moment in Blackjack.

CAMERA: Static extreme close-up on the card. Very shallow depth of field.
LIGHTING: Tight spotlight widening during reveal. Crystal refractions. Chrome bokeh.
MOOD: Maximum tension. "What's the dealer hiding?" The heart of Blackjack.
DURATION: 2.5 seconds
ASPECT: 16:9, 1920x1080
STYLE: Overlay-optimised. The slow card flip is the entire visual. Every frame of the
rotation matters. Casino Royale tension. This plays alongside the 3D reveal animation.
```

### `bj_dealer_bust`

| Attribute | Value |
|-----------|-------|
| **Mode** | `overlay` |
| **Duration** | 3,000ms |
| **Blocks phase** | No |
| **Trigger** | Dealer busts (`BJ_DEALER_TURN`) |

```
PROMPT: Celebration overlay: dealer's cards scatter slightly as if pushed by invisible
force. Simultaneously, multiple golden spotlight circles light up across the frame —
one for each player position — representing all standing players winning. Gold confetti
and chip particles cascade from above. Crystal chandelier brightens. Chrome surfaces
flash with reflected celebration.

CAMERA: Static wide composition. Multiple spotlight circles and cascading particles.
LIGHTING: Multiple golden spotlights activating. Chandelier brightening. Chrome
reflections amplifying.
MOOD: Collective victory. "The house lost!" Everyone wins. Shared celebration.
DURATION: 3 seconds
ASPECT: 16:9, 1920x1080
STYLE: Overlay-friendly. The simultaneous spotlight activation is the key visual —
everyone wins at once. Brighter and more inclusive than individual win celebrations.
```

### `bj_dealer_blackjack`

| Attribute | Value |
|-----------|-------|
| **Mode** | `overlay` |
| **Duration** | 2,500ms |
| **Blocks phase** | No |
| **Trigger** | Dealer reveals blackjack (`BJ_DEALER_TURN`) |

```
PROMPT: Ominous overlay: a dramatic card flip reveals a natural blackjack for the
dealer. The frame darkens significantly. The crystal chandelier light shifts to a
cooler, harsher tone. A low-frequency visual pulse radiates from the dealer's cards.
The chrome surfaces lose their warmth, becoming cold steel blue. The effect is the
visual opposite of the player's natural blackjack celebration.

CAMERA: Static. Card flip and colour shift.
LIGHTING: Warm-to-cold colour shift (3500K to 5500K feel). Darkening frame. The
temperature change is the story.
MOOD: Ominous. "The house wins." Cold. Definitive.
DURATION: 2.5 seconds
ASPECT: 16:9, 1920x1080
STYLE: Overlay-friendly. The warm-to-cold colour shift is the inverse of the player
celebration. Immediately readable as "bad news."
```

### `bj_big_win`

| Attribute | Value |
|-----------|-------|
| **Mode** | `full_screen` |
| **Duration** | 4,000ms |
| **Blocks phase** | Yes |
| **Skippable** | Yes (after 2s) |
| **Trigger** | Player wins >= 500 chips in a round (`BJ_SETTLEMENT`) |

```
PROMPT: Full-screen celebration: the camera sweeps across a blackjack table as chips
rain down from above in slow motion. Crystal chandelier overhead throws prismatic light
across everything — rainbow refractions dance on chrome surfaces, green felt, and
falling chips. Neon accent lights along the ceiling edges pulse warmly. The camera
rises from table level to show the full scope of the celebration — hundreds of chips
in all denominations cascading. The Blackjack floor in the background is alive with
reflected light.

CAMERA: Low-angle sweep rising to reveal shot. Dynamic, energetic.
LIGHTING: Crystal prismatic explosion. Neon accent pulses. Chrome everywhere amplifying.
Full brightness.
MOOD: Big money. "That's a massive win!" Euphoria.
DURATION: 4 seconds
ASPECT: 16:9, 1920x1080
STYLE: Full cinematic treatment. Brighter and more energetic than poker celebrations —
the Blackjack floor's chrome and crystal identity in full effect.
```

### `bj_side_bet_win`

| Attribute | Value |
|-----------|-------|
| **Mode** | `overlay` |
| **Duration** | 2,500ms |
| **Blocks phase** | No |
| **Trigger** | Any side bet wins (`BJ_SETTLEMENT`) |

```
PROMPT: Overlay celebration: a secondary chip stack (positioned to the side of
centre, suggesting the side bet area) pulses with golden light and grows upward as
winnings stack on. Crystal sparkle effects radiate from the side bet position. The
celebration is distinct from main-hand wins — offset to one side, using a different
sparkle pattern (more crystalline, less golden rain). Brief and satisfying.

CAMERA: Static. Off-centre composition — the side bet position is the hero.
LIGHTING: Golden pulse on side bet chips. Crystal sparkle effects. Warm.
MOOD: Bonus win. "The side bet paid!" Pleasant surprise.
DURATION: 2.5 seconds
ASPECT: 16:9, 1920x1080
STYLE: Overlay-friendly. Visually distinct from main-hand celebrations through
the offset positioning and crystalline (vs golden) particle style.
```

### `bj_perfect_pair`

| Attribute | Value |
|-----------|-------|
| **Mode** | `overlay` |
| **Duration** | 3,000ms |
| **Blocks phase** | No |
| **Trigger** | Perfect Pair side bet (25:1, `BJ_SETTLEMENT`) |

```
PROMPT: Premium side bet overlay: two matching cards glow and pulse in perfect
synchronisation — mirrored, identical, harmonious. A golden light bridge connects
them. Chrome sparkle effects cascade between the pair. The synchronised pulsing
is hypnotic — these are perfectly matched. Crystal light refractions frame the
pair from above. More elaborate than the standard side bet win.

CAMERA: Static. The twin-pulse synchronisation is the motion.
LIGHTING: Synchronised golden pulses. Chrome sparkle bridge. Crystal framing.
MOOD: Perfection. Matching. "Perfect pair — 25 to 1!" Premium side bet.
DURATION: 3 seconds
ASPECT: 16:9, 1920x1080
STYLE: Overlay-optimised. The synchronised glow is the signature visual that
distinguishes this from other side bet wins.
```

### `bj_suited_triple`

| Attribute | Value |
|-----------|-------|
| **Mode** | `full_screen` |
| **Duration** | 5,000ms |
| **Blocks phase** | Yes |
| **Skippable** | Yes (after 2s) |
| **Trigger** | 21+3 Suited Triple (100:1 payout, `BJ_SETTLEMENT`) |

```
PROMPT: Jackpot-tier full-screen celebration. Three suited cards arrange in a triangle
formation on the Blackjack table. As they settle, an explosive burst of prismatic
crystal light erupts from the centre of the triangle — the most dramatic light effect
in the entire Blackjack set. Crystal chandelier overhead shatters into a thousand
points of rainbow light. Chrome surfaces become mirrors reflecting the explosion.
Chips cascade from every direction. Neon accent lights strobe. The camera orbits the
card triangle as the celebration fills every pixel. This is the rarest moment in
Blackjack — 100:1 payout.

CAMERA: Starts tight on the three-card triangle, pulls back as the explosion occurs.
Slow orbit during the celebration.
LIGHTING: Maximum prismatic explosion. Crystal shattering into rainbow. Neon strobing.
Chrome mirror reflections. The brightest, most colourful moment in the entire game.
MOOD: Jackpot. "100 to 1!" The rarest, most spectacular Blackjack moment. Legendary.
DURATION: 5 seconds
ASPECT: 16:9, 1920x1080
STYLE: Full cinematic maximum spectacle. This video should make the player's jaw drop.
The prismatic crystal explosion is the Blackjack equivalent of Hold'em's Royal Flush.
```

### `bj_ambient_table`

| Attribute | Value |
|-----------|-------|
| **Mode** | `background` |
| **Duration** | Indefinite (loop) |
| **Blocks phase** | No |
| **Trigger** | Active during all Blackjack Classic phases |

```
PROMPT: Wide atmospheric shot of a glamorous casino blackjack floor. Multiple tables
in soft focus at various distances. Crystal chandeliers at regular intervals throwing
prismatic light. Chrome fixtures gleaming. Polished dark marble floor reflecting
overhead lights. Very subtle movement — a card sliding at a distant table, a chandelier
crystal swaying, bokeh lights shifting gently. The floor is alive with quiet luxury.

CAMERA: Very slow tracking (left to right, ~8 degrees over 6s). Background bokeh
shifts gently.
LIGHTING: Multiple chandeliers (3500K). Chrome reflections. Brighter and more
energetic than the poker ambient videos.
MOOD: The living casino floor. Glamour. Energy. Activity.
DURATION: 6 seconds (seamless loop — cross-fade last 0.5s into first 0.5s in post)
ASPECT: 16:9, 1024x576 (background resolution)
STYLE: Shallow to medium depth of field. The bokeh and subtle movement create a
living, breathing background. Distinctly brighter than Hold'em and Draw ambients.
```

---

## 9. Asset Inventory & Prompts — Blackjack Competitive

**9 assets** (8 gameplay + 1 ambient).

The competitive variant has a distinctly different energy — tighter, more intense, arena-style.

### `bjc_ante_up`

| Attribute | Value |
|-----------|-------|
| **Mode** | `overlay` |
| **Duration** | 1,500ms |
| **Blocks phase** | No |
| **Trigger** | Round begins (`BJC_PLACE_BETS`) |

```
PROMPT: Brief aggressive overlay: multiple chip stacks slam down simultaneously from
different directions — one from the left, one from the right — meeting in the centre
with an impact flash. The clash represents player-vs-player energy. The spotlight
narrows. The background is dark — arena darkness, not casino warmth. Red accent
lighting pulses on the impact.

CAMERA: Static. Chip stacks converge and impact centre-frame.
LIGHTING: Arena spotlight (3200K). Impact flash. Red accent pulse. Dark surrounding.
MOOD: "Ante up." Competitive. Gladiatorial. No friendly casino warmth here.
DURATION: 1.5 seconds
ASPECT: 16:9, 1920x1080
STYLE: Overlay-optimised. Aggressive, tight, percussive. The converging chip stacks
set the competitive tone immediately.
```

### `bjc_simultaneous_action`

| Attribute | Value |
|-----------|-------|
| **Mode** | `overlay` |
| **Duration** | 1,500ms |
| **Blocks phase** | No |
| **Trigger** | All players acting simultaneously (`BJC_PLAYER_TURNS`) |

```
PROMPT: Brief overlay: split-screen visual energy — the frame divides into segments
(one per player position) with bright dividing lines of light. Each segment pulses
independently, suggesting simultaneous decision-making. The spotlight tightens on each
segment. The effect is brief, punchy, and immediately communicates "everyone acts now."
Arena-dark background.

CAMERA: Static. Split-screen energy pulses.
LIGHTING: Arena spotlight (3200K). Bright dividing lines. Independent segment pulses.
MOOD: Simultaneous action. "All players — go!" Tournament urgency.
DURATION: 1.5 seconds
ASPECT: 16:9, 1920x1080
STYLE: Overlay-friendly. The split-screen visual echoes the game_select_blackjack_
competitive intro, creating visual continuity.
```

### `bjc_player_bust`

| Attribute | Value |
|-----------|-------|
| **Mode** | `overlay` |
| **Duration** | 2,000ms |
| **Blocks phase** | No |
| **Trigger** | Player busts in competitive mode (`BJC_PLAYER_TURNS`) |

```
PROMPT: Competitive bust overlay: cards shatter (similar to classic bust) but with
a more aggressive feel — the fragments are sharper, the darkness encroaches faster.
An arena spotlight snaps off, leaving a dark void where a player used to be. The
remaining spotlights tighten — fewer competitors, more intense. The competitive
framing transforms a loss into drama: "One down."

CAMERA: Static. Card shatter, spotlight snap-off.
LIGHTING: Spotlight extinguishing. Remaining spots tightening. Arena darkness.
MOOD: "One down." Competitive elimination. The field narrows.
DURATION: 2 seconds
ASPECT: 16:9, 1920x1080
STYLE: Overlay-optimised. More aggressive than classic bust. The spotlight
extinguishing is the signature competitive bust visual.
```

### `bjc_showdown`

| Attribute | Value |
|-----------|-------|
| **Mode** | `full_screen` |
| **Duration** | 3,000ms |
| **Blocks phase** | Yes |
| **Skippable** | Yes (after 1s) |
| **Trigger** | Showdown begins (`BJC_SHOWDOWN`) |

```
PROMPT: Full-screen competitive showdown. Multiple hands of cards sit face-down under
tight arena spotlights — one per player. A beat of tension. Then all hands flip
face-up simultaneously. The camera captures the synchronised reveal from a dramatic
low angle. As cards flip, each spotlight widens slightly. The moment hangs — who has
the best hand? Chrome table edges catch the spotlight. Dark arena surrounding. This
IS the showdown — the most important moment in Competitive Blackjack.

CAMERA: Low angle across the table. Slight push-in during the synchronised flip.
LIGHTING: Tight arena spotlights (3200K) on each hand. Widening on flip. Dark void
between positions. Chrome edge highlights.
MOOD: Ultimate tension release. Simultaneous reveal. Who wins?
DURATION: 3 seconds
ASPECT: 16:9, 1920x1080
STYLE: Full-screen cinematic. The simultaneous flip is the hero moment. Arena energy.
Distinctly more intense than any Classic Blackjack moment.
```

### `bjc_close_call`

| Attribute | Value |
|-----------|-------|
| **Mode** | `overlay` |
| **Duration** | 2,500ms |
| **Blocks phase** | No |
| **Trigger** | Winner determined by 1-point margin (`BJC_SETTLEMENT`) |

```
PROMPT: Tension overlay: two hands of cards, side by side, nearly identical in value.
A thin golden line separates them — barely visible, representing the razor-thin margin.
The winning side glows slightly brighter. Gold particles drift from the winner to
suggest the narrowest of victories. The effect is subtle and tense — acknowledging
how close it was.

CAMERA: Static. Side-by-side hands with subtle differential glow.
LIGHTING: Arena spotlight on both hands. Winner side slightly brighter. Thin gold
dividing line.
MOOD: "By a hair." Nail-biting margin. Respect for the closeness.
DURATION: 2.5 seconds
ASPECT: 16:9, 1920x1080
STYLE: Overlay-friendly. Restrained. The subtlety of the margin IS the drama.
```

### `bjc_natural_winner`

| Attribute | Value |
|-----------|-------|
| **Mode** | `overlay` |
| **Duration** | 3,000ms |
| **Blocks phase** | No |
| **Trigger** | Winner has natural 21 (`BJC_SETTLEMENT`) |

```
PROMPT: Premium competitive celebration: an Ace and face card pulse with golden
arena-style lighting. A spotlight narrows dramatically onto the winning hand while
all other positions darken. Gold particles cascade from the spotlight. The effect is
a competitive version of the classic natural blackjack — same elation but with the
arena's isolating spotlight treatment. The winner is the only lit element.

CAMERA: Static. Spotlight narrowing onto winner.
LIGHTING: Arena spotlight isolating winner (3200K). All other positions dark. Gold
particles in the spotlight cone.
MOOD: Dominance. "Natural 21 takes it." The best hand wins the arena.
DURATION: 3 seconds
ASPECT: 16:9, 1920x1080
STYLE: Overlay-optimised. Arena isolation spotlight is the signature technique.
```

### `bjc_last_standing`

| Attribute | Value |
|-----------|-------|
| **Mode** | `overlay` |
| **Duration** | 3,000ms |
| **Blocks phase** | No |
| **Trigger** | All other players busted, sole survivor wins (`BJC_SETTLEMENT`) |

```
PROMPT: Dramatic competitive overlay: all spotlights except one have been extinguished.
The sole remaining spotlight holds steady on the surviving player's hand. The surrounding
darkness is absolute. The lone spotlight slowly widens, claiming more of the frame — the
survivor expands into the void left by the eliminated. Gold particles drift in the
spotlight cone. The effect says "Last one standing — the arena is yours."

CAMERA: Static. Single spotlight widening in darkness.
LIGHTING: Single arena spotlight (3200K) gradually widening. All else dark. Gold
particles.
MOOD: Sole survivor. "Last one standing." Gladiatorial triumph.
DURATION: 3 seconds
ASPECT: 16:9, 1920x1080
STYLE: Overlay-friendly. The expanding spotlight into darkness is visually powerful
and unique to the competitive mode.
```

### `bjc_big_pot`

| Attribute | Value |
|-----------|-------|
| **Mode** | `overlay` |
| **Duration** | 3,000ms |
| **Blocks phase** | No |
| **Trigger** | Pot >= 400 chips (`BJC_SETTLEMENT`) |

```
PROMPT: Competitive big pot overlay: chips from multiple directions converge on a
central point with aggressive energy — not raining down gently but sliding in fast
from all sides, representing the collective ante of all competitors. Impact flashes
where chips converge. The arena spotlight flares on the central pot. The winner's
direction is highlighted with a gold trail as chips then redirect toward them.

CAMERA: Static. Chips converge from all directions, then redirect.
LIGHTING: Arena spotlight flare. Impact flashes at convergence. Gold trail to winner.
MOOD: "Winner takes all." Competitive pot collection. Aggressive satisfaction.
DURATION: 3 seconds
ASPECT: 16:9, 1920x1080
STYLE: Overlay-optimised. More aggressive chip motion than Classic Blackjack — chips
converge rather than cascade. Arena energy.
```

### `bjc_ambient_arena`

| Attribute | Value |
|-----------|-------|
| **Mode** | `background` |
| **Duration** | Indefinite (loop) |
| **Blocks phase** | No |
| **Trigger** | Active during all Competitive Blackjack phases |

```
PROMPT: A single blackjack table isolated by darkness, lit by a tight overhead
spotlight. The table surface — dark felt, brushed steel edges — is the only visible
element. Faint rim lights outline the player positions. The spotlight has a slight
atmospheric haze, creating a visible cone of light with dust motes. The surrounding
darkness is absolute. Very subtle motion — the dust motes, a faint flicker in the
rim lights. Tournament arena atmosphere. No glamour, no luxury — pure competition.

CAMERA: Static with imperceptible drift (~2% over 6s).
LIGHTING: Tight overhead spotlight (3200K). Faint rim lights on player positions.
Visible light cone through atmospheric haze. Surrounding darkness.
MOOD: Arena. Focused. Intense. "This is where it's decided."
DURATION: 6 seconds (seamless loop — cross-fade last 0.5s into first 0.5s in post)
ASPECT: 16:9, 1024x576 (background resolution)
STYLE: High contrast. Minimal elements. The darkness and isolation create intensity
that's distinctly different from Classic Blackjack's glamorous floor.
```

---

## 10. Integration Notes

### 10.1 Display Rendering Architecture

The Display uses a 3-layer rendering stack (per Game Design Doc Section 21):

```
Layer 3 (top):    Full-screen / Transition video     z-index: 100
                  OR
                  Overlay video                       z-index: 50

Layer 2 (middle): React Three Fiber 3D scene          z-index: 1

Layer 1 (bottom): Background video                    z-index: 0
```

### 10.2 Video Format & Encoding

| Attribute | Full-Screen / Transition | Overlay | Background |
|-----------|------------------------|---------|------------|
| **Format** | MP4 (H.264 High) | MP4 (H.264 Main) | MP4 (H.264 Baseline) |
| **Fallback** | WebM (VP9) | WebM (VP9) | WebM (VP9) |
| **Resolution** | 1920x1080 | 1920x1080 | 1024x576 |
| **Bitrate** | 8 Mbps | 6 Mbps | 4 Mbps |
| **Audio** | None | None | None |
| **Colour space** | Rec. 709 / sRGB | Rec. 709 / sRGB | Rec. 709 / sRGB |

All video assets are **silent** — audio cues are handled via Web Audio API for precise synchronisation.

### 10.3 File Size Budget

**Total budget: ~81 MB compressed (target: <= 85 MB)**

| Category | Count | Avg Size | Subtotal |
|----------|-------|----------|----------|
| Full-screen / transition (3-8s) | 14 | 3 MB | ~42 MB |
| Overlay (1.5-3s) | 33 | 1 MB | ~33 MB |
| Background loops (6s) | 4 | 1.5 MB | ~6 MB |
| **Total** | **51** | | **~81 MB** |

### 10.4 Preloading Strategy

Aligned with Game Design Doc Section 27:

```
On app launch:          casino_intro
On lobby:               game_select_{all four}
On game enter:          Ambient background + likely first overlays for that game
Phase-aware preload:    Next-likely celebration/overlay based on current game state
```

### 10.5 Fallback Behaviour

Per Game Design Doc Section 21:
1. If video fails to load: `videoPlayback.completed = true` immediately
2. Phase advances as if video played
3. No error shown to player — silent degradation
4. Server-side error logging

### 10.6 Looping

| Asset Type | Loop | Post-Production |
|------------|------|-----------------|
| Background ambient (4 assets) | Yes | Cross-fade last 0.5s into first 0.5s |
| All other assets (45 assets) | No | One-shot playback |

---

## 11. Production Pipeline

### 11.1 Workflow

```
1. PROMPT       Use the prompts from this document
2. GENERATE     Submit to Nano Banana Pro at 1080p (or 576p for backgrounds)
3. REVIEW       Check: visual quality, motion coherence, mood, playback mode suitability
4. ITERATE      Up to 3 generations per asset
5. POST-PROCESS DaVinci Resolve / After Effects:
                - Colour grade to per-game palette (Section 3)
                - Add cross-fade for loops (0.5s overlap)
                - Trim to exact duration
                - Overlay assets: ensure dark/transparent regions composite cleanly
                - Vignette (offset: 0.3, darkness: 0.4-0.65)
                - Film grain for 5-Card Draw assets only (8-12%)
                - Black leader (0.1s) for full-screen/transition assets
6. ENCODE       MP4 H.264 + WebM VP9 fallback. Bitrates per Section 10.2
7. TEST         Verify in Chrome, Safari, Firefox. Test on GameLift Streams at 1080p60.
```

### 11.2 Overlay Production Checklist

Overlays need special care since they composite over live gameplay:

- [ ] Visual interest concentrated in top third or corners
- [ ] Lower half of frame has minimal visual content
- [ ] Dark/neutral background that blends with the game scene
- [ ] No camera movement that fights the game's static camera
- [ ] Brief and punchy — does not overstay its welcome
- [ ] Tested composited over a screenshot of the actual game scene

### 11.3 Quality Checklist (All Assets)

- [ ] Resolution matches specification
- [ ] Duration matches game design doc (within 0.2s)
- [ ] Asset key matches game design doc Section 27 exactly
- [ ] Colour palette aligns with per-game identity (Section 3)
- [ ] Playback mode (full_screen/overlay/background/transition) accounted for in framing
- [ ] No AI artefacts (morphing, flickering, temporal inconsistency)
- [ ] Camera movement smooth and deliberate
- [ ] Mood matches intended emotional beat
- [ ] File size within budget
- [ ] Loops seamless (background assets only)
- [ ] Plays correctly in Chrome, Safari, Firefox
- [ ] Tested on GameLift Streams at 1080p

### 11.4 Asset Directory Structure

```
public/
  video/
    shared/
      casino_intro.mp4
      casino_outro.mp4
      game_select_holdem.mp4
      game_select_five_card_draw.mp4
      game_select_blackjack_classic.mp4
      game_select_blackjack_competitive.mp4
      game_transition.mp4
    holdem/
      holdem_first_hand.mp4
      holdem_showdown_reveal.mp4
      holdem_big_pot.mp4
      holdem_royal_flush.mp4
      holdem_straight_flush.mp4
      holdem_four_of_a_kind.mp4
      holdem_player_busted.mp4
      holdem_all_in_runout.mp4
      holdem_ambient_table.mp4
    draw/
      draw_dealing_cinematic.mp4
      draw_the_draw.mp4
      draw_showdown_reveal.mp4
      draw_royal_flush.mp4
      draw_straight_flush.mp4
      draw_four_of_a_kind.mp4
      draw_big_hand.mp4
      draw_stand_pat.mp4
      draw_going_deep.mp4
      draw_ambient_parlour.mp4
    blackjack/
      bj_place_bets_prompt.mp4
      bj_deal_cinematic.mp4
      bj_natural_blackjack.mp4
      bj_insurance_dramatic.mp4
      bj_double_down_bold.mp4
      bj_split_action.mp4
      bj_player_bust.mp4
      bj_twenty_one.mp4
      bj_hole_card_reveal.mp4
      bj_dealer_bust.mp4
      bj_dealer_blackjack.mp4
      bj_big_win.mp4
      bj_side_bet_win.mp4
      bj_perfect_pair.mp4
      bj_suited_triple.mp4
      bj_ambient_table.mp4
    blackjack-competitive/
      bjc_ante_up.mp4
      bjc_simultaneous_action.mp4
      bjc_player_bust.mp4
      bjc_showdown.mp4
      bjc_close_call.mp4
      bjc_natural_winner.mp4
      bjc_last_standing.mp4
      bjc_big_pot.mp4
      bjc_ambient_arena.mp4
```

---

## 12. Asset Key Cross-Reference

Exact match against Game Design Document Section 27 registry.

### Shared (7 assets)

| # | Asset Key | Mode | Duration | Prompt |
|---|-----------|------|----------|--------|
| 1 | `casino_intro` | full_screen | 8,000ms | Section 5 |
| 2 | `casino_outro` | full_screen | 6,000ms | Section 5 |
| 3 | `game_select_holdem` | transition | 4,000ms | Section 5 |
| 4 | `game_select_five_card_draw` | transition | 4,000ms | Section 5 |
| 5 | `game_select_blackjack_classic` | transition | 4,000ms | Section 5 |
| 6 | `game_select_blackjack_competitive` | transition | 4,000ms | Section 5 |
| 7 | `game_transition` | transition | 3,000ms | Section 5 |

### Texas Hold'em (9 assets)

| # | Asset Key | Mode | Duration | Prompt |
|---|-----------|------|----------|--------|
| 8 | `holdem_first_hand` | overlay | 3,000ms | Section 6 |
| 9 | `holdem_showdown_reveal` | overlay | 2,000ms | Section 6 |
| 10 | `holdem_big_pot` | overlay | 3,000ms | Section 6 |
| 11 | `holdem_royal_flush` | full_screen | 5,000ms | Section 6 |
| 12 | `holdem_straight_flush` | full_screen | 4,000ms | Section 6 |
| 13 | `holdem_four_of_a_kind` | overlay | 3,000ms | Section 6 |
| 14 | `holdem_player_busted` | overlay | 2,500ms | Section 6 |
| 15 | `holdem_all_in_runout` | overlay | 2,000ms | Section 6 |
| 16 | `holdem_ambient_table` | background | loop | Section 6 |

### 5-Card Draw (10 assets)

| # | Asset Key | Mode | Duration | Prompt |
|---|-----------|------|----------|--------|
| 17 | `draw_dealing_cinematic` | overlay | 2,000ms | Section 7 |
| 18 | `draw_the_draw` | overlay | 1,500ms | Section 7 |
| 19 | `draw_showdown_reveal` | overlay | 2,000ms | Section 7 |
| 20 | `draw_royal_flush` | full_screen | 5,000ms | Section 7 |
| 21 | `draw_straight_flush` | full_screen | 4,000ms | Section 7 |
| 22 | `draw_four_of_a_kind` | overlay | 3,000ms | Section 7 |
| 23 | `draw_big_hand` | overlay | 2,500ms | Section 7 |
| 24 | `draw_stand_pat` | overlay | 1,500ms | Section 7 |
| 25 | `draw_going_deep` | overlay | 1,500ms | Section 7 |
| 26 | `draw_ambient_parlour` | background | loop | Section 7 |

### Blackjack Classic (16 assets)

| # | Asset Key | Mode | Duration | Prompt |
|---|-----------|------|----------|--------|
| 27 | `bj_place_bets_prompt` | overlay | 1,500ms | Section 8 |
| 28 | `bj_deal_cinematic` | overlay | 2,000ms | Section 8 |
| 29 | `bj_natural_blackjack` | overlay | 3,000ms | Section 8 |
| 30 | `bj_insurance_dramatic` | overlay | 2,000ms | Section 8 |
| 31 | `bj_double_down_bold` | overlay | 1,500ms | Section 8 |
| 32 | `bj_split_action` | overlay | 1,500ms | Section 8 |
| 33 | `bj_player_bust` | overlay | 2,000ms | Section 8 |
| 34 | `bj_twenty_one` | overlay | 2,000ms | Section 8 |
| 35 | `bj_hole_card_reveal` | overlay | 2,500ms | Section 8 |
| 36 | `bj_dealer_bust` | overlay | 3,000ms | Section 8 |
| 37 | `bj_dealer_blackjack` | overlay | 2,500ms | Section 8 |
| 38 | `bj_big_win` | full_screen | 4,000ms | Section 8 |
| 39 | `bj_side_bet_win` | overlay | 2,500ms | Section 8 |
| 40 | `bj_perfect_pair` | overlay | 3,000ms | Section 8 |
| 41 | `bj_suited_triple` | full_screen | 5,000ms | Section 8 |
| 42 | `bj_ambient_table` | background | loop | Section 8 |

### Blackjack Competitive (9 assets)

| # | Asset Key | Mode | Duration | Prompt |
|---|-----------|------|----------|--------|
| 43 | `bjc_ante_up` | overlay | 1,500ms | Section 9 |
| 44 | `bjc_simultaneous_action` | overlay | 1,500ms | Section 9 |
| 45 | `bjc_player_bust` | overlay | 2,000ms | Section 9 |
| 46 | `bjc_showdown` | full_screen | 3,000ms | Section 9 |
| 47 | `bjc_close_call` | overlay | 2,500ms | Section 9 |
| 48 | `bjc_natural_winner` | overlay | 3,000ms | Section 9 |
| 49 | `bjc_last_standing` | overlay | 3,000ms | Section 9 |
| 50 | `bjc_big_pot` | overlay | 3,000ms | Section 9 |
| 51 | `bjc_ambient_arena` | background | loop | Section 9 |

**Total: 51 assets.** This is the canonical count per `docs/CANONICAL-DECISIONS.md` D-012. All 51 asset keys listed above have corresponding prompts in this document.

---

## Summary

| Category | Shared | Hold'em | Draw | BJ Classic | BJ Competitive | Total |
|----------|--------|---------|------|------------|----------------|-------|
| Full-screen | 2 | 2 | 2 | 2 | 1 | **9** |
| Transition | 5 | 0 | 0 | 0 | 0 | **5** |
| Overlay | 0 | 6 | 7 | 13 | 7 | **33** |
| Background | 0 | 1 | 1 | 1 | 1 | **4** |
| **Total** | **7** | **9** | **10** | **16** | **9** | **51** |

**Estimated compressed size: ~75-80 MB**
**Per-game lazy load: ~10-20 MB per game + ~18 MB shared**

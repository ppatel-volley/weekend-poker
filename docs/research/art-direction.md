# Art Direction Document — Weekend Poker

> Voice-Controlled 3D Texas Hold'em for Smart TV / Fire TV

---

## Table of Contents

1. [Visual Style Guide](#1-visual-style-guide)
2. [Complete Asset List](#2-complete-asset-list)
3. [Meshy.AI Prompts](#3-meshyai-prompts)
4. [Nano Banana Video Prompts](#4-nano-banana-video-prompts)
5. [UI/UX Visual Direction](#5-uiux-visual-direction)

---

## 1. Visual Style Guide

### 1.1 Target Aesthetic

**Premium Realism** — the look of a private high-stakes poker room in a luxury casino hotel. Think polished mahogany, soft green baize, brushed-brass chip rails, low-hanging pendant lights casting warm pools on the table while the rest of the room falls into moody shadow. The goal is console-quality fidelity delivered through React Three Fiber and Three.js on Smart TV hardware.

**Reference titles:**
- **Poker Club** — Ultra HD 4K with ray tracing, multiple themed venues ranging from basement parlours to arena stages. Our closest visual target for environment quality and cinematic camera work.
- **Prominence Poker** — Unreal Engine, noir-tinged atmosphere, gritty themed locations, strong character customisation. We borrow the moody, adult tone but elevate the material quality.
- **World Series of Poker (console)** — broadcast-TV presentation, clean HUD overlays, dramatic chip-toss animations. We reference the broadcast-style camera cuts and UI legibility.

### 1.2 Lighting Approach

The lighting rig is the single most important element for establishing the premium feel. Every scene uses a **three-tier lighting model**:

| Tier | Purpose | Implementation |
|------|---------|----------------|
| **Key light** | Warm overhead pendant (2700 K–3200 K) focused on the table felt | `SpotLight` with soft penumbra, shadow-map at 1024 px |
| **Rim / accent** | Cool-edge highlights (5500 K) on chip stacks, glass, and card edges | Pair of `DirectionalLight` at steep rake angles, low intensity |
| **Ambient fill** | Deep, warm ambient to lift shadow areas just enough | `HemisphereLight` (warm ground, cool sky) + HDRI environment map at low `envMapIntensity: 0.15` |

**HDRI Environment Map:**
- **Source:** Poly Haven — use the "Studio Small 09" HDRI (warm interior studio lighting, CC0 licence). URL: `https://polyhaven.com/a/studio_small_09`
- **Resolution:** 256 px (1K is overkill for ambient-only use; 256 px saves ~4 MB VRAM)
- **Format:** HDR compressed to KTX2 via `@pmndrs/assets` pipeline or manual Basis compression
- **Colour space:** The HDRI must be loaded in linear colour space (`SRGBColorSpace` is applied at output by the renderer's `outputColorSpace` setting, NOT on input textures). All PBR albedo/diffuse textures are authored in sRGB and tagged accordingly; all normal, roughness, metalness, and AO maps are linear.
- **Usage:** Set via R3F `<Environment files="studio_small_09_256.hdr" />` — provides soft reflections on metallic and glass surfaces without needing additional fill lights.

**Specific effects:**
- **Volumetric haze** — subtle dust-mote / cigar-smoke effect achieved via a translucent particle plane in front of the key light. Keeps draw calls low while selling atmosphere.
- **Bloom** — gentle bloom on metallic chip highlights and glass reflections. Post-processing via `@react-three/postprocessing` `Bloom` pass. **Exact parameters:** `luminanceThreshold: 0.8`, `intensity: 0.35`, `radius: 0.6`, `levels: 4`. These values keep the bloom subtle — only the brightest metallic and glass highlights catch it, avoiding the washed-out look.
- **Vignette** — slight darkening at screen edges to focus the eye on the table centre. **Exact parameters:** `offset: 0.3`, `darkness: 0.65`. This produces a gentle falloff that's noticeable but not theatrical.
- **Tone mapping** — `ACESFilmicToneMapping` on the `WebGLRenderer` with `outputColorSpace: SRGBColorSpace`. ACES filmic gives a cinematic roll-off on highlights and slightly lifted shadows, which sells the moody lighting without crushing blacks.
- **Shadow quality** — soft shadows from the pendant light; contact shadows under chips and cards via baked ambient occlusion in textures rather than real-time AO (performance saving for Smart TV).

### 1.3 Material Quality (PBR)

All materials use `MeshStandardMaterial` or `MeshPhysicalMaterial` with proper PBR maps:

| Material | Colour | Roughness | Metalness | Notes |
|----------|--------|-----------|-----------|-------|
| **Table felt** | Deep racing green (#1B4D2E) | 0.85–0.90 | 0.0 | Subtle fibre normal map; no specularity |
| **Table rail (padded)** | Dark cognac leather (#5C3A1E) | 0.55 | 0.0 | Leather grain normal map; slight sheen |
| **Table rim (wood)** | Rich mahogany (#4A1C0A) | 0.35 | 0.0 | Clear-coat layer for lacquer via `MeshPhysicalMaterial.clearcoat` |
| **Chip body** | Per denomination (see 2.2) | 0.25 | 0.0 | Clay/ceramic base; matte with edge wear |
| **Chip inlay** | Metallic foil per denomination | 0.15 | 0.85 | Brushed-metal normal map |
| **Cards** | White (#F5F2ED) | 0.40 | 0.0 | Linen-embossed normal map; slight flex deformation on deal |
| **Card backs** | Deep burgundy (#6B1D2A) + gold pattern | 0.35 | 0.0 | Gold foil areas use metalness 0.8 |
| **Brass accents** | Antique brass (#C9A84C) | 0.25 | 0.90 | Aged patina via roughness map variation |
| **Glass (whisky tumbler)** | Clear with amber tint | 0.05 | 0.0 | `MeshPhysicalMaterial` with `transmission: 0.95`, `thickness: 2` |
| **Room walls** | Dark charcoal plaster (#2A2A2E) | 0.75 | 0.0 | Subtle stucco normal map |
| **Floor** | Dark walnut hardwood (#3B2413) | 0.40 | 0.0 | Plank normal + AO map |
| **Ceiling** | Near-black (#1A1A1D) | 0.90 | 0.0 | Largely invisible; absorbs light |

### 1.4 Colour Palette

```
Primary:
  Racing Green    #1B4D2E   (felt, brand accent)
  Mahogany        #4A1C0A   (wood trim)
  Antique Brass   #C9A84C   (metal accents, UI highlights)

Secondary:
  Cognac Leather  #5C3A1E   (rail padding, warm tones)
  Burgundy        #6B1D2A   (card backs, deep accents)
  Charcoal        #2A2A2E   (walls, shadow areas)

Neutrals:
  Ivory           #F5F2ED   (card faces, text)
  Near-Black      #1A1A1D   (ceiling, deep shadows)
  Warm Grey       #4A4845   (secondary text, dividers)

Chip denominations:
  $5     White      #E8E4DC
  $25    Red        #C23B22
  $100   Black      #1C1C1C
  $500   Purple     #6B2D8B
  $1000  Gold       #D4A843
```

### 1.5 Environment Design

**Setting:** An upscale private poker room — not a vast casino floor. The intimate scale keeps draw calls manageable and the atmosphere concentrated.

**Room layout:**
- Octagonal or softly rounded room, roughly 8 m diameter
- Single poker table centre-stage
- 4 leather club chairs (our max player count)
- Dark panelled walls with subtle art-deco moulding
- A drinks cabinet / sideboard along one wall (atmospheric set dressing)
- Low pendant light cluster directly above the table
- Floor-to-ceiling window on one wall with heavy drapes drawn mostly shut, allowing a sliver of city-lights bokeh to bleed in
- Subtle ceiling coffers lost in shadow

**Atmosphere props (non-interactive):**
- Crystal whisky decanter + tumblers on the sideboard
- Cigar in an ashtray (wisps of smoke particle)
- A framed vintage poker-tournament poster
- Velvet rope barrier at the room entrance

### 1.6 Camera Angles and Movements

All camera work is managed via **Theatre.js** keyframe sequences:

| Shot | Description | Use |
|------|-------------|-----|
| **Table overview** | Slightly elevated 45-degree bird's-eye, centred on pot | Default gameplay view |
| **Player close-up** | Over-the-shoulder, shallow DoF on player's hole cards | Card peek / decision moment |
| **Chip push** | Low angle tracking shot following chips sliding to pot | Bet / raise confirmation |
| **Dealer focal** | Medium shot of dealer position, cards fanning out | Deal sequence |
| **Showdown orbit** | Slow 180-degree orbit around the table as community cards reveal | River reveal / showdown drama |
| **Winner celebration** | Pull-back dolly from winner's stack, slight upward tilt | Hand win |
| **Ambient idle** | Very slow drift / breathing camera on the overview | Idle / menu |

**Transitions:** All cuts use 0.4 s ease-in-out interpolation. No hard cuts during gameplay — smooth lerps only. Theatre.js sequences can be pre-authored and triggered by game-state events.

---

## 2. Complete Asset List

### 2.1 Table and Furniture

| # | Asset | Poly Budget | Texture Res | Notes |
|---|-------|-------------|-------------|-------|
| 1 | Poker table (oval, 4-seat) | 3,000–5,000 | 2048 px | Felt top, padded rail, mahogany rim, brass cup holders |
| 2 | Leather club chair (x4) | 2,000–3,000 each | 1024 px | Cognac leather, tufted back, brass stud trim |
| 3 | Dealer position marker | 200–400 | 512 px | Brass "DEALER" button |
| 3a | Small Blind marker (SB) | 100–200 | 256 px | Smaller brass disc, engraved "SB", sits at small-blind seat |
| 3b | Big Blind marker (BB) | 100–200 | 256 px | Smaller brass disc, engraved "BB", sits at big-blind seat |

### 2.2 Chips

| # | Asset | Poly Budget | Texture Res | Notes |
|---|-------|-------------|-------------|-------|
| 4 | Chip — $5 (white) | 300–500 | 512 px | Clay body, metallic foil inlay, edge ridges |
| 5 | Chip — $25 (red) | 300–500 | 512 px | Same mesh, different texture |
| 6 | Chip — $100 (black) | 300–500 | 512 px | Same mesh, different texture |
| 7 | Chip — $500 (purple) | 300–500 | 512 px | Same mesh, different texture |
| 8 | Chip — $1,000 (gold) | 300–500 | 512 px | Same mesh, different texture |
| 9 | Chip stack (x5, x10, x20) | Instanced | — | Instanced rendering of single chip mesh |

### 2.3 Cards

| # | Asset | Poly Budget | Texture Res | Notes |
|---|-------|-------------|-------------|-------|
| 10 | Playing card (single) | 100–200 | 1024 px | Thin box with rounded corners; 52 face textures + 1 back texture packed into atlas |
| 11 | Card deck (stacked) | 400–600 | 512 px | Static prop for dealer position |
| 11a | Card shoe / deck holder | 300–500 | 512 px | Brass-trimmed wooden card shoe; deck sits inside, cards drawn from the front slot |
| 11b | Burn card pile / muck area | 100–200 | 256 px | Small face-down discard pile next to the shoe; 2–3 cards stacked loosely |

### 2.4 Dealer

| # | Asset | Poly Budget | Texture Res | Notes |
|---|-------|-------------|-------------|-------|
| 12 | Dealer avatar (upper body) | 8,000–12,000 | 2048 px | Professional attire: waistcoat, white shirt, bow tie. Visible from chest up. Rigged for arm/hand dealing animations and head tracking. T-pose for rigging. |
| 13 | Dealer hands (detailed) | 2,000–3,000 | 1024 px | Separate high-detail hand mesh for close-up dealing shots; ring on pinky finger for character. **Fallback sourcing:** Realistic hands are notoriously difficult for AI generation. If Meshy output is unsatisfactory, source a pre-made rigged hand model from Sketchfab (e.g., "Realistic Male Hand" by Lassi Kaukonen) or TurboSquid (search "rigged male hand PBR game-ready"), budget ~$20–50 for a marketplace asset. Retopologise in Blender to hit poly budget. |

### 2.5 Player Representations

| # | Asset | Poly Budget | Texture Res | Notes |
|---|-------|-------------|-------------|-------|
| 14 | Player avatar frame (x4 styles) | 500–800 each | 512 px | 3D picture-frame style badge sitting at each seat; holds a 2D avatar portrait texture. Brass, silver, bronze, obsidian variants. |
| 15 | Empty seat placeholder | 300–500 | 512 px | "Reserved" placard or silhouette on the chair |

### 2.6 Environment — Room

| # | Asset | Poly Budget | Texture Res | Notes |
|---|-------|-------------|-------------|-------|
| 16 | Room shell (walls, floor, ceiling) | 1,000–2,000 | 2048 px (tiling) | Dark panelled walls, walnut floor, cofferred ceiling |
| 17 | Pendant light fixture (x3) | 400–600 each | 512 px | Brass + frosted glass; emissive material for glow |
| 18 | Wall sconce (x4) | 200–300 each | 512 px | Brass art-deco, warm glow |
| 19 | Window with drapes | 800–1,200 | 1024 px | Heavy velvet drapes, city-bokeh backplate texture behind glass |
| 20 | Drinks cabinet / sideboard | 1,500–2,500 | 1024 px | Dark wood, glass doors, brass handles |
| 21 | Door / entrance frame | 600–800 | 1024 px | Double doors, dark wood + brass hardware |

### 2.7 Environment — Decorative Props

| # | Asset | Poly Budget | Texture Res | Notes |
|---|-------|-------------|-------------|-------|
| 22 | Whisky decanter | 500–800 | 512 px | Crystal glass, amber liquid |
| 23 | Whisky tumbler (x2) | 200–400 each | 512 px | Crystal glass, ice cubes |
| 24 | Cigar in ashtray | 300–500 | 512 px | Brass ashtray, lit cigar |
| 25 | Framed poster (x2) | 100–200 each | 512 px | Vintage poker tournament art |
| 26 | Velvet rope barrier | 400–600 | 512 px | Brass stanchions, red velvet rope |
| 27 | Decorative rug (under table) | 100–200 | 1024 px | Persian-style, muted tones; flat plane with texture |

### 2.8 Particle and Visual Effects

| # | Asset | Type | Notes |
|---|-------|------|-------|
| 28 | Cigar smoke wisps | Particle system | Translucent sprites, slow upward drift, 10–20 particles |
| 29 | Chip toss trail | Particle burst | Small streak particles on chip slide; 0.3 s lifetime |
| 30 | Card deal whoosh | Sprite trail | Thin speed-line trailing card during deal animation |
| 31 | Win celebration | Particle shower | Gold sparkle particles raining down on winner; 2 s burst |
| 32 | Ambient dust motes | Particle plane | Slow-drifting particles in light beam; constant, low count |
| 33 | UI glow pulse | Shader effect | Emission pulse ring around active player seat |

### 2.9 UI Elements in 3D Space

| # | Asset | Poly Budget | Notes |
|---|-------|-------------|-------|
| 34 | Pot chip pile (centre table) | Instanced chips | Visual representation of current pot; scales with amount |
| 35 | Bet amount placard | 300–400 | Brass-framed number display at each seat |
| 36 | Voice command indicator | 200–300 | Floating mic icon / sound-wave ring above active speaker |
| 37 | Dealer speech bubble | 400–600 | Art-deco styled speech panel near dealer; text rendered on texture |
| 38 | Timer arc | Shader | Ring shader around active player frame; depletes as time runs |
| 39 | Side pot chip pile | Instanced chips | Separate smaller chip pile offset from the main pot; appears only during side-pot scenarios (all-in with unequal stacks). Brass placard label shows "Side Pot: $X". Up to 2 side pots max. |
| 40 | Side pot placard | 300–400 | Smaller variant of #35, labelled "SIDE POT", positioned above side pot pile |

**Total estimated poly budget:** ~60,000–85,000 triangles for the full scene (well within Smart TV WebGL limits).

---

## 3. Meshy.AI Prompts

> **Prompt philosophy:** Start with a clear, concrete subject. Add 3–5 specific descriptors for material, colour, and style. Avoid abstract language, particle effects (smoke, sparkle), and excessive adjective stacking. Request "game asset" or "low poly" style where polygon budget matters. Use "A-pose" or "T-pose" for rigged characters.

> **Refine Prompt toggle:** Meshy offers a "Refine Prompt" option that rewrites your input before generation. **Use Refine Prompt ON for all props and environment assets** (it helps add detail and structure). **Use Refine Prompt OFF for the dealer character** (#12) — the rewriter tends to over-elaborate character prompts, adding unwanted accessories or altering proportions. For characters, your hand-crafted prompt gives more predictable results.

> **Texture re-baking note:** Meshy outputs textures at its own internal resolution (typically 1024 px or 2048 px). These will often need **re-baking in Blender** to hit our target resolutions cleanly — especially for assets where we specify 512 px or 256 px targets. Re-bake the diffuse, roughness, metalness, and normal maps onto clean UV layouts after retopology. Export the re-baked textures as PNG, then compress to KTX2/Basis for production.

### 3.1 Table and Furniture

**#1 — Poker Table**
```
Oval poker table for four players, premium casino quality. Dark mahogany wood rim with clear lacquer finish, racing green felt playing surface, cognac brown padded leather armrest rail with brass stud trim. Four brass cup holders recessed into the rail. Solid pedestal base. Clean, realistic, game asset, PBR materials.
```
*Art direction: 2048 textures. Ensure the felt area is a single clean surface for easy UV mapping. Request FBX export.*

**#2 — Leather Club Chair**
```
Classic leather club armchair, tufted back, cognac brown leather upholstery, brass nailhead trim along the arms and seat edge. Short dark walnut wood legs. Luxurious, realistic, slightly worn patina, game asset, PBR materials.
```
*Art direction: Generate once, instance four times in scene. 1024 textures.*

**#3 — Dealer Button**
```
Small round brass dealer button, engraved text "DEALER" on top face, polished metallic surface, bevelled edge, 3 cm diameter disc. Realistic, game prop, PBR materials.
```

**#3a — Small Blind Marker**
```
Small round brass disc, slightly smaller than a poker chip, engraved text "SB" on top face, brushed brass metallic finish, thin profile. Realistic, game prop, PBR materials.
```

**#3b — Big Blind Marker**
```
Small round brass disc, slightly smaller than a poker chip, engraved text "BB" on top face, brushed brass metallic finish, thin profile. Realistic, game prop, PBR materials.
```

### 3.2 Chips

> All five chip denominations share the same base mesh. Generate one chip model, then swap textures per denomination.

**#4–8 — Poker Chip (base mesh)**
```
Single casino poker chip, clay ceramic body with fine ridged edges, circular metallic foil inlay on top and bottom faces. Clean cylindrical shape, standard 39mm diameter proportion. Realistic, detailed edge texture, game asset, PBR materials.
```
*Art direction: Generate as a white/neutral chip. Create denomination colour variants as texture swaps in engine. 512 textures.*

### 3.3 Cards

**#10 — Playing Card**
```
Single rectangular playing card, standard poker size proportion, white face with very slightly rounded corners, thin profile. Linen-embossed subtle texture on the surface. Clean, minimal, realistic, game asset.
```
*Art direction: Very low poly (100–200 tris). Face textures will be an atlas applied in engine. 1024 atlas texture.*

**#11 — Card Deck Stack**
```
Neatly stacked deck of playing cards, 52 cards piled precisely, burgundy red card backs with gold geometric pattern visible on the top card. Slight edge bevel showing the stack layers. Realistic, game prop.
```

**#11a — Card Shoe / Deck Holder**
```
Wooden card shoe dealer accessory, dark walnut wood body with brass trim along the top edges, open front slot for drawing cards, holds a full deck of cards inside. Compact rectangular box shape. Realistic, casino equipment, game prop, PBR materials.
```

**#11b — Burn Card Pile / Muck Area**
```
Small pile of three playing cards face-down, slightly fanned and overlapping casually, burgundy card backs with gold pattern. Resting flat on a surface. Realistic, game prop.
```
*Art direction: Very simple geometry. Can also be achieved by instancing the single card model (#10) with slight rotation offsets in engine.*

### 3.4 Dealer

**#12 — Dealer Avatar (upper body)**
```
Male casino dealer character, upper body from waist up, T-pose for rigging. Wearing dark charcoal waistcoat over crisp white dress shirt with rolled-up sleeves, black bow tie, neat short dark hair, clean shaven, professional and composed expression. Realistic proportions, game character, PBR materials.
```
*Art direction: 8,000–12,000 tris. T-pose is critical for Meshy's auto-rigging + animation library. 2048 textures. May need manual retopology in Blender for clean animation deformation.*

**#13 — Dealer Hands (detailed)**
```
Pair of realistic male human hands, fingers slightly spread, palms down, detailed knuckle and nail definition. One hand wears a small silver pinky ring. Realistic skin material, game asset, PBR materials.
```
*Art direction: Separate asset for close-up dealing shots. 1024 textures. Will be animated independently.*

### 3.5 Player Representations

**#14a — Player Avatar Frame (Brass)**
```
Small ornate picture frame, rectangular with rounded corners, polished brass metal, art-deco style border engraving, empty centre opening for portrait image. Approximately 10cm tall proportion. Realistic, game prop, PBR materials.
```

**#14b — Player Avatar Frame (Silver)**
```
Small ornate picture frame, rectangular with rounded corners, brushed silver metal, art-deco style border engraving, empty centre opening for portrait image. Approximately 10cm tall proportion. Realistic, game prop, PBR materials.
```

**#14c — Player Avatar Frame (Bronze)**
```
Small ornate picture frame, rectangular with rounded corners, aged bronze metal with patina, art-deco style border engraving, empty centre opening for portrait image. Approximately 10cm tall proportion. Realistic, game prop, PBR materials.
```

**#14d — Player Avatar Frame (Obsidian)**
```
Small ornate picture frame, rectangular with rounded corners, polished black obsidian stone with gold trim accents, art-deco style border engraving, empty centre opening for portrait image. Approximately 10cm tall proportion. Realistic, game prop, PBR materials.
```

### 3.6 Environment — Room

**#16 — Room Shell**
```
Interior of a small octagonal luxury private room, dark charcoal plastered walls with subtle art-deco moulding panels, dark walnut hardwood floor planks, recessed coffered ceiling in near-black. One wall has a tall window opening with an arched top. Clean architectural geometry, realistic, game environment, PBR materials.
```
*Art direction: This is the room shell only — no furniture, no lights. Tiling 2048 textures for walls and floor. Keep geometry simple (1,000–2,000 tris). Props are placed separately.*

**#17 — Pendant Light Fixture**
```
Art-deco pendant ceiling light, polished brass frame with three frosted glass globe shades, hanging from a brass chain. Warm, elegant, realistic, game prop, PBR materials.
```
*Art direction: The glass shades will use emissive material in engine. 512 textures.*

**#18 — Wall Sconce**
```
Art-deco wall sconce light, polished brass backplate with angular geometric pattern, single frosted glass half-dome shade pointing upward. Compact, elegant, realistic, game prop, PBR materials.
```

**#19 — Window with Drapes**
```
Tall arched window frame in dark wood with brass hardware, heavy floor-length dark burgundy velvet curtains drawn mostly closed leaving a narrow gap in the centre. Realistic fabric draping, game environment prop, PBR materials.
```
*Art direction: The gap behind the drapes will show a flat backplate texture of blurred city lights.*

**#20 — Drinks Cabinet**
```
Art-deco drinks cabinet sideboard, dark mahogany wood body, glass-fronted doors with brass frame and handles, two drawers below, short tapered legs. Interior shelves visible through glass. Realistic, luxurious, game prop, PBR materials.
```

**#21 — Door / Entrance**
```
Double door set in a dark wood frame with brass handles and art-deco panel detailing, slightly ajar. Rich mahogany finish, realistic, architectural game asset, PBR materials.
```

### 3.7 Environment — Decorative Props

**#22 — Whisky Decanter**
```
Crystal glass whisky decanter with diamond-cut faceted pattern, square base tapering to a narrower neck with a round crystal stopper. Filled halfway with amber liquid. Transparent glass, realistic, game prop.
```

**#23 — Whisky Tumbler**
```
Crystal glass old-fashioned whisky tumbler with diamond-cut faceted pattern, containing amber liquid and two ice cubes. Transparent glass, realistic, game prop.
```

**#24 — Cigar in Ashtray**
```
Polished brass round ashtray with a single lit cigar resting in the notch, cigar is dark brown with a grey ash tip. Realistic, small game prop, PBR materials.
```
*Art direction: Smoke is handled by particle system in engine, not modelled.*

**#25 — Framed Poster**
```
Rectangular picture frame, dark wood with thin gold inner border, containing a vintage art-deco style poker tournament poster in muted gold and black tones. Wall-mounted proportion, realistic, game prop.
```

**#26 — Velvet Rope Barrier**
```
Velvet rope stanchion barrier, two polished brass posts with round bases connected by a sagging dark red velvet rope with brass hook ends. Realistic, game prop, PBR materials.
```

**#27 — Decorative Rug**
```
Rectangular Persian-style ornamental rug, muted dark red and gold tones with intricate geometric border pattern, slightly worn look. Flat, realistic textile, game prop.
```
*Art direction: This is essentially a flat plane with a high-quality texture. 1024 textures.*

### 3.8 UI Elements in 3D Space

**#35 — Bet Amount Placard**
```
Small brass-framed rectangular placard sign with a dark felt backing, standing upright on a small brass base. Compact, elegant, realistic, game prop, PBR materials.
```
*Art direction: The number text is rendered dynamically in engine onto the felt face.*

**#37 — Dealer Speech Bubble**
```
Art-deco styled rectangular panel with rounded corners, brass frame border, dark green felt centre surface. Small decorative brass arrow pointing downward from the bottom edge. Flat panel shape, realistic, game prop, PBR materials.
```
*Art direction: Text rendered dynamically. This hovers near the dealer in 3D space.*

**#40 — Side Pot Placard**
```
Small brass-framed rectangular placard sign, slightly smaller than the main bet placard, with dark felt backing, text area on front face, standing upright on a thin brass stand. Compact, elegant, realistic, game prop, PBR materials.
```
*Art direction: Same construction as #35 but ~70% scale. "SIDE POT" label and amount rendered dynamically.*

---

## 4. Nano Banana Video Prompts

> **Prompt philosophy for Nano Banana:** Write like a creative director, not a tag list. Describe subject, composition, action, setting, style, and camera movement. Keep character descriptions consistent across related sequences for visual continuity.

> **Standard specs for ALL video prompts:** Resolution: 1080p (1920x1080). Aspect ratio: 16:9. These are appended to every prompt below as a footer line. Durations are specified per prompt based on the action length needed.

### 4.0 Video Integration Strategy

Nano Banana videos serve **three distinct roles** in the game:

| Role | Description | Implementation |
|------|-------------|----------------|
| **Full-screen cinematics** | Intro sequence, loading transitions, big win celebrations | Played as a `<video>` element layered over the R3F canvas. The R3F scene is hidden or dimmed during playback. Triggered by game-state events. |
| **Video textures** | Ambient room atmosphere loop, city window bokeh, dealer shuffle close-up | Applied as `VideoTexture` onto a plane mesh within the R3F scene (e.g., the window backplate, a background screen). Loops seamlessly. Must be encoded as MP4 H.264 for broad Smart TV codec support. |
| **Reference material** | Dealer dealing motion, chip sliding physics, card flip timing | Used as animation reference only — not shipped in the final build. The art team studies the generated footage to hand-key Theatre.js / Meshy animation timings that match the realistic motion. |

**Encoding notes:** All shipped videos must be MP4 H.264 Baseline profile for maximum Smart TV compatibility. Target bitrate: 8 Mbps for full-screen, 4 Mbps for video textures. Keep total video asset size under 50 MB.

### 4.1 Dealer Character Description (reuse across prompts)

```
DEALER CHARACTER: A composed male casino dealer in his 40s, wearing a dark charcoal waistcoat over a crisp white dress shirt with rolled-up sleeves and a black bow tie. Short dark hair, clean-shaven, calm professional demeanour. He stands behind a premium green felt poker table in a dimly lit private room with dark walls and warm pendant lighting overhead.
```

### 4.2 Intro / Menu Screen Cinematic

**Prompt:**
```
Cinematic opening shot. Camera slowly pushes forward through the slightly ajar double doors of an upscale private poker room. Warm golden light spills through the gap. As the doors open wider, we reveal a premium oval poker table with green felt under dramatic pendant lighting, surrounded by four empty leather club chairs. The room has dark panelled walls with art-deco mouldings and a faint haze of atmosphere in the light beams. The camera drifts to a gentle bird's-eye view of the table. Shallow depth of field, film grain, cinematic colour grading with warm amber tones and deep shadows. Slow deliberate camera movement. 16:9 aspect ratio, 1080p, 8 seconds.
```
*Role: Full-screen cinematic. Duration: 8 s. May be extended to 12 s by generating in two segments and cross-dissolving.*

### 4.3 Dealer Shuffle and Deal Sequence

**Prompt — Shuffle:**
```
Close-up medium shot of a casino dealer's hands performing a professional riffle shuffle with a deck of playing cards. The cards have burgundy backs with a gold geometric pattern. The dealer wears a white shirt with rolled-up sleeves and a dark waistcoat. Warm overhead pendant light illuminates the green felt table beneath. Camera is at table level, slightly looking up at the hands. Smooth, precise movements. Cinematic, shallow depth of field focused on the hands, warm colour grade. 16:9 aspect ratio, 1080p, 4 seconds.
```
*Role: Reference material (animation timing for Theatre.js dealer shuffle sequence). Duration: 4 s.*

**Prompt — Deal:**
```
Medium shot from a slight overhead angle. A casino dealer in a charcoal waistcoat and white shirt smoothly slides playing cards one at a time from a deck, flicking them across the green felt table to four player positions. Each card glides with a satisfying arc and lands face-down. Warm pendant lighting from above, dark atmospheric room background. Cinematic, smooth motion, professional precision. The camera slowly tracks from left to right as cards are dealt. 16:9 aspect ratio, 1080p, 5 seconds.
```
*Role: Reference material (card deal animation timing). Duration: 5 s.*

### 4.4 Chip Sliding Movements

**Prompt — Bet Push:**
```
Close-up low-angle shot at table level. A stack of coloured casino chips — red and black — is pushed forward across green felt by a player's hand into the centre of a poker table. The chips slide smoothly with a satisfying weight. Warm golden overhead light catches the metallic foil inlays on the chip faces. Dark blurred background. Cinematic, shallow depth of field, smooth motion. 16:9 aspect ratio, 1080p, 3 seconds.
```
*Role: Reference material (chip push physics and timing). Duration: 3 s.*

**Prompt — Pot Collect:**
```
Bird's-eye overhead shot looking straight down at a poker table. A large pile of mixed casino chips in the table centre is smoothly slid by the dealer toward one edge of the table — the winner's position. The chips scatter slightly as they move. Green felt surface, warm lighting. Cinematic, satisfying motion, gentle camera drift. 16:9 aspect ratio, 1080p, 4 seconds.
```
*Role: Reference material (pot collect animation timing). Duration: 4 s.*

### 4.5 Card Flip Reveals

**Prompt — Community Card Reveal (Flop):**
```
Close-up shot of a dealer's hand turning over three playing cards on a green felt poker table, revealing them one by one in a smooth left-to-right sequence. The cards flip from burgundy backs to white faces. Dramatic warm overhead lighting with the rest of the room in shadow. Camera is at table level. Slow motion, cinematic, high drama, shallow depth of field. Each card catches the light as it turns. 16:9 aspect ratio, 1080p, 5 seconds.
```
*Role: Reference material (card flip animation timing for Theatre.js). Duration: 5 s.*

**Prompt — River Card Reveal:**
```
Extreme close-up of a single playing card being turned face-up on green felt by a dealer's fingers. The card rotates slowly, catching the warm pendant light, revealing the face. The background is a soft bokeh of chip stacks and other cards. Cinematic, dramatic slow motion, shallow depth of field, warm colour grading. 16:9 aspect ratio, 1080p, 3 seconds.
```
*Role: Reference material (single card reveal timing). Duration: 3 s.*

### 4.6 Win Celebration Sequences

**Prompt — Winner Reaction:**
```
Medium shot of a poker table from across the table. A winning player's avatar frame at one seat glows with warm golden light. Chips from the centre pot slide toward the winner's position. Soft golden sparkle particles drift downward like gentle confetti in the warm light beam above. The dealer nods approvingly. Atmosphere is triumphant but restrained — this is a classy private game, not a rowdy casino. Cinematic, warm colour grading, gentle camera push toward the winner. 16:9 aspect ratio, 1080p, 4 seconds.
```
*Role: Full-screen cinematic (standard win). Duration: 4 s.*

**Prompt — Big Win (All-In Victory):**
```
Dramatic cinematic sequence. Camera orbits slowly around a poker table as a large pot of chips is pushed to the winner. Golden light intensifies from the pendant above. Slow-motion chip cascade. The camera pulls back to reveal the full private room bathed in warm celebratory light. Lens flare from the pendant light. Film grain, cinematic colour grading, dramatic orchestral moment. 16:9 aspect ratio, 1080p, 6 seconds.
```
*Role: Full-screen cinematic (all-in victory). Duration: 6 s.*

### 4.7 Ambient Casino Atmosphere

**Prompt — Room Ambience Loop:**
```
Static wide shot of an empty premium poker room. Green felt table under warm pendant lights, four leather chairs, dark panelled walls. Gentle wisps of atmospheric haze drift slowly through the light beams above the table. Dust motes float. The light from a window gap shifts almost imperceptibly. Everything is still except the slow movement of atmosphere and light. Cinematic, quiet, contemplative mood, warm colour grading. Loop-friendly — beginning and end frames should match. 16:9 aspect ratio, 1080p, 6 seconds.
```
*Role: Video texture (applied to a background plane in R3F, looping). Duration: 6 s loop.*

**Prompt — City View Through Window:**
```
Close-up of heavy burgundy velvet curtains with a narrow gap between them. Through the gap, a soft blurred view of city lights at night — warm amber and cool blue bokeh. The curtains sway almost imperceptibly. Atmospheric and moody. Cinematic, shallow depth of field focused on the curtain fabric, warm colour grading. 16:9 aspect ratio, 1080p, 6 seconds.
```
*Role: Video texture (applied to the window backplate plane in R3F, looping). Duration: 6 s loop.*

### 4.8 Transition / Loading Sequences

**Prompt — Card Fan Transition:**
```
Top-down overhead shot. A deck of playing cards with burgundy and gold backs fans out in a smooth arc across green felt, spreading from a central point like a dealer's flourish. Smooth, satisfying motion. Once fully fanned, the cards pause, then smoothly gather back together. Dark background, warm overhead spot light. Cinematic, clean motion, loop-friendly. 16:9 aspect ratio, 1080p, 4 seconds.
```
*Role: Full-screen cinematic (loading/transition screen). Duration: 4 s loop.*

**Prompt — Chip Stack Build:**
```
Close-up time-lapse style sequence. Casino chips of various colours stack up one by one into neat columns on green felt. Each chip lands with precise weight. The stack grows from empty table to a satisfying tower. Warm overhead lighting, dark background. Cinematic, satisfying motion, ASMR-quality precision. 16:9 aspect ratio, 1080p, 5 seconds.
```
*Role: Full-screen cinematic (loading/transition screen). Duration: 5 s.*

---

## 5. UI/UX Visual Direction

### 5.1 Design Philosophy

The UI must be **legible at 3 metres** on a television screen. This means:
- Large type sizes (minimum 24 px equivalent at 1080p; 32 px preferred)
- High contrast (ivory text on dark backgrounds)
- No thin fonts — use medium or bold weights only
- Generous padding and spacing
- Colour-coded information (chip colours match HUD chip counts)

**Style:** The UI echoes the art-deco / premium aesthetic of the room. Brass-framed panels, dark felt or leather backgrounds, clean serif or geometric sans-serif typography.

**TV Safe Zone:**
- All interactive and informational UI elements must sit within the **90% safe area** (5% margin on each edge). On a 1920x1080 canvas, this means nothing critical within the outer 96 px on left/right or 54 px on top/bottom.
- Decorative elements (vignette, ambient particles) can bleed to the full edge.
- The HUD layout below respects these margins. Always test on a real TV — overscan varies by manufacturer.

**Colour-Blind Accessibility:**
- Never rely on colour alone to convey information. Every colour-coded element must also have a **text label, icon, or pattern** as a secondary signal:
  - Action indicators (fold/check/call/raise/all-in) use colour AND a text label ("FOLD", "RAISE $500", etc.)
  - Chip denominations use colour AND a printed value on the chip face ("$5", "$25", etc.)
  - Voice command states (listening/recognised/error) use colour AND icon changes (mic → tick → question mark)
  - Timer arc uses colour shift AND numeric countdown text inside the arc
- The colour palette has been chosen to maintain sufficient contrast for the three most common forms of colour vision deficiency (protanopia, deuteranopia, tritanopia):
  - Fold grey vs Check green vs Call blue vs Raise gold — all have distinct luminance values even in greyscale
  - Red (#C23B22) and green are never used as the sole differentiator for the same UI element
- Consider offering a "High Contrast" UI toggle in settings that replaces the felt/brass aesthetic with solid dark backgrounds and brighter text for players who need maximum legibility

### 5.2 HUD Layout

```
+------------------------------------------------------+
|  [Player 1 Card]          [Pot: $2,450]  [Player 2]  |
|                                                       |
|                                                       |
|                     TABLE VIEW                        |
|                                                       |
|                                                       |
|  [Player 4 Card]    [Community Cards]    [Player 3]  |
|                                                       |
|  [Voice Cmd Hint]   [Dealer Message]    [Hand Info]  |
+------------------------------------------------------+
```

### 5.3 Player Info Card

Each player seat has a **3D placard** floating at their position:

```
+---------------------------+
|  [Avatar]   PLAYER NAME   |
|             $12,500        |
|  [Chip icon] Stack visual  |
|                            |
|  [ CURRENT ACTION ]       |
|    e.g. "Raised $500"     |
+---------------------------+
```

**Specifications:**
- Brass frame border (matches the room aesthetic)
- Dark green felt background panel
- Avatar: circular portrait in the ornate 3D frame (#14)
- Player name: ivory text, medium weight, geometric sans-serif
- Stack amount: gold (#C9A84C) text, bold
- Action indicator: bottom strip changes colour per action type:
  - Fold: muted grey
  - Check: green
  - Call: blue
  - Raise: amber/gold
  - All-in: pulsing red

### 5.4 Pot Display

- Centred above the community cards in 3D space
- Physical chip pile in the table centre provides visual reference
- Brass-framed floating placard above the pile shows the numeric total
- Text in gold, bold, large (40 px+)
- Subtle pulse animation when the pot increases
- Format: "$2,450" — always with dollar sign and comma separators

### 5.5 Chip Count / Stack Visualisation

Each player's chip count is shown two ways:
1. **Physical stacks** on the table in front of their seat — instanced chip meshes scaled to represent their total
2. **Numeric readout** on their info card

The physical stacks use denomination colours so experienced players can gauge opponents' holdings at a glance.

### 5.6 Voice Command Feedback Indicator

Since voice is the primary input, feedback must be immediate and unambiguous:

**Listening state:**
- A small **microphone icon** appears above the player's seat
- Subtle expanding ring animation (sound-wave ripple) around the mic icon
- Colour: soft blue glow

**Command recognised:**
- Ring pulses green briefly
- The interpreted command appears as text in the dealer speech bubble (e.g., "I'll raise to 500")
- Dealer repeats/confirms via text and audio

**Command not recognised:**
- Ring pulses amber
- Dealer speech bubble shows "Sorry, I didn't catch that. Could you say that again?"
- Mic icon remains active for retry

**Voice command hints:**
- Bottom-left of screen shows contextual hints in muted text:
  - "Say: Check, Fold, Raise [amount], Call, All In"
- These hints are visible during a player's turn and fade after 3 seconds
- Opacity: 60% to avoid visual clutter

### 5.7 Dealer Speech / Message System

The dealer communicates through:

1. **Speech bubble panel** — the 3D art-deco panel (#37) floating near the dealer
   - Shows current game narration: "The flop is King of Hearts, Seven of Clubs, Two of Diamonds"
   - Shows player action confirmations: "Player 2 raises to $500"
   - Auto-dismisses after 4 seconds or on next message

2. **Voice audio** — text-to-speech from the dealer avatar (handled by voice service, not art direction)

3. **Visual emphasis** — when announcing community cards, the dealer panel highlights the card names in gold text

### 5.8 Community Cards Display

- Cards dealt face-down to the board, then flipped via Theatre.js animation
- Each card has a subtle shadow beneath it on the felt
- Active/newly revealed cards have a brief gold edge-glow highlight (0.5 s)
- Card faces use the texture atlas; suits are colour-coded:
  - Hearts / Diamonds: #C23B22 (red)
  - Spades / Clubs: #1C1C1C (black)

### 5.9 Turn Timer

- A **circular arc** rendered as a shader around the active player's avatar frame
- Starts full (gold colour) and depletes clockwise
- At 25% remaining: colour shifts to amber
- At 10% remaining: colour shifts to red with a gentle pulse
- If timer expires: auto-fold with dealer announcement

### 5.10 Typography

| Use | Font Style | Size (1080p) | Colour |
|-----|-----------|--------------|--------|
| Player name | Geometric sans-serif, medium | 28 px | Ivory #F5F2ED |
| Chip count | Geometric sans-serif, bold | 32 px | Gold #C9A84C |
| Pot amount | Geometric sans-serif, bold | 40 px | Gold #C9A84C |
| Dealer message | Serif, regular | 26 px | Ivory #F5F2ED |
| Action label | Geometric sans-serif, bold | 24 px | Per action colour |
| Voice hints | Geometric sans-serif, regular | 22 px | Warm Grey #4A4845 at 60% opacity |
| Card names in dealer bubble | Serif, bold | 28 px | Gold #C9A84C |

**Recommended font families:**
- Geometric sans-serif: Inter, DM Sans, or Outfit (all open source, excellent legibility)
- Serif: Playfair Display or DM Serif Display (art-deco character)

---

## Appendix A: Performance Budget for Smart TV / Fire TV

| Metric | Target | Rationale |
|--------|--------|-----------|
| Total scene triangles | < 80,000 | Fire TV Stick 4K Max GPU is roughly equivalent to a low-end mobile GPU |
| Draw calls | < 150 | Use instancing for chips; merge static room geometry |
| Texture memory | < 128 MB | Compress all textures to KTX2/Basis; use mipmaps |
| Target frame rate | 30 fps stable | 60 fps preferred but 30 is acceptable floor |
| Shadow maps | 1 x 1024 px | Single shadow-casting light (pendant); all others non-shadow |
| Post-processing | Bloom + Vignette only | No SSAO, no SSR — too expensive for target hardware |
| Max simultaneous particles | 50 | Cigar smoke + dust motes + occasional celebration |

## Appendix B: Asset Production Pipeline

```
1. GENERATE   → Meshy.AI text-to-3D (using prompts above)
2. EVALUATE   → Review topology, UV layout, texture quality
3. REFINE     → Blender: retopology if needed, UV cleanup, texture fixes
4. OPTIMISE   → Reduce poly count to budget, compress textures to KTX2
5. EXPORT     → glTF 2.0 / GLB (native format for Three.js / R3F)
6. INTEGRATE  → Import into React Three Fiber scene, apply PBR materials
7. ANIMATE    → Theatre.js keyframes for cameras; Meshy auto-rig for dealer
8. TEST       → Verify on Fire TV Stick 4K Max at 30 fps minimum
```

## Appendix C: Research Sources

- [Prominence Poker on Steam](https://store.steampowered.com/app/384180/Prominence_Poker/) — environment and character art reference
- [Poker Club on Steam](https://store.steampowered.com/app/1174460/) — ultra HD visuals, ray tracing, venue design reference
- [Meshy.AI — Text-to-3D Prompt Guide (Meshy 5)](https://www.meshy.ai/blog/meshy-5-text-to-3d) — prompt structure best practices
- [Meshy.AI — Creating Game Assets](https://www.meshy.ai/blog/3d-game-assets-with-meshy) — game-ready asset pipeline
- [Meshy.AI — 10 Incredible Prompts](https://www.meshy.ai/blog/10-incredible-meshy-prompts-you-should-try-3d-game-assets) — prompt examples and style descriptors
- [Nano Banana Video](https://nanobananavideo.com/) — AI video generation capabilities and specs
- [Nano Banana Pro Prompt Guide (Imagine.art)](https://www.imagine.art/blogs/nano-banana-pro-prompt-guide) — prompt structure and 75+ examples
- [Nano Banana Pro Prompting Guide (DEV Community)](https://dev.to/googleai/nano-banana-pro-prompting-guide-strategies-1h9n) — advanced prompting strategies
- [Poker Room Design Visuals (EyeView 3D)](https://eyeview3d.com/inside-the-high-stakes-stunning-poker-room-design-visuals/) — premium poker room lighting and material reference
- [Casino Lighting Design](https://rclite.com/blog/best-lighting-for-casinos-and-gaming/) — real-world casino lighting approaches
- [React Three Fiber — Scaling Performance](https://r3f.docs.pmnd.rs/advanced/scaling-performance) — R3F performance optimisation guidance
- [Best Practices for AI-Generated 3D Models in Games (Sloyd)](https://www.sloyd.ai/blog/7-best-practices-for-ai-generated-3d-models-in-game-development) — AI model workflow for game dev

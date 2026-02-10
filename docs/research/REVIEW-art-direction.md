# Art Direction Document — Review

> **Reviewer:** Senior Art Review Lead (20+ years, AAA / premium games)
> **Document reviewed:** `docs/research/art-direction.md`
> **Date:** 2026-02-09
> **Overall verdict:** Strong document with targeted fixes needed. See section ratings below.

---

## Section 1: Visual Style Guide — Rating: 92%

### Strengths

The visual style guide is genuinely impressive for a pre-production document. I'll give credit where it's due, even if it pains me.

- **Lighting rig** is exceptionally well-specified. The three-tier model (key / rim / ambient) with explicit colour temperatures (2700 K–3200 K key, 5500 K rim) and implementation details (`SpotLight` with penumbra, `HemisphereLight`, shadow-map resolution) is production-ready. Two artists following this would produce near-identical results. That's rare.
- **PBR material table** is outstanding — specific hex colours, roughness/metalness values, and explicit notes on normal maps and clear-coat usage. This is the kind of thing most art direction documents leave to guesswork.
- **Colour palette** with hex values for every element, including chip denominations, is thorough and actionable.
- **Reference titles** are well-chosen. Poker Club and Prominence Poker are the correct visual benchmarks for this tier of game.

### Issues to Address

1. **HDRI environment map unspecified.** The ambient fill tier mentions an HDRI environment map at "low `envMapIntensity`" but never specifies *which* HDRI or its characteristics. On constrained hardware, the HDRI choice matters enormously. Specify either a custom-baked HDRI of the room interior or a specific studio HDRI from a library like Poly Haven. Include the target resolution (256 px is likely sufficient for a dark room with low envMapIntensity).

2. **Bloom parameters missing.** "Low threshold" is not actionable. Specify: threshold (e.g., 0.85), intensity (e.g., 0.3), radius/kernel size. Different values produce vastly different results and this is one of the first things that'll look wrong if left vague.

3. **No texture format mandate in the style guide.** Appendix A mentions KTX2/Basis compression, but the style guide's material table specifies texture resolutions without confirming the format. Artists need to know from the start that they're authoring for KTX2 compression, because that affects how they handle fine detail in normal maps (Basis compression is lossy and will blur fine fibre/grain normals).

4. **Vignette strength unspecified.** "Slight darkening" is subjective. Provide a value (e.g., offset: 0.3, darkness: 0.6 for `@react-three/postprocessing` Vignette).

5. **No mention of colour space / tone mapping.** This is a critical omission for PBR workflows. Specify whether the renderer uses ACESFilmicToneMapping (likely the correct choice for this warm, cinematic look) and confirm sRGB encoding on output textures. Without this, the carefully specified hex colours in the material table will render differently depending on whoever sets up the renderer.

### Consistency Test

If two artists followed this guide independently, would they produce similar results? **Mostly yes**, which is commendable. The material table alone puts this ahead of most documents I've reviewed. The gaps above (HDRI, bloom values, tone mapping) would cause noticeable divergence in the final composite look, but the geometry, materials, and base lighting would be very close. Fix those gaps and this is a 97% section.

---

## Section 2: Asset Completeness — Rating: 88%

### What's Present and Correct

The asset list is thorough for a 4-player Texas Hold'em game. Let me do the cross-check:

| Required Element | Present? | Notes |
|---|---|---|
| Poker table (4-seat) | Yes | Well-specified with poly budget |
| Playing cards (52 faces + back) | Yes | Smart approach: single mesh + texture atlas |
| Chip denominations (multiple) | Yes | 5 denominations with instanced stacking |
| Dealer representation | Yes | Upper body + separate detailed hands |
| Player seats / areas | Yes | Chairs + avatar frames + info placards |
| Community card area | Yes | Covered in UI section |
| Pot representation | Yes | Physical chip pile + numeric placard |
| Environment / room | Yes | Comprehensive room shell + props |
| Particle effects | Yes | 6 distinct effects catalogued |
| UI elements in 3D space | Yes | Bet placards, speech bubbles, timer arc |

### Missing Assets

1. **Burn card pile / muck.** In Texas Hold'em, the dealer burns a card before dealing the flop, turn, and river. There's no asset for where burnt/mucked cards go. This is a small detail but it matters for authenticity — a discard pile or area on the table should be defined, even if it's just a designated zone on the felt.

2. **Card protector / cut card.** Minor, but premium poker rooms use a cut card (plastic card for the bottom of the deck). For the level of realism targeted, this would sell the atmosphere.

3. **Blind markers (Small Blind / Big Blind).** The document includes the Dealer button (#3) but not the SB/BB markers. In a 4-player game, blind positions are critical visual information. These could be simple text placards similar to the dealer button, or handled in the UI layer — but the decision should be documented explicitly.

4. **All-in indicator.** The UI section mentions a "pulsing red" action indicator for all-in, but there's no physical representation. Consider a distinctive 3D marker or chip placement that makes the all-in state immediately readable at a glance from the default camera angle.

5. **Card shoe / deck holder.** The document has a stacked deck (#11) but no shoe or holder. For a premium room aesthetic, the deck should sit in something rather than bare on the felt.

6. **Player name plates / seat markers.** The avatar frame (#14) handles identification, but there's no mention of how player names are rendered in the 3D scene beyond the UI card description in section 5.3. The 3D asset for this should be explicit.

7. **Side pot visualisation.** In a 4-player game, side pots occur when a player goes all-in and others continue betting. The asset list only accounts for a single centre pot. Multiple pot piles or a visual splitting mechanism needs to be defined.

### Poly Budget Assessment

The estimated total of 55,000–80,000 triangles is reasonable for the scene described. However, the dealer avatar alone (8,000–12,000 tris for body + 2,000–3,000 for hands = 10,000–15,000 tris) represents roughly 15–20% of the total budget. If the dealer is always visible, this is fine. If there's any scenario with multiple animated characters, there's no headroom. The budget is tight but viable for the single-dealer, 4-player-frames setup described.

---

## Section 3: Meshy.AI Prompt Quality — Rating: 85%

### Overall Prompt Structure Assessment

The prompts follow Meshy's recommended structure well: clear subject, 3–5 specific descriptors, material callouts, and "game asset, PBR materials" as a quality/style anchor. The prompt philosophy section is sound. However, there are specific issues:

### Issues

1. **"Realistic" vs "game asset" conflict in several prompts.** Meshy's guidance recommends choosing between realistic and stylised/game-ready, not combining both ambiguously. Prompts like #12 (Dealer Avatar) say "Realistic proportions, game character, PBR materials" — this can confuse the generator about the target polygon density. For game assets with a polygon budget, use "game-ready" or "low-poly game asset" explicitly and specify the target triangle count in the art direction notes (which the document does, but the prompt itself should reinforce this).

2. **No negative prompt capability acknowledged.** The document doesn't mention that Meshy currently does not support negative prompts. This means the prompts cannot say "no background" or "without pedestal." The art direction notes should flag that generated assets will likely come with unwanted bases, backgrounds, or extra geometry that must be cleaned up in Blender. This is a pipeline reality that needs documenting.

3. **Dealer character prompt (#12) is ambitious for Meshy.** AI-generated humanoid characters from text-to-3D are notoriously inconsistent, particularly for faces and clothing. The prompt is well-written, but the art direction note should set expectations: this asset will almost certainly require significant manual retopology, UV cleanup, and possibly hand-sculpted face corrections in Blender. The note mentions "may need manual retopology" — it should say "will need manual retopology" with an estimated 4–8 hours of cleanup work.

4. **Dealer hands prompt (#13) is the highest-risk asset.** Generating realistic, anatomically correct human hands from AI text-to-3D is still one of the hardest tasks for any generative tool. The art direction should include a fallback plan: source hands from a marketplace (e.g., Sketchfab, TurboSquid) or hand-model them. Do not rely on Meshy alone for this.

5. **Room shell prompt (#16) lacks critical detail.** "Octagonal luxury private room" is a complex architectural shape. Meshy may struggle with the octagonal geometry and produce irregular walls. Consider simplifying to a rectangular room with angled corner panels (which reads as octagonal on camera) or providing a reference image alongside the text prompt. Meshy's image-to-3D pipeline may give better results for architectural spaces.

6. **No mention of Meshy's "Refine Prompt" toggle.** Meshy 5 has an auto-refine feature that enhances prompts before generation. The document should specify whether this should be ON or OFF for each prompt category (likely ON for props, OFF for the dealer character where precise control matters).

7. **Texture resolution expectations vs Meshy output.** Meshy generates its own textures at whatever resolution its pipeline produces. The document specifies target texture resolutions (512/1024/2048) but doesn't acknowledge that Meshy's output textures will likely need to be re-baked or upscaled to hit those targets. This should be called out in the pipeline section.

8. **Missing prompts for assets #9, #15, #34, #36, #38.** The chip stack (#9), empty seat placeholder (#15), pot chip pile (#34), voice command indicator (#36), and timer arc (#38) have no Meshy prompts. Some of these (like the timer arc shader) are engine-side, which is fine, but #9, #15, and #34 should either have prompts or explicit notes that they're assembled in-engine from other assets.

### Prompts Most Likely to Succeed

- **Poker chip (#4–8):** Excellent prompt. Simple, well-defined geometry. High confidence.
- **Playing card (#10):** Dead simple shape. Will work perfectly.
- **Furniture pieces (#2, #20, #26):** Good detail level, clear subjects. Should produce usable results.
- **Decorative props (#22–25, #27):** Simple objects with clear descriptors. High confidence.

### Prompts Most Likely to Need Rework

- **Dealer avatar (#12):** High risk. Budget 2–3 generation attempts + significant Blender work.
- **Dealer hands (#13):** Very high risk. Have a fallback plan.
- **Room shell (#16):** Medium-high risk due to octagonal geometry.
- **Window with drapes (#19):** Fabric simulation is tricky for text-to-3D. Expect stiff, unconvincing drapes that need manual vertex tweaking.

---

## Section 4: Nano Banana Video Prompts — Rating: 90%

### Strengths

- **Consistent character description block** (section 4.1) that's reused across prompts is excellent practice. This is exactly how you maintain visual continuity across AI-generated video clips.
- **Prompt structure follows best practice:** Subject + Action + Setting + Camera + Style. Each prompt reads like a creative brief, not a tag list. Nano Banana's natural-language processing will parse these well.
- **Camera direction is specific** — "camera slowly pushes forward," "table level, slightly looking up," "slow 180-degree orbit." This gives the AI clear motion instructions.
- **Colour grading consistency** — "warm amber tones and deep shadows," "warm colour grading" is repeated across all prompts, ensuring visual cohesion.

### Issues

1. **Duration not specified for any prompt.** Nano Banana generates clips in the range of approximately 4–15 seconds. Each prompt needs a target duration. The intro cinematic (#4.2) likely needs 8–10 seconds. The card flip (#4.5) might need 4–6 seconds. The ambient loop (#4.7) should be specified at exactly the loop boundary (e.g., 6 seconds). Without duration targets, the production team will waste generation credits experimenting.

2. **"Loop-friendly" is aspirational, not guaranteed.** The ambient room loop (#4.7) and card fan transition (#4.8) both request "loop-friendly — beginning and end frames should match." Current AI video generation tools, including Nano Banana, cannot reliably produce seamless loops. The art direction should specify a fallback: cross-fade the last 0.5 s into the first 0.5 s in post-production, or render to a longer duration and find a suitable loop point manually.

3. **Resolution target missing.** Nano Banana supports 720p, 1080p, and 4K. For a Smart TV / Fire TV target, specify 1080p as the production resolution (4K is unnecessary given the hardware target and would increase generation time/cost).

4. **No aspect ratio consistency.** Only prompts #4.2 and #4.7 specify "16:9 aspect ratio." ALL video prompts should specify this, as the game is designed for television screens. Without it, some clips may generate at different ratios.

5. **Character consistency across separate generations is not guaranteed.** While the shared character description block helps, each independent generation call to Nano Banana will produce a slightly different-looking dealer. The document should specify a strategy: either generate a reference image of the dealer first and use image-to-video for subsequent clips, or accept visual variation and rely on the 3D dealer model for in-game consistency (using video only for pre-rendered cinematics where slight variation is less noticeable).

6. **No guidance on video format / codec for integration.** How do these videos get composited into the React Three Fiber scene? As HTML5 `<video>` textures? As pre-rendered background plates? This is a critical integration question. If they're used as video textures on 3D planes, the codec matters (H.264 for broad compatibility, or WebM for alpha channel transparency). If they're full-screen cinematics, different considerations apply.

7. **"Each card catch the light" — grammatical error in #4.5 Flop prompt.** Should be "catches." Minor, but if these prompts are fed directly to the AI, grammar affects parsing.

### Integration Concern

The document doesn't explain how Nano Banana video clips integrate with the real-time 3D scene. Are these:
- **Full-screen cinematics** played between gameplay (intro, transitions, loading)?
- **Video textures** mapped onto planes within the 3D scene?
- **Reference material** for Theatre.js camera animations to replicate in real-time?

This is a significant gap. The production team needs to know the intended use for each clip category. My assumption is that the intro (#4.2) and transitions (#4.8) are full-screen cinematics, while the gameplay clips (#4.3–4.6) are reference material for real-time animation replication. But this should be made explicit.

---

## Section 5: UI/UX Visual Direction — Rating: 93%

### Strengths

- **3-metre legibility requirement** is correct and well-enforced throughout. Minimum 24 px at 1080p with medium/bold weights is solid TV-first design.
- **Voice command feedback system** is thoroughly designed with clear state machine (listening → recognised → not recognised) and visual indicators per state.
- **Chip colour coding** matching physical stacks to HUD counts is elegant and accessible.
- **Turn timer** with colour progression (gold → amber → red) at defined thresholds (25%, 10%) is actionable and will create good tension.
- **Typography table** with specific font families, sizes, weights, and colours is production-ready.

### Issues

1. **No accessibility considerations.** The colour-coded action indicators (grey, green, blue, amber, red) rely solely on colour to convey information. Approximately 8% of males have some form of colour vision deficiency. Add text labels, icons, or patterns alongside colours. The fold/check/call/raise/all-in states should be distinguishable without colour alone.

2. **Font licensing not confirmed.** Inter, DM Sans, Outfit, Playfair Display, and DM Serif Display are listed as "all open source." Verify the specific licences (OFL / Apache 2.0) are compatible with commercial game distribution on Fire TV. They almost certainly are, but this should be explicitly documented.

3. **HUD layout diagram is too abstract.** The ASCII layout is a starting point, but a proper wireframe at 1920x1080 resolution with pixel-accurate positioning would prevent misinterpretation. The current diagram doesn't show how elements scale when players leave (2 vs 3 vs 4 active players), or how the layout adapts.

4. **No safe-zone / overscan guidance.** Smart TVs and Fire TV may have overscan that crops the edges of the display. Standard broadcast safe-zone is 90% of the screen area (5% margin on all sides). UI elements like "Voice Cmd Hint" in the bottom-left must be placed within this safe zone. This is not mentioned anywhere.

5. **Missing UI states.** The document covers the active gameplay HUD but doesn't address:
   - Pre-game lobby / waiting for players
   - Game over / session summary screen
   - Settings / options overlay
   - Disconnection / error states
   - Spectator view (if a player busts out but stays in the room)

6. **Dealer speech bubble auto-dismiss timing.** "Auto-dismisses after 4 seconds" may be too fast for complex messages like "The flop is King of Hearts, Seven of Clubs, Two of Diamonds." At 3 metres distance, reading speed is slower than at a desk. Consider 6 seconds minimum, or tie dismissal to the next game event rather than a fixed timer.

---

## Technical Feasibility — Rating: 87%

### Can React Three Fiber Handle This on Smart TV / Fire TV?

**Short answer:** Yes, but it'll be tight and requires disciplined optimisation.

**Detailed assessment:**

The Fire TV Stick 4K Max has an IMG GE9215 GPU at 750 MHz with OpenGL ES 3.2 support and 2 GB DDR4 RAM. This is roughly equivalent to a low-end mobile GPU from 2019-2020. The Amazon Silk browser supports WebGL, but it is not a high-performance WebGL platform.

| Concern | Severity | Assessment |
|---|---|---|
| **80K tri budget** | Low | Achievable. The GPU can handle this if draw calls are kept low. |
| **< 150 draw calls** | Medium | Requires aggressive instancing (chips) and static geometry merging (room). R3F's `<Merged>` and `<Instances>` components will be essential. Need to verify the actual draw-call count once assets are integrated. |
| **128 MB texture budget** | Medium | Tight but feasible with KTX2/Basis compression. The 2048 px textures (table, dealer, room) will dominate. Calculate actual memory: ~6 textures at 2048 = ~96 MB uncompressed; with KTX2 this drops to ~24 MB. Remaining budget is ample for 1024/512 textures. |
| **30 fps target** | High | This is the biggest risk. The Silk browser on Fire TV is not optimised for sustained WebGL rendering. Post-processing (bloom + vignette) will cost frames. Theatre.js animation sequencing adds CPU overhead. 30 fps is achievable but will require profiling on-device from day one. |
| **MeshPhysicalMaterial** | High | `MeshPhysicalMaterial` with transmission (glass) and clearcoat (wood) is significantly more expensive than `MeshStandardMaterial`. On this GPU, each `MeshPhysicalMaterial` instance adds noticeable fragment-shader cost. Recommend limiting `MeshPhysicalMaterial` to 2–3 hero objects maximum (whisky glass, table rim). Everything else should use `MeshStandardMaterial`. |
| **Particle systems** | Low | 50 max particles is conservative and fine. |
| **Shadow maps** | Medium | Single 1024 px shadow map is correct. Ensure `shadowMap.type` is `PCFShadowMap` not `PCFSoftShadowMap` — the latter is roughly 2x the cost on mobile GPUs. |
| **Video texture playback** | High | If Nano Banana clips are used as video textures in the 3D scene, this adds significant GPU and memory cost (video decode + texture upload per frame). On Fire TV's limited hardware, simultaneous video texture playback and 3D rendering may cause frame drops. This needs explicit testing. |

### Recommendations for Technical De-risking

1. **Prototype on actual hardware immediately.** Do not develop on desktop and hope it runs on Fire TV. Build a bare-bones scene with the room shell, table, 4 chair instances, 50 instanced chips, and post-processing enabled. Profile on a Fire TV Stick 4K Max with Silk browser. If that doesn't hit 30 fps, the entire visual approach needs scaling back before assets are produced.

2. **Implement a quality tier system.** Fire TV Stick 4K Max is the high-end target, but older Fire TV Sticks have weaker GPUs. Define at least two quality tiers:
   - **High:** Full scene as described, bloom + vignette, 1024 shadow map
   - **Low:** Reduced texture resolution, no post-processing, no shadow map, baked lighting only

3. **Consider `drei`'s `<PerformanceMonitor>`.** React Three Fiber's ecosystem includes adaptive performance monitoring that can automatically reduce quality (DPR, shadow resolution) when frame rate drops.

---

## Reference Quality — Rating: 91%

### Assessment

The document references three poker games (Poker Club, Prominence Poker, WSOP console), which are the correct tier of visual reference. The research sources in Appendix C are comprehensive and relevant:

- Meshy.AI blog posts and prompt guides — correct and current
- Nano Banana documentation — appropriate sources cited
- Real-world poker room and casino lighting references — excellent (shows the art director looked beyond games)
- R3F performance documentation — relevant

### Missing References

1. **No mention of "The Four Kings Casino and Slots"** — a major free-to-play casino game with a poker mode, available on multiple platforms. Its TV-distance UI and lobby design are directly relevant.

2. **No reference to real-world premium poker table manufacturers** (e.g., BBO Poker Tables, Helmsman) for material and proportion reference. The document describes materials well, but visual reference boards from actual products would ground the Meshy prompts.

3. **No concept art or mood boards.** The document is entirely textual. For art direction, visual reference is paramount. Even 5–10 reference images (freely sourced from the cited games and real-world poker rooms) would dramatically reduce ambiguity.

---

## Summary: Section Ratings

| Section | Rating | Confidence Level |
|---|---|---|
| 1. Visual Style Guide | 92% | High — fix HDRI, bloom values, tone mapping |
| 2. Asset Completeness | 88% | Medium — missing blind markers, side pots, burn pile, fallback for hands |
| 3. Meshy.AI Prompts | 85% | Medium — dealer/hands are high risk, missing prompts for several assets |
| 4. Nano Banana Video | 90% | High — add durations, resolution, integration strategy |
| 5. UI/UX Visual Direction | 93% | High — add accessibility, safe zones, missing UI states |
| 6. Technical Feasibility | 87% | Medium — MeshPhysicalMaterial cost, video textures, need device testing |
| 7. Reference Quality | 91% | High — add visual mood boards |

### Overall Confidence: 89%

**Below the 95% target.** The document is genuinely strong — far better than most art direction documents I've reviewed at this stage. But it falls short of the 95% mark due to:

1. **High-risk Meshy prompts** (dealer body, dealer hands) without adequate fallback plans
2. **Missing critical game assets** (blind markers, side pots, burn pile)
3. **No device-tested performance baseline** — the feasibility section is theoretical
4. **Nano Banana integration strategy undefined** — how do video clips enter the 3D pipeline?
5. **No visual reference boards** — a text-only art direction document is inherently less reliable

### To Reach 95%

1. Add blind markers and side pot visualisation to the asset list
2. Add fallback sourcing plan for dealer hands (marketplace asset)
3. Specify bloom, vignette, and tone-mapping parameters exactly
4. Add duration and resolution targets to all Nano Banana prompts
5. Define how Nano Banana videos integrate with the R3F scene
6. Add TV safe-zone guidance and accessibility notes to UI section
7. Create a visual mood board (even 5–10 reference images)
8. Specify HDRI source and colour-space / tone-mapping settings

Fix those eight items and this document will be ready for production.

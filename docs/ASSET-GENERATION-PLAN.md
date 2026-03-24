# Blackjack Asset Generation Plan

## Status: AWAITING ANSWERS

Answer the questions below, then tell me to proceed.

---

## Questions

### Q1: Meshy API Key
The Meshy API key in `.env` (`msy_x7oWqdxj3q7XRU8IveA9YtP6vsHWfXAyLUDV`) returns 401 "Invalid API key". Do you have a valid one, or should I skip 3D models for now and focus on 2D textures + videos?

A: Try this: msy_30XR3LKeFqgS8nYXgekOwdEUgSZ813biMPcL


### Q2: Card Face Atlas
The art direction calls for a 52-card face atlas (all ranks and suits). Should I:
- (a) Generate each card face individually with Fal.ai and stitch them into an atlas
- (b) Use a standard open-source card face set (e.g. from OpenGameArt) and focus AI generation on the card BACK and table textures
- (c) Generate a stylised set that matches the premium aesthetic described in the art direction

Just use the GLB cards for now

### Q3: Video Generation
Fal.ai supports video generation via models like Kling, Minimax, etc. The docs list 16 BJ Classic videos + 9 BJC videos (25 total). At mid-tier quality, each video costs ~$0.10-0.50. Shall I:
- (a) Generate ALL 25 videos now (~$5-12 total)
- (b) Generate just the critical ones first (ambient loops + key moments like natural blackjack, deal cinematic, hole card reveal) — about 6 videos
- (c) Skip videos for now, focus on textures

Go with (a)

### Q4: Chip Textures
The art direction says generate ONE chip mesh and swap textures per denomination. I'll generate 5 chip face textures (White $5, Red $25, Black $100, Purple $500, Gold $1000). Each needs a top-face inlay design. Should the inlay be:
- (a) Simple denomination number with a geometric border (clean, modern)
- (b) Ornate casino-style with scrollwork and the denomination (traditional)
- (c) Your call — surprise me

A: (b) traditional

### Q5: Table Felt Texture
The art direction specifies "deep racing green (#1B4D2E) with subtle fibre normal map". Shall I generate:
- (a) Just the felt diffuse texture (Fal.ai) — I'll create the normal map procedurally in code
- (b) Both a diffuse AND a normal-map-style texture with visible fibre detail
- (c) A full PBR set (diffuse + roughness + normal) as separate images

---
A: (b)


## Generation Plan (once questions answered)

### Batch 1: Shared Textures (BJ Classic + Competitive)
| # | Asset | Fal.ai Prompt | Output |
|---|-------|--------------|--------|
| 1 | Card back texture | Burgundy + gold geometric pattern, premium, linen embossed | 1024x1024 |
| 2 | Card face atlas (52 cards) | Per Q2 answer | 2048x2048 atlas |
| 3 | Table felt (Classic) | Deep racing green baize, fibre texture | 1024x1024 tileable |
| 4 | Table felt (Competitive) | Dark charcoal felt, brushed steel aesthetic | 1024x1024 tileable |
| 5-9 | Chip inlays x5 | Per denomination colour + design | 512x512 each |
| 10 | Chip edge texture | Clay/ceramic ridged edge, neutral | 512x256 strip |

### Batch 2: BJ Classic Environment Textures
| # | Asset | Description | Output |
|---|-------|-------------|--------|
| 11 | City bokeh backplate | Blurred warm city lights at night through window | 1920x1080 |
| 12 | Vintage poker poster | Art-deco tournament poster, muted gold/black | 512x512 |
| 13 | Room wall panels | Dark charcoal plaster with art-deco moulding | 1024x1024 tileable |
| 14 | Walnut floor | Dark walnut hardwood planks | 1024x1024 tileable |
| 15 | Leather texture | Cognac brown tufted leather grain | 512x512 tileable |
| 16 | Persian rug | Muted dark red/gold, geometric border | 1024x1024 |

### Batch 3: BJ Competitive Environment Textures
| # | Asset | Description | Output |
|---|-------|-------------|--------|
| 17 | Arena floor | Dark polished concrete or black marble | 1024x1024 tileable |
| 18 | Arena backdrop | Dark void with faint rim lighting, tournament feel | 1920x1080 |
| 19 | Brushed steel texture | For table edges, arena fixtures | 512x512 tileable |

### Batch 4: Videos (per Q3 answer)
Priority videos for BJ Classic:
1. `bj_ambient_table` — glamorous floor loop (6s)
2. `bj_deal_cinematic` — cards sliding from chrome shoe (2s)
3. `bj_natural_blackjack` — Ace+King celebration overlay (3s)
4. `bj_hole_card_reveal` — dramatic card flip (2.5s)
5. `bj_big_win` — chip cascade celebration (4s)

Priority videos for BJ Competitive:
6. `bjc_ambient_arena` — dark arena with spotlight (6s)

### Batch 5: 3D Models via Meshy (if API key works)
1. Blackjack table (Classic — oval, green felt, mahogany)
2. Blackjack table (Competitive — dark felt, steel edges)
3. Card shoe / deck holder
4. Poker chip (base mesh)
5. Leather club chair

---

## Output Directories
```
apps/display/public/assets/
  shared/textures/          — card backs, chip textures, card atlas
  blackjack/textures/       — Classic felt, room textures, city bokeh
  blackjack/videos/         — Classic video overlays + ambient
  blackjack/models/         — Classic 3D models (GLB)
  blackjack-competitive/textures/  — Competitive felt, arena textures
  blackjack-competitive/videos/    — Competitive video overlays + ambient
  blackjack-competitive/models/    — Competitive 3D models (GLB)
```

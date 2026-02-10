# Asset Analysis: 52-card_deck.glb

> Inspected with `@gltf-transform/cli`. Source: Sketchfab (v12.66.0).

## Overview

| Property | Value |
|----------|-------|
| File size | 3.6 MB |
| Format | glTF 2.0 binary (GLB) |
| Generator | Sketchfab-12.66.0 |
| Extensions | None (maximum compatibility) |
| Total render vertices | 9,360 |
| Total meshes | 156 (52 cards × 3 primitives each) |
| Total materials | 54 |
| Total textures | 55 |

## Mesh Structure (Per Card)

Each card is composed of **3 mesh primitives**:

| Primitive | Suffix | Vertices | Triangles | Attributes | Purpose |
|-----------|--------|----------|-----------|------------|---------|
| Front face | `_01` | 16 | 14 | POSITION, NORMAL, TANGENT, TEXCOORD_0 | Card front (has normal map) |
| Back/design | `_XX` (varies) | 16 | 14 | POSITION, NORMAL, TEXCOORD_0 | Card back design |
| Body/edge | `_07` | 56 | 32 | POSITION, NORMAL, TEXCOORD_0 | Card edge/thickness |

**Per card total: ~88 vertices, ~60 triangles** — extremely low poly, well suited for real-time rendering.

**All 52 cards combined: ~4,576 upload vertices, 9,360 render vertices.**

## Suit Layout (Mesh Indices)

| Suit | Mesh range | Cards |
|------|------------|-------|
| Spades | 0–38 | A, 2, 3, 4, 5, 6, 7, 8, 9, 10, J, Q, K |
| Hearts | 39–77 | A, 8(!), 5, 4, J, K, 9, Q, 7, 6, 10, 3, 2 |
| Diamonds | 78–116 | A, 8, 5, 4, J, K, 9, Q, 7, 6, 10, 3, 2 |
| Clubs | 117–155 | A, 8, 5, 4, J, K, 9, Q, 7, 6, 10, 3, 2 |

**Note:** Spades are in standard rank order; Hearts/Diamonds/Clubs are in a non-standard order. Code must look up cards by mesh name, not index.

## Materials

| Material | Instances | Textures | Purpose |
|----------|-----------|----------|---------|
| `01_-_Default` | 52 | baseColor + normal | Shared front face material |
| `07_-_Default` | 52 | baseColor | Shared card body material |
| `02_-_Default` through `material_53` | 1 each | baseColor | Individual card face textures (52 unique) |

All materials are **OPAQUE** and **double-sided**.

## Textures

- **Resolution:** All textures are **256×512** pixels
- **Format:** JPEG (except normal map which is PNG)
- **GPU memory per texture:** ~699 KB (uncompressed)
- **Total GPU memory:** 55 × 699 KB ≈ **37.5 MB** (all textures loaded)

| Texture | Size on disk | Purpose |
|---------|-------------|---------|
| #0 | 152 KB | Shared front face base colour |
| #1 | 268 KB (PNG) | Shared front face normal map |
| #2 | 10.5 KB | Shared card body/edge |
| #3–#54 | 1.8 KB – 156 KB each | Individual card face designs |

Face card textures (J, Q, K) are significantly larger (127–156 KB) than pip cards (1.8–49 KB).

## Known Issues / Quirks

1. **Typo in mesh names:** "Eigh of Hearts" instead of "Eight of Hearts" (meshes 42–44). Code must handle this.
2. **Non-standard card ordering** in Hearts/Diamonds/Clubs suits — cannot rely on index order.
3. **52 separate materials for card faces** — this means 52 unique textures, NOT a texture atlas. This contradicts the TDD's planned 8×7 atlas approach.
4. **No LOD levels** included in the asset.
5. **No card back texture** — the `_XX` meshes appear to use individual per-card materials for the back design, not a shared card-back texture.

## Performance Implications

- **Draw calls:** In the worst case (all 52 cards visible), this could be up to **156 draw calls** (52 × 3 primitives). With material batching, likely reducible to ~54 draw calls (one per material).
- **Triangle budget:** 52 × 60 = **3,120 triangles** for all cards — negligible within the 85K budget.
- **GPU memory:** 37.5 MB for all textures is significant. Consider:
  - Only loading textures for cards actually in play (max ~9 community + 8 hole cards = 17 cards)
  - Compressing to KTX2/ETC1S to reduce GPU footprint
  - Using a texture atlas to batch draw calls (would require UV remapping in Blender)

## Impact on TDD

The frontend TDD (Section 4: 3D Asset Pipeline) currently describes an **8×7 texture atlas** approach for card faces. This GLB asset uses **individual textures per card** instead. The team needs to decide:

1. **Use as-is:** Load individual card meshes and textures. Simpler integration but more draw calls and GPU memory.
2. **Repack into atlas:** Extract textures, create atlas in Blender, remap UVs. Fewer draw calls, less memory, but requires asset processing work.
3. **Hybrid:** Use the meshes as-is but dynamically assign textures from a pre-built atlas at runtime using custom UV offsets.

Recommendation: Given the low triangle count, option 1 (use as-is) is viable for a 4-player game where max ~17 cards are visible simultaneously. The draw call overhead is manageable on GameLift Streams GPU hardware.

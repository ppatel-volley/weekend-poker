import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { buildCardMeshMap } from './cardUtils.js'

const DECK_GLB_PATH = '/52-card_deck.glb'

/**
 * Card texture dimensions from the GLB (256x512 JPEG).
 * Used to size the offscreen canvas for extraction.
 */
const TEX_WIDTH = 256
const TEX_HEIGHT = 512

/**
 * Extract the unique face texture from a card group.
 *
 * Each card group has 3 mesh primitives:
 *   - _01 suffix: shared front face material (01_-_Default)
 *   - _XX suffix: unique card face material (02_-_Default .. material_53)
 *   - _07 suffix: shared body/edge material (07_-_Default)
 *
 * The unique card face is the mesh whose material is NOT named
 * "01_-_Default" and NOT named "07_-_Default".
 */
function extractFaceTexture(
  cardGroup: THREE.Object3D,
): THREE.Texture | null {
  let faceTexture: THREE.Texture | null = null

  cardGroup.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return
    if (faceTexture) return // already found

    const mat = child.material as THREE.MeshStandardMaterial
    if (!mat?.name) return

    // Skip the shared front-face and body materials
    if (mat.name === '01_-_Default' || mat.name === '07_-_Default') return

    // This is the unique card face material
    const tex = mat.map
    if (tex) {
      faceTexture = tex
    }
  })

  return faceTexture
}

/**
 * Render a Three.js texture to a data URL using an offscreen canvas.
 */
function textureToDataURL(texture: THREE.Texture): string {
  const image = texture.image as
    | HTMLImageElement
    | HTMLCanvasElement
    | ImageBitmap

  const canvas = document.createElement('canvas')
  canvas.width = TEX_WIDTH
  canvas.height = TEX_HEIGHT

  const ctx = canvas.getContext('2d')!
  ctx.drawImage(image, 0, 0, TEX_WIDTH, TEX_HEIGHT)

  return canvas.toDataURL('image/png')
}

/** Resolved map of card name -> data URL (singleton). */
let textureMapPromise: Promise<Map<string, string>> | null = null

/**
 * Load the deck GLB and extract all card face textures as data URLs.
 *
 * Returns a `Map<string, string>` where the key is a normalised
 * card name (e.g. "Eight of Hearts") and the value is a data URL
 * for the card face image.
 *
 * This is a singleton — calling it multiple times returns the same
 * promise, so the GLB is only loaded once.
 */
export function loadCardTextures(): Promise<Map<string, string>> {
  if (textureMapPromise) return textureMapPromise

  textureMapPromise = new Promise<Map<string, string>>((resolve, reject) => {
    const loader = new GLTFLoader()

    loader.load(
      DECK_GLB_PATH,
      (gltf) => {
        const meshMap = buildCardMeshMap(gltf.scene)
        const textureMap = new Map<string, string>()

        for (const [name, group] of meshMap) {
          const tex = extractFaceTexture(group)
          if (tex) {
            textureMap.set(name, textureToDataURL(tex))
          }
        }

        resolve(textureMap)
      },
      undefined,
      (error) => {
        textureMapPromise = null // allow retry on failure
        reject(error)
      },
    )
  })

  return textureMapPromise
}

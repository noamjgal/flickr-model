import type { Camera } from "./magnifier"
import { screenToWorld } from "./magnifier"
import {
  pickTileZoom,
  tileWorldRect,
  type WorldSpace,
  worldRectToTileRange,
} from "./geo"

type TileKey = string

const TILE_URL = (z: number, x: number, y: number) =>
  `https://tile.openstreetmap.org/${z}/${x}/${y}.png`

export class MapTileManager {
  private tiles = new Map<TileKey, HTMLImageElement>()
  private layer: HTMLElement

  constructor(layer: HTMLElement, private world: WorldSpace, private zoomMult = 1) {
    this.layer = layer
  }

  update(camera: Camera, viewportW: number, viewportH: number) {
    const zoom = camera.zoom * this.zoomMult
    const z = pickTileZoom(zoom)

    const tl = screenToWorld(camera, 0, 0)
    const br = screenToWorld(camera, viewportW, viewportH)
    const margin = tileWorldRect(0, 0, z, this.world).size * 2
    const minX = Math.min(tl.x, br.x) - margin
    const minY = Math.min(tl.y, br.y) - margin
    const maxX = Math.max(tl.x, br.x) + margin
    const maxY = Math.max(tl.y, br.y) + margin

    const { minTx, maxTx, minTy, maxTy } = worldRectToTileRange(
      minX,
      minY,
      maxX,
      maxY,
      z,
      this.world,
    )

    const needed = new Set<TileKey>()

    for (let tx = minTx; tx <= maxTx; tx++) {
      for (let ty = minTy; ty <= maxTy; ty++) {
        const key = `${z}/${tx}/${ty}`
        needed.add(key)

        let img = this.tiles.get(key)
        if (!img) {
          img = document.createElement("img")
          img.alt = ""
          img.decoding = "async"
          img.draggable = false
          img.className = "map-tile"
          img.src = TILE_URL(z, tx, ty)
          this.layer.appendChild(img)
          this.tiles.set(key, img)
        }

        const rect = tileWorldRect(tx, ty, z, this.world)
        img.style.left = `${rect.x}px`
        img.style.top = `${rect.y}px`
        img.style.width = `${rect.size}px`
        img.style.height = `${rect.size}px`
      }
    }

    for (const [key, img] of this.tiles) {
      if (!needed.has(key)) {
        img.remove()
        this.tiles.delete(key)
      }
    }
  }

  dispose() {
    for (const img of this.tiles.values()) img.remove()
    this.tiles.clear()
  }
}

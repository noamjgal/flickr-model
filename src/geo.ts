import type { GeoBounds } from "./types"

export const WORLD_WIDTH = 1400
export const WORLD_HEIGHT = 1050

export function project(
  lon: number,
  lat: number,
  bounds: GeoBounds,
  width = WORLD_WIDTH,
  height = WORLD_HEIGHT,
): { x: number; y: number } {
  const x = ((lon - bounds.minLon) / (bounds.maxLon - bounds.minLon)) * width
  const y = (1 - (lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * height
  return { x, y }
}

export function lonToTileX(lon: number, zoom: number): number {
  return Math.floor(((lon + 180) / 360) * 2 ** zoom)
}

export function latToTileY(lat: number, zoom: number): number {
  const rad = (lat * Math.PI) / 180
  return Math.floor(
    ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * 2 ** zoom,
  )
}

export function tileYToLat(ty: number, zoom: number): number {
  const n = Math.PI - (2 * Math.PI * ty) / 2 ** zoom
  return (180 / Math.PI) * Math.atan(Math.sinh(n))
}

export function tileBounds(tx: number, ty: number, zoom: number) {
  const n = 2 ** zoom
  return {
    lonW: (tx / n) * 360 - 180,
    lonE: ((tx + 1) / n) * 360 - 180,
    latN: tileYToLat(ty, zoom),
    latS: tileYToLat(ty + 1, zoom),
  }
}

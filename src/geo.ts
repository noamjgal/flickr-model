import type { GeoBounds } from "./types"

export const TILE_SIZE = 256
export const REF_ZOOM = 14
export const MAP_PADDING = 0.25

export interface WorldSpace {
  bounds: GeoBounds
  width: number
  height: number
  originX: number
  originY: number
}

export function lonLatToMercator(lon: number, lat: number, zoom: number): { x: number; y: number } {
  const scale = TILE_SIZE * 2 ** zoom
  const x = ((lon + 180) / 360) * scale
  const latRad = (lat * Math.PI) / 180
  const y =
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * scale
  return { x, y }
}

export function paddedBounds(bounds: GeoBounds, padding = MAP_PADDING): GeoBounds {
  const lonPad = (bounds.maxLon - bounds.minLon) * padding
  const latPad = (bounds.maxLat - bounds.minLat) * padding
  return {
    minLon: bounds.minLon - lonPad,
    maxLon: bounds.maxLon + lonPad,
    minLat: bounds.minLat - latPad,
    maxLat: bounds.maxLat + latPad,
  }
}

export function createWorldSpace(dataBounds: GeoBounds): WorldSpace {
  const bounds = paddedBounds(dataBounds)
  const nw = lonLatToMercator(bounds.minLon, bounds.maxLat, REF_ZOOM)
  const se = lonLatToMercator(bounds.maxLon, bounds.minLat, REF_ZOOM)
  return {
    bounds,
    width: se.x - nw.x,
    height: se.y - nw.y,
    originX: nw.x,
    originY: nw.y,
  }
}

export function project(lon: number, lat: number, world: WorldSpace): { x: number; y: number } {
  const m = lonLatToMercator(lon, lat, REF_ZOOM)
  return { x: m.x - world.originX, y: m.y - world.originY }
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

export function tileWorldRect(
  tx: number,
  ty: number,
  zoom: number,
  world: WorldSpace,
): { x: number; y: number; size: number } {
  const scale = 2 ** (REF_ZOOM - zoom)
  const x = tx * TILE_SIZE * scale - world.originX
  const y = ty * TILE_SIZE * scale - world.originY
  return { x, y, size: TILE_SIZE * scale }
}

export function worldRectToTileRange(
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  zoom: number,
  world: WorldSpace,
) {
  const scale = 2 ** (zoom - REF_ZOOM)
  const toTile = (wx: number, wy: number) => ({
    tx: Math.floor(((wx + world.originX) * scale) / TILE_SIZE),
    ty: Math.floor(((wy + world.originY) * scale) / TILE_SIZE),
  })
  const nw = toTile(minX, minY)
  const se = toTile(maxX, maxY)
  return {
    minTx: nw.tx,
    maxTx: se.tx,
    minTy: nw.ty,
    maxTy: se.ty,
  }
}

export function pickTileZoom(cameraZoom: number): number {
  const z = Math.floor(REF_ZOOM + Math.log2(Math.max(cameraZoom, 0.25)))
  return Math.max(10, Math.min(18, z))
}

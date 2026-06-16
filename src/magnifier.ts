import { WORLD_HEIGHT, WORLD_WIDTH } from "./geo"

export const LENS_RADIUS_MIN = 50
export const LENS_RADIUS_MAX = 240
export const LENS_RADIUS_DEFAULT = 110
export const LENS_MAGNIFICATION = 2.25

export interface Camera {
  panX: number
  panY: number
  zoom: number
}

export function fitCamera(containerWidth: number, containerHeight: number): Camera {
  const scaleX = containerWidth / WORLD_WIDTH
  const scaleY = containerHeight / WORLD_HEIGHT
  const zoom = Math.min(scaleX, scaleY)
  return {
    panX: (containerWidth - WORLD_WIDTH * zoom) / 2,
    panY: (containerHeight - WORLD_HEIGHT * zoom) / 2,
    zoom,
  }
}

export function screenToWorld(camera: Camera, sx: number, sy: number) {
  return {
    x: (sx - camera.panX) / camera.zoom,
    y: (sy - camera.panY) / camera.zoom,
  }
}

export function zoomAt(camera: Camera, sx: number, sy: number, factor: number): Camera {
  const newZoom = Math.min(12, Math.max(0.4, camera.zoom * factor))
  const ratio = newZoom / camera.zoom
  return {
    panX: sx - (sx - camera.panX) * ratio,
    panY: sy - (sy - camera.panY) * ratio,
    zoom: newZoom,
  }
}

export function syncSceneTransforms(
  worldInner: HTMLElement,
  magnifierInner: HTMLElement,
  camera: Camera,
  lensScreen: { x: number; y: number },
  worldLens: { x: number; y: number },
  radius: number,
) {
  const { panX, panY, zoom } = camera
  const M = LENS_MAGNIFICATION
  const { x: wx, y: wy } = worldLens

  worldInner.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`

  const tx = radius - wx * zoom * M
  const ty = radius - wy * zoom * M
  magnifierInner.style.transform = `translate(${tx}px, ${ty}px) scale(${zoom * M})`
}

export function syncMagnifierPosition(
  magnifier: HTMLElement,
  lensScreen: { x: number; y: number },
  radius: number,
) {
  const d = radius * 2
  magnifier.style.left = `${lensScreen.x - radius}px`
  magnifier.style.top = `${lensScreen.y - radius}px`
  magnifier.style.width = `${d}px`
  magnifier.style.height = `${d}px`
}

export function worldRadiusFromLens(camera: Camera, screenRadius: number): number {
  return screenRadius / (camera.zoom * LENS_MAGNIFICATION)
}

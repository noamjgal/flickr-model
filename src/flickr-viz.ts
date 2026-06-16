import type { FlickrPostsData, LensStats, PlacedPost } from "./types"
import { buildSpatialIndex } from "./points-layer"
import type { WorldSpace } from "./geo"
import type { MapTileManager } from "./map-tiles"
import {
  fitCamera,
  LENS_MAGNIFICATION,
  LENS_RADIUS_DEFAULT,
  LENS_RADIUS_MAX,
  LENS_RADIUS_MIN,
  screenToWorld,
  syncMagnifierPosition,
  syncSceneTransforms,
  worldRadiusFromLens,
  zoomAt,
  type Camera,
} from "./magnifier"

const SPATIAL_CELL = 40

function emptyStats(yearCount: number): LensStats {
  return {
    photos: 0,
    street: 0,
    level15: 0,
    years: Array(yearCount).fill(0),
    months: Array(12).fill(0),
  }
}

function queryLens(
  x: number,
  y: number,
  radius: number,
  index: Map<string, PlacedPost[]>,
  yearMin: number,
  yearCount: number,
): LensStats {
  const stats = emptyStats(yearCount)
  const r2 = radius * radius
  const minGx = Math.floor((x - radius) / SPATIAL_CELL)
  const maxGx = Math.floor((x + radius) / SPATIAL_CELL)
  const minGy = Math.floor((y - radius) / SPATIAL_CELL)
  const maxGy = Math.floor((y + radius) / SPATIAL_CELL)

  for (let gx = minGx; gx <= maxGx; gx++) {
    for (let gy = minGy; gy <= maxGy; gy++) {
      const bucket = index.get(`${gx},${gy}`)
      if (!bucket) continue
      for (const post of bucket) {
        const dx = post.x - x
        const dy = post.y - y
        if (dx * dx + dy * dy <= r2) {
          stats.photos += 1
          if (post.street) stats.street += 1
          else stats.level15 += 1
          if (post.year >= yearMin && post.year < yearMin + yearCount) {
            stats.years[post.year - yearMin] += 1
          }
          if (post.month >= 1 && post.month <= 12) {
            stats.months[post.month - 1] += 1
          }
        }
      }
    }
  }
  return stats
}

function renderStatsPanel(
  panel: HTMLElement,
  stats: LensStats,
  yearMin: number,
  yearCount: number,
  monthLabels: string[],
) {
  const yearLabels = Array.from({ length: yearCount }, (_, i) => yearMin + i)
  const peakYear = yearLabels[stats.years.indexOf(Math.max(...stats.years))] ?? "—"
  const peakMonth = monthLabels[stats.months.indexOf(Math.max(...stats.months))] ?? "—"
  const streetPct = stats.photos ? Math.round((stats.street / stats.photos) * 100) : 0

  const yearBars = stats.years
    .map((v, i) => {
      const max = Math.max(...stats.years, 1)
      const h = Math.round((v / max) * 48)
      return `<div class="year-bar" style="height:${h}px" title="${yearLabels[i]}: ${v}"><span>${yearLabels[i] % 100}</span></div>`
    })
    .join("")

  const monthBars = stats.months
    .map((v, i) => {
      const max = Math.max(...stats.months, 1)
      const h = Math.round((v / max) * 36)
      return `<div class="month-bar" style="height:${h}px" title="${monthLabels[i]}: ${v}"></div>`
    })
    .join("")

  panel.innerHTML = `
    <h2>Lens readout</h2>
    <div class="stat-grid">
      <div class="stat"><span class="stat-value">${stats.photos.toLocaleString()}</span><span class="stat-label">photos</span></div>
      <div class="stat"><span class="stat-value">${streetPct}%</span><span class="stat-label">street</span></div>
      <div class="stat"><span class="stat-value">${stats.level15.toLocaleString()}</span><span class="stat-label">aerial</span></div>
    </div>
    <p class="peak">Peak year <strong>${peakYear}</strong> · Peak month <strong>${peakMonth}</strong></p>
    <h3>By year</h3>
    <div class="year-bars">${yearBars}</div>
    <h3>Seasonal rhythm</h3>
    <div class="month-bars">${monthBars}</div>
  `
}

export interface SceneElements {
  worldInner: HTMLElement
  magnifier: HTMLElement
  magnifierInner: HTMLElement
  baseTiles: MapTileManager
  magTiles: MapTileManager
}

export function runFlickrViz(
  container: HTMLDivElement,
  data: FlickrPostsData,
  posts: PlacedPost[],
  statsPanel: HTMLElement,
  lensSlider: HTMLInputElement,
  lensCountEl: HTMLDivElement,
  world: WorldSpace,
  scene: SceneElements,
) {
  const yearCount = data.yearMax - data.yearMin + 1
  const spatialIndex = buildSpatialIndex(posts)

  let camera: Camera = fitCamera(world.width, world.height, container.clientWidth, container.clientHeight)
  let lensRadius = LENS_RADIUS_DEFAULT
  let isPanning = false
  let panStart = { x: 0, y: 0, panX: 0, panY: 0 }

  const lensScreen = { x: container.clientWidth / 2, y: container.clientHeight / 2 }
  let worldLens = screenToWorld(camera, lensScreen.x, lensScreen.y)

  lensSlider.min = String(LENS_RADIUS_MIN)
  lensSlider.max = String(LENS_RADIUS_MAX)
  lensSlider.value = String(LENS_RADIUS_DEFAULT)

  const syncAll = () => {
    syncSceneTransforms(
      scene.worldInner,
      scene.magnifierInner,
      camera,
      lensScreen,
      worldLens,
      lensRadius,
    )
    syncMagnifierPosition(scene.magnifier, lensScreen, lensRadius)
    lensCountEl.style.left = `${lensScreen.x}px`
    lensCountEl.style.top = `${lensScreen.y - lensRadius - 30}px`

    scene.baseTiles.update(camera, container.clientWidth, container.clientHeight)

    const magCamera: Camera = {
      zoom: camera.zoom * LENS_MAGNIFICATION,
      panX: lensRadius - worldLens.x * camera.zoom * LENS_MAGNIFICATION,
      panY: lensRadius - worldLens.y * camera.zoom * LENS_MAGNIFICATION,
    }
    scene.magTiles.update(magCamera, lensRadius * 2, lensRadius * 2)
  }

  function updateLens() {
    const stats = queryLens(
      worldLens.x,
      worldLens.y,
      worldRadiusFromLens(camera, lensRadius),
      spatialIndex,
      data.yearMin,
      yearCount,
    )
    lensCountEl.textContent = `${stats.photos.toLocaleString()} photos`
    renderStatsPanel(statsPanel, stats, data.yearMin, yearCount, data.monthLabels)
  }

  const pointerPos = (e: MouseEvent | WheelEvent) => {
    const rect = container.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const onMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return
    isPanning = true
    container.classList.add("is-panning")
    panStart = { x: e.clientX, y: e.clientY, panX: camera.panX, panY: camera.panY }
  }

  const onMouseMove = (e: MouseEvent) => {
    const pos = pointerPos(e)

    if (isPanning) {
      camera = {
        ...camera,
        panX: panStart.panX + (e.clientX - panStart.x),
        panY: panStart.panY + (e.clientY - panStart.y),
      }
      worldLens = screenToWorld(camera, lensScreen.x, lensScreen.y)
      syncAll()
      updateLens()
      return
    }

    lensScreen.x = pos.x
    lensScreen.y = pos.y
    worldLens = screenToWorld(camera, pos.x, pos.y)
    syncAll()
    updateLens()
  }

  const onMouseUp = () => {
    isPanning = false
    container.classList.remove("is-panning")
  }

  const onWheel = (e: WheelEvent) => {
    e.preventDefault()
    const pos = pointerPos(e)
    const factor = e.deltaY > 0 ? 0.9 : 1.1
    camera = zoomAt(camera, pos.x, pos.y, factor)
    worldLens = screenToWorld(camera, lensScreen.x, lensScreen.y)
    syncAll()
    updateLens()
  }

  const onResize = () => {
    camera = fitCamera(world.width, world.height, container.clientWidth, container.clientHeight)
    worldLens = screenToWorld(camera, lensScreen.x, lensScreen.y)
    syncAll()
    updateLens()
  }

  const onLensSize = () => {
    lensRadius = Number(lensSlider.value)
    syncAll()
    updateLens()
  }

  container.addEventListener("mousedown", onMouseDown)
  container.addEventListener("mousemove", onMouseMove)
  window.addEventListener("mouseup", onMouseUp)
  container.addEventListener("wheel", onWheel, { passive: false })
  window.addEventListener("resize", onResize)
  lensSlider.addEventListener("input", onLensSize)

  scene.magnifier.classList.add("ready")
  syncAll()
  updateLens()

  return () => {
    container.removeEventListener("mousedown", onMouseDown)
    container.removeEventListener("mousemove", onMouseMove)
    window.removeEventListener("mouseup", onMouseUp)
    container.removeEventListener("wheel", onWheel)
    window.removeEventListener("resize", onResize)
    lensSlider.removeEventListener("input", onLensSize)
  }
}

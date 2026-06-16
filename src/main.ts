import "./styles.css"
import { runFlickrViz } from "./flickr-viz"
import { createPointsLayer, placePosts } from "./points-layer"
import type { FlickrPostsData } from "./types"
import { latToTileY, lonToTileX, project, tileBounds, WORLD_HEIGHT, WORLD_WIDTH } from "./geo"

function buildMapLayer(parent: HTMLElement, data: FlickrPostsData) {
  const zoom = 14
  const minTx = lonToTileX(data.bounds.minLon, zoom)
  const maxTx = lonToTileX(data.bounds.maxLon, zoom)
  const minTy = latToTileY(data.bounds.maxLat, zoom)
  const maxTy = latToTileY(data.bounds.minLat, zoom)

  const images: HTMLImageElement[] = []

  for (let tx = minTx; tx <= maxTx; tx++) {
    for (let ty = minTy; ty <= maxTy; ty++) {
      const bounds = tileBounds(tx, ty, zoom)
      const nw = project(bounds.lonW, bounds.latN, data.bounds)
      const se = project(bounds.lonE, bounds.latS, data.bounds)

      const img = document.createElement("img")
      img.src = `https://tile.openstreetmap.org/${zoom}/${tx}/${ty}.png`
      img.alt = ""
      img.loading = "eager"
      img.decoding = "async"
      img.draggable = false
      img.className = "map-tile"
      img.style.left = `${nw.x}px`
      img.style.top = `${nw.y}px`
      img.style.width = `${se.x - nw.x}px`
      img.style.height = `${se.y - nw.y}px`
      parent.appendChild(img)
      images.push(img)
    }
  }

  return images
}

function buildWorldInner(data: FlickrPostsData, posts: ReturnType<typeof placePosts>) {
  const worldInner = document.createElement("div")
  worldInner.className = "world-inner"
  worldInner.style.width = `${WORLD_WIDTH}px`
  worldInner.style.height = `${WORLD_HEIGHT}px`

  const mapLayer = document.createElement("div")
  mapLayer.className = "map-layer"
  const images = buildMapLayer(mapLayer, data)
  worldInner.appendChild(mapLayer)

  const pointsCanvas = createPointsLayer(posts)
  worldInner.appendChild(pointsCanvas)

  return { worldInner, images }
}

function waitForImages(images: HTMLImageElement[]): Promise<void> {
  return Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) resolve()
          else {
            img.addEventListener("load", () => resolve(), { once: true })
            img.addEventListener("error", () => resolve(), { once: true })
          }
        }),
    ),
  ).then(() => undefined)
}

async function main() {
  const container = document.getElementById("viz-container") as HTMLDivElement
  const statsPanel = document.getElementById("stats-panel") as HTMLElement
  const lensSlider = document.getElementById("lens-size") as HTMLInputElement
  const lensCount = document.getElementById("lens-count") as HTMLDivElement

  container.innerHTML = `<p class="loading">Loading posts…</p>`

  const dataUrl = `${import.meta.env.BASE_URL}data/flickr-posts.json`
  const response = await fetch(dataUrl)
  if (!response.ok) {
    throw new Error(`Could not load data (${response.status}) from ${dataUrl}`)
  }
  const data = (await response.json()) as FlickrPostsData
  container.innerHTML = `<p class="loading">Plotting ${data.totalPhotos.toLocaleString()} posts…</p>`

  const posts = placePosts(data)
  const base = buildWorldInner(data, posts)
  const magnified = buildWorldInner(data, posts)

  container.innerHTML = `<p class="loading">Loading map tiles…</p>`
  await Promise.all([waitForImages(base.images), waitForImages(magnified.images)])

  container.innerHTML = ""

  const sceneBase = document.createElement("div")
  sceneBase.className = "scene-base"
  sceneBase.appendChild(base.worldInner)
  container.appendChild(sceneBase)

  const magnifier = document.createElement("div")
  magnifier.className = "magnifier"
  magnifier.appendChild(magnified.worldInner)
  container.appendChild(magnifier)

  const dispose = runFlickrViz(container, data, posts, statsPanel, lensSlider, lensCount, {
    worldInner: base.worldInner,
    magnifier,
    magnifierInner: magnified.worldInner,
  })

  window.addEventListener("beforeunload", () => dispose())
}

main().catch((err) => {
  console.error(err)
  const container = document.getElementById("viz-container")
  if (container) {
    container.innerHTML = `<p class="error">Failed to load visualization: ${err}</p>`
  }
})

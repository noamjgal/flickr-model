import "./styles.css"
import { runFlickrViz } from "./flickr-viz"
import { createPointsLayer, placePosts } from "./points-layer"
import type { FlickrPostsData } from "./types"
import { createWorldSpace } from "./geo"
import { MapTileManager } from "./map-tiles"
import { LENS_MAGNIFICATION } from "./magnifier"

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

  const world = createWorldSpace(data.bounds)
  const posts = placePosts(data, world)

  container.innerHTML = ""

  const sceneBase = document.createElement("div")
  sceneBase.className = "scene-base"

  const baseWorldInner = document.createElement("div")
  baseWorldInner.className = "world-inner"
  baseWorldInner.style.width = `${world.width}px`
  baseWorldInner.style.height = `${world.height}px`

  const baseMapLayer = document.createElement("div")
  baseMapLayer.className = "map-layer"
  baseWorldInner.appendChild(baseMapLayer)
  baseWorldInner.appendChild(createPointsLayer(posts, world))
  sceneBase.appendChild(baseWorldInner)
  container.appendChild(sceneBase)

  const magnifier = document.createElement("div")
  magnifier.className = "magnifier"

  const magWorldInner = document.createElement("div")
  magWorldInner.className = "world-inner"
  magWorldInner.style.width = `${world.width}px`
  magWorldInner.style.height = `${world.height}px`

  const magMapLayer = document.createElement("div")
  magMapLayer.className = "map-layer"
  magWorldInner.appendChild(magMapLayer)
  magWorldInner.appendChild(createPointsLayer(posts, world))
  magnifier.appendChild(magWorldInner)
  container.appendChild(magnifier)

  const baseTiles = new MapTileManager(baseMapLayer, world)
  const magTiles = new MapTileManager(magMapLayer, world, LENS_MAGNIFICATION)

  const dispose = runFlickrViz(container, data, posts, statsPanel, lensSlider, lensCount, world, {
    worldInner: baseWorldInner,
    magnifier,
    magnifierInner: magWorldInner,
    baseTiles,
    magTiles,
  })

  window.addEventListener("beforeunload", () => {
    dispose()
    baseTiles.dispose()
    magTiles.dispose()
  })
}

main().catch((err) => {
  console.error(err)
  const container = document.getElementById("viz-container")
  if (container) {
    container.innerHTML = `<p class="error">Failed to load visualization: ${err}</p>`
  }
})

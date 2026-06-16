import type { FlickrPostsData, PlacedPost } from "./types"
import { project, type WorldSpace } from "./geo"

const STREET_COLOR = "#ff8b6aee"
const AERIAL_COLOR = "#7ec8ffee"

export function placePosts(data: FlickrPostsData, world: WorldSpace): PlacedPost[] {
  return data.posts.map(([lon, lat, category, year, month]) => {
    const { x, y } = project(lon, lat, world)
    return { x, y, lon, lat, street: category === 0, year, month }
  })
}

export function buildSpatialIndex(posts: PlacedPost[], cellSize = 40): Map<string, PlacedPost[]> {
  const index = new Map<string, PlacedPost[]>()
  for (const post of posts) {
    const key = `${Math.floor(post.x / cellSize)},${Math.floor(post.y / cellSize)}`
    const bucket = index.get(key)
    if (bucket) bucket.push(post)
    else index.set(key, [post])
  }
  return index
}

export function createPointsLayer(posts: PlacedPost[], world: WorldSpace): HTMLCanvasElement {
  const canvas = document.createElement("canvas")
  canvas.className = "posts-layer"
  canvas.width = world.width
  canvas.height = world.height

  const ctx = canvas.getContext("2d")!
  for (const post of posts) {
    ctx.fillStyle = post.street ? STREET_COLOR : AERIAL_COLOR
    ctx.fillRect(post.x, post.y, 2, 2)
  }

  return canvas
}

export interface GeoBounds {
  minLon: number
  maxLon: number
  minLat: number
  maxLat: number
}

/** Compact post: [lon, lat, category, year, month] — category 0=Street, 1=Level15 */
export type FlickrPostRecord = [number, number, number, number, number]

export interface FlickrPostsData {
  bounds: GeoBounds
  yearMin: number
  yearMax: number
  monthLabels: string[]
  totalPhotos: number
  posts: FlickrPostRecord[]
}

export interface PlacedPost {
  x: number
  y: number
  lon: number
  lat: number
  street: boolean
  year: number
  month: number
}

export interface LensStats {
  photos: number
  street: number
  level15: number
  years: number[]
  months: number[]
}

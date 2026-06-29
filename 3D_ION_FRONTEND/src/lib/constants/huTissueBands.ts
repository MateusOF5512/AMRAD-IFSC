/** Hounsfield tissue zones for infill vs HU regression chart (clinical reference scale). */

export const HU_REGRESSION_Y_DOMAIN: [number, number] = [-1000, 1000]

export const HU_REGRESSION_X_DOMAIN: [number, number] = [0, 100]

export type HuTissueBandId =
  | 'corticalBone'
  | 'trabecularBone'
  | 'water'
  | 'fat'
  | 'unlabeled'
  | 'lung'

export interface HuTissueBand {
  id: HuTissueBandId
  yMin: number
  yMax: number
  fill: string
  fillOpacity: number
  /** If false, only background color (no side label). */
  showLabel: boolean
}

/** Bands ordered back-to-front (first = drawn behind). */
export const HU_TISSUE_BANDS: HuTissueBand[] = [
  { id: 'lung', yMin: -900, yMax: -500, fill: '#b8c9d9', fillOpacity: 0.55, showLabel: true },
  { id: 'unlabeled', yMin: -500, yMax: -100, fill: '#ffffff', fillOpacity: 1, showLabel: false },
  { id: 'fat', yMin: -100, yMax: -50, fill: '#f3e4b8', fillOpacity: 0.65, showLabel: true },
  { id: 'water', yMin: -50, yMax: 100, fill: '#b9d9f0', fillOpacity: 0.5, showLabel: true },
  { id: 'trabecularBone', yMin: 100, yMax: 250, fill: '#e2d4bc', fillOpacity: 0.6, showLabel: true },
  { id: 'corticalBone', yMin: 250, yMax: 1000, fill: '#c4a882', fillOpacity: 0.55, showLabel: true },
]

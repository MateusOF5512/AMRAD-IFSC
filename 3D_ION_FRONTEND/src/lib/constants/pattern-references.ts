/**
 * Pattern References for 3D Infill Regression Charts
 * 
 * Defines visual and data properties for infill pattern types used in
 * comparative analysis of 3D printed materials and their radiological properties.
 * 
 * Each pattern has:
 * - id: Unique identifier (matches backend pattern_type IDs)
 * - name: Display name
 * - color: Hex color for visualization (from project color palette)
 * - minHU: Minimum Hounsfield Unit typically observed for this pattern
 * - maxHU: Maximum Hounsfield Unit typically observed for this pattern
 * - description: Scientific description of the pattern
 */

export interface PatternReference {
  id: string;
  name: string;
  color: string;
  minHU: number;
  maxHU: number;
  description: string;
}

// Color palette from project (8 colors, recycled for 13 patterns)
const COLOR_PALETTE = [
  '#3b82f6', // Blue
  '#ef4444', // Red
  '#10b981', // Green
  '#f59e0b', // Amber
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#14b8a6', // Teal
  '#f97316', // Orange
];

/**
 * Pattern references mapping pattern_type to visual and data properties
 * Based on typical observations from medical CT imaging of 3D printed materials
 * 
 * HU ranges represent typical min/max values observed when materials are tested
 * at varying infill percentages (40%, 60%, 80%, 100%)
 */
export const PATTERN_REFERENCES: Record<string, PatternReference> = {
  rectilinear: {
    id: 'rectilinear',
    name: 'Rectilinear',
    color: COLOR_PALETTE[0],
    minHU: -300,
    maxHU: 500,
    description: 'Lines printed in one direction, then perpendicular direction. Classic infill pattern.',
  },
  grid: {
    id: 'grid',
    name: 'Grid',
    color: COLOR_PALETTE[1],
    minHU: -250,
    maxHU: 550,
    description: 'Regular grid pattern (rectilinear rotated 45°). Higher density than rectilinear.',
  },
  line: {
    id: 'line',
    name: 'Line',
    color: COLOR_PALETTE[2],
    minHU: -400,
    maxHU: 300,
    description: 'Single direction parallel lines. Lowest density option.',
  },
  cubic: {
    id: 'cubic',
    name: 'Cubic',
    color: COLOR_PALETTE[3],
    minHU: -200,
    maxHU: 600,
    description: '3D cubic lattice structure. Provides isotropic properties.',
  },
  triangles: {
    id: 'triangles',
    name: 'Triangles',
    color: COLOR_PALETTE[4],
    minHU: -150,
    maxHU: 650,
    description: 'Triangular infill pattern. High strength-to-weight ratio.',
  },
  gyroid: {
    id: 'gyroid',
    name: 'Gyroid',
    color: COLOR_PALETTE[5],
    minHU: -100,
    maxHU: 700,
    description: 'Triply periodic minimal surface. Biomimetic structure with optimal properties.',
  },
  honeycomb: {
    id: 'honeycomb',
    name: 'Honeycomb',
    color: COLOR_PALETTE[6],
    minHU: -50,
    maxHU: 750,
    description: 'Hexagonal honeycomb structure. Maximum strength with minimal material.',
  },
  cross: {
    id: 'cross',
    name: 'Cross',
    color: COLOR_PALETTE[7],
    minHU: -350,
    maxHU: 400,
    description: 'Cross pattern (+ shape). Directional strength along axes.',
  },
  '3d_honeycomb': {
    id: '3d_honeycomb',
    name: '3D Honeycomb',
    color: COLOR_PALETTE[0],
    minHU: 0,
    maxHU: 800,
    description: '3D hexagonal lattice. Full spatial honeycomb structure.',
  },
  hilbert: {
    id: 'hilbert',
    name: 'Hilbert Curve',
    color: COLOR_PALETTE[1],
    minHU: -200,
    maxHU: 550,
    description: 'Space-filling Hilbert curve. Continuous path with uniform coverage.',
  },
  octagram: {
    id: 'octagram',
    name: 'Octagram Spiral',
    color: COLOR_PALETTE[2],
    minHU: -280,
    maxHU: 450,
    description: 'Octagram spiral pattern. Combines circular and angular elements.',
  },
  crosshatch: {
    id: 'crosshatch',
    name: 'CrossHatch',
    color: COLOR_PALETTE[3],
    minHU: -320,
    maxHU: 380,
    description: 'Cross-hatched pattern with dense overlapping lines.',
  },
  archimedean: {
    id: 'archimedean',
    name: 'Archimedean Chords',
    color: COLOR_PALETTE[4],
    minHU: -180,
    maxHU: 620,
    description: 'Archimedean spiral-based infill. Smooth curved pattern.',
  },
};

/**
 * Get pattern reference by ID
 * @param patternId - Pattern identifier
 * @returns PatternReference object or undefined if not found
 */
export function getPatternReference(patternId: string): PatternReference | undefined {
  return PATTERN_REFERENCES[patternId.toLowerCase()];
}

/**
 * Get color for a specific pattern
 * @param patternId - Pattern identifier
 * @returns Hex color string or fallback color
 */
export function getPatternColor(patternId: string): string {
  const pattern = getPatternReference(patternId);
  return pattern?.color || COLOR_PALETTE[0];
}

/**
 * Get all pattern references as array
 * @returns Array of PatternReference objects
 */
export function getAllPatternReferences(): PatternReference[] {
  return Object.values(PATTERN_REFERENCES);
}

/**
 * Create reference bands configuration for Recharts
 * Used to visualize HU ranges for each pattern as background bands
 * 
 * @returns Array of reference band configurations
 */
export function getReferencebandsConfig(): Array<{
  pattern: PatternReference;
  yAxisId?: string;
}> {
  return getAllPatternReferences().map((pattern) => ({
    pattern,
  }));
}

// Export color palette for direct use in components
export const PROJECT_COLORS = COLOR_PALETTE;

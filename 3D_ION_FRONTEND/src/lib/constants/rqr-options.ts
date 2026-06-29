/** Beam quality (RQR) options for attenuation tests */
export const RQR_ENERGY_OPTIONS = [
  'RQR2',
  'RQR3',
  'RQR4',
  'RQR5',
  'RQR6',
  'RQR7',
  'RQR8',
  'RQR9',
  'RQR10',
  'RQR-M1',
  'RQR-M2',
  'RQR-M3',
  'RQR-M4',
] as const

export type RqrEnergy = (typeof RQR_ENERGY_OPTIONS)[number]

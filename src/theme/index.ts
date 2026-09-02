export const colors = {
  obsidian: '#030708',
  deepTeal: '#062326',
  techTeal: '#0B3A3D',
  cyan: '#00E5FF',
  violet: '#7B61FF',
  silver: '#A6B2B8',
  white: '#F7FCFC',
  muted: '#789095',
  glass: 'rgba(10, 40, 43, 0.74)',
  glassBorder: 'rgba(118, 239, 244, 0.16)',
  line: 'rgba(166, 178, 184, 0.12)',
  success: '#53E5BC',
  warning: '#F2B441',
  danger: '#FF6B6B',
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
} as const;

export const radii = {
  sm: 12,
  md: 18,
  lg: 24,
  pill: 999,
} as const;

export const typography = {
  display: 42,
  hero: 34,
  h1: 26,
  h2: 20,
  title: 16,
  body: 14,
  caption: 12,
  label: 11,
} as const;

export const shadows = {
  cyanGlow: {
    boxShadow: '0px 8px 20px rgba(0, 229, 255, 0.2)',
    elevation: 10,
  },
} as const;

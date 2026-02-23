/**
 * Pi Day — design tokens
 * Clean, modern, iOS-native feel.
 */

export const spacing = {
  xxs: 2,
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  xs:  6,
  sm:  10,
  md:  14,
  lg:  18,
  xl:  24,
  xxl: 32,
  full: 9999,
} as const;

export const typography = {
  caption:      { fontSize: 11, fontWeight: '500' as const, letterSpacing: 0.3 },
  footnote:     { fontSize: 12, fontWeight: '400' as const },
  subhead:      { fontSize: 13, fontWeight: '600' as const, letterSpacing: 0.1 },
  body:         { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  bodyEmphasis: { fontSize: 15, fontWeight: '600' as const },
  callout:      { fontSize: 16, fontWeight: '600' as const },
  title3:       { fontSize: 18, fontWeight: '600' as const, letterSpacing: -0.3 },
  title2:       { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.5 },
  title1:       { fontSize: 26, fontWeight: '700' as const, letterSpacing: -0.7 },
  largeTitle:   { fontSize: 32, fontWeight: '800' as const, letterSpacing: -1.2 },
} as const;

export const colors = {
  // Backgrounds — clean white layering
  background:      '#F2F2F7',
  surface:         '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceSunken:   '#F2F2F7',
  groupedBg:       '#F2F2F7',

  // Text hierarchy
  label:           '#09090B',
  labelSecondary:  '#52525B',
  labelTertiary:   '#A1A1AA',
  labelQuaternary: '#D4D4D8',

  // UI chrome
  separator:     'rgba(0,0,0,0.07)',
  fill:          'rgba(0,0,0,0.06)',
  fillSecondary: 'rgba(0,0,0,0.03)',
  fillTertiary:  'rgba(0,0,0,0.015)',

  // Semantic
  destructive: '#EF4444',
  success:     '#22C55E',
  warning:     '#F59E0B',
  info:        '#3B82F6',
} as const;

export const shadows = {
  xs: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 24,
    elevation: 8,
  },
  fab: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.20,
    shadowRadius: 20,
    elevation: 12,
  },
} as const;

export const animation = {
  spring:       { damping: 18, stiffness: 220, mass: 0.8 },
  springSnappy: { damping: 22, stiffness: 380, mass: 0.6 },
  springGentle: { damping: 28, stiffness: 120, mass: 1.0 },
  duration:     { fast: 120, normal: 220, slow: 360, verySlow: 520 },
} as const;

// ────────────────────────────────────────────────────────────────────────────
// Animal Crossing Theme Definitions — Vibrant Edition
// ────────────────────────────────────────────────────────────────────────────

export type ACThemePattern = 'leaf' | 'mushroom' | 'flower' | 'star' | 'wave' | 'none';

export type ACThemeId =
  | 'default_ios'
  | 'resident_services'
  | 'tom_nooks_shop'
  | 'nook_inc'
  | 'isabelles_desk'
  | 'able_sisters'
  | 'kk_slider_stage'
  | 'waterfall_cove';

export interface ACThemeColors {
  // Background layers
  background: string;
  surface: string;
  surfaceElevated: string;
  surfaceSunken: string;
  groupedBg: string;
  // Tab bar
  tabBarBackground: string;
  tabBarBorder: string;
  // Chrome
  separator: string;
  fill: string;
  fillSecondary: string;
  fillTertiary: string;
  // Text
  label: string;
  labelSecondary: string;
  labelTertiary: string;
  labelQuaternary: string;
  // Gradient pair for LinearGradient accents (from → to)
  gradientFrom: string;
  gradientTo: string;
  // Tint for background.png overlay
  bgTint: string;
  bgTintOpacity: number;
}

export interface ACTheme {
  id: ACThemeId;
  name: string;
  emoji: string;
  description: string;
  pattern: ACThemePattern;
  patternEmoji: string;
  colors: ACThemeColors;
}

export const PATTERN_EMOJI: Record<ACThemePattern, string> = {
  leaf:     '',
  mushroom: '',
  flower:   '',
  star:     '',
  wave:     '',
  none:     '',
};

export const AC_THEMES: Record<ACThemeId, ACTheme> = {

  default_ios: {
    id: 'default_ios',
    name: 'Classic',
    emoji: '',
    description: 'The original clean iOS look',
    pattern: 'none',
    patternEmoji: '',
    colors: {
      background:      '#F2F2F7',
      surface:         '#FFFFFF',
      surfaceElevated: '#FFFFFF',
      surfaceSunken:   '#F2F2F7',
      groupedBg:       '#F2F2F7',
      tabBarBackground: 'rgba(255,255,255,0.92)',
      tabBarBorder:    'rgba(0,0,0,0.09)',
      separator:       'rgba(0,0,0,0.08)',
      fill:            'rgba(0,0,0,0.06)',
      fillSecondary:   'rgba(0,0,0,0.04)',
      fillTertiary:    'rgba(0,0,0,0.02)',
      label:           '#09090B',
      labelSecondary:  '#52525B',
      labelTertiary:   '#A1A1AA',
      labelQuaternary: '#D4D4D8',
      gradientFrom:    '#6B8EFF',
      gradientTo:      '#A78BFA',
      bgTint:          '#6B8EFF',
      bgTintOpacity:   0.04,
    },
  },

  resident_services: {
    id: 'resident_services',
    name: 'Resident Services',
    emoji: '',
    description: 'Warm civic beige like Isabelle\'s desk',
    pattern: 'leaf',
    patternEmoji: '',
    colors: {
      background:      '#F0E8D8',       // warm amber-cream
      surface:         '#FDF8EE',       // warm near-white
      surfaceElevated: '#FFFDF5',
      surfaceSunken:   '#E8DCCA',
      groupedBg:       '#F0E8D8',
      tabBarBackground: 'rgba(253,248,238,0.92)',
      tabBarBorder:    'rgba(160,110,50,0.18)',
      separator:       'rgba(160,110,50,0.14)',
      fill:            'rgba(160,110,50,0.08)',
      fillSecondary:   'rgba(160,110,50,0.05)',
      fillTertiary:    'rgba(160,110,50,0.025)',
      label:           '#2A1E08',
      labelSecondary:  '#6B4E20',
      labelTertiary:   '#A8855A',
      labelQuaternary: '#D4B898',
      gradientFrom:    '#D4921A',
      gradientTo:      '#F5C842',
      bgTint:          '#C8922A',
      bgTintOpacity:   0.07,
    },
  },

  tom_nooks_shop: {
    id: 'tom_nooks_shop',
    name: "Tom Nook's Shop",
    emoji: '',
    description: 'Fresh mint green — shopkeeper vibes',
    pattern: 'mushroom',
    patternEmoji: '',
    colors: {
      background:      '#D8EFD8',       // rich mint
      surface:         '#F0FAF0',       // mint white
      surfaceElevated: '#F8FFF8',
      surfaceSunken:   '#C8E3C8',
      groupedBg:       '#D8EFD8',
      tabBarBackground: 'rgba(240,250,240,0.92)',
      tabBarBorder:    'rgba(38,140,58,0.20)',
      separator:       'rgba(38,140,58,0.13)',
      fill:            'rgba(38,140,58,0.08)',
      fillSecondary:   'rgba(38,140,58,0.04)',
      fillTertiary:    'rgba(38,140,58,0.02)',
      label:           '#0D240D',
      labelSecondary:  '#2A5C2A',
      labelTertiary:   '#5A9A5A',
      labelQuaternary: '#A0CAA0',
      gradientFrom:    '#2E8B3A',
      gradientTo:      '#5EC266',
      bgTint:          '#2E8B3A',
      bgTintOpacity:   0.08,
    },
  },

  nook_inc: {
    id: 'nook_inc',
    name: 'Nook Inc.',
    emoji: '',
    description: 'Tropical teal — island getaway',
    pattern: 'wave',
    patternEmoji: '',
    colors: {
      background:      '#D0EDF5',       // vivid aqua
      surface:         '#EBF8FD',       // aqua white
      surfaceElevated: '#F5FCFF',
      surfaceSunken:   '#BEE0EC',
      groupedBg:       '#D0EDF5',
      tabBarBackground: 'rgba(235,248,253,0.92)',
      tabBarBorder:    'rgba(20,140,175,0.22)',
      separator:       'rgba(20,140,175,0.14)',
      fill:            'rgba(20,140,175,0.08)',
      fillSecondary:   'rgba(20,140,175,0.04)',
      fillTertiary:    'rgba(20,140,175,0.02)',
      label:           '#04202A',
      labelSecondary:  '#145E78',
      labelTertiary:   '#4A9EB8',
      labelQuaternary: '#9AD0E0',
      gradientFrom:    '#0EA5C8',
      gradientTo:      '#38D0F5',
      bgTint:          '#0EA5C8',
      bgTintOpacity:   0.09,
    },
  },

  isabelles_desk: {
    id: 'isabelles_desk',
    name: "Isabelle's Desk",
    emoji: '',
    description: 'Sunny golden yellow — cheerful!',
    pattern: 'flower',
    patternEmoji: '',
    colors: {
      background:      '#F5E8C0',       // rich golden
      surface:         '#FDF8E0',       // sunny white
      surfaceElevated: '#FFFCE8',
      surfaceSunken:   '#ECD9A8',
      groupedBg:       '#F5E8C0',
      tabBarBackground: 'rgba(253,248,224,0.92)',
      tabBarBorder:    'rgba(200,155,10,0.22)',
      separator:       'rgba(200,155,10,0.16)',
      fill:            'rgba(200,155,10,0.08)',
      fillSecondary:   'rgba(200,155,10,0.04)',
      fillTertiary:    'rgba(200,155,10,0.02)',
      label:           '#251800',
      labelSecondary:  '#6A4800',
      labelTertiary:   '#A87C18',
      labelQuaternary: '#CEB060',
      gradientFrom:    '#EAA800',
      gradientTo:      '#FFD84D',
      bgTint:          '#EAA800',
      bgTintOpacity:   0.09,
    },
  },

  able_sisters: {
    id: 'able_sisters',
    name: 'Able Sisters',
    emoji: '',
    description: 'Dreamy lavender — couture vibes',
    pattern: 'flower',
    patternEmoji: '',
    colors: {
      background:      '#E4DCFA',       // vivid lavender
      surface:         '#F4F0FF',       // lavender white
      surfaceElevated: '#FAF8FF',
      surfaceSunken:   '#D4C8F0',
      groupedBg:       '#E4DCFA',
      tabBarBackground: 'rgba(244,240,255,0.92)',
      tabBarBorder:    'rgba(110,75,200,0.22)',
      separator:       'rgba(110,75,200,0.14)',
      fill:            'rgba(110,75,200,0.08)',
      fillSecondary:   'rgba(110,75,200,0.04)',
      fillTertiary:    'rgba(110,75,200,0.02)',
      label:           '#180E2E',
      labelSecondary:  '#4C3080',
      labelTertiary:   '#8A6EB8',
      labelQuaternary: '#BAAED8',
      gradientFrom:    '#8052D8',
      gradientTo:      '#C4A0FF',
      bgTint:          '#8052D8',
      bgTintOpacity:   0.08,
    },
  },

  kk_slider_stage: {
    id: 'kk_slider_stage',
    name: 'K.K. Slider Stage',
    emoji: '',
    description: 'Midnight blue — velvet concert hall',
    pattern: 'star',
    patternEmoji: '',
    colors: {
      background:      '#D8DCF0',       // rich cool blue
      surface:         '#EEF0FA',       // cool near-white
      surfaceElevated: '#F5F6FD',
      surfaceSunken:   '#C8CCE5',
      groupedBg:       '#D8DCF0',
      tabBarBackground: 'rgba(238,240,250,0.92)',
      tabBarBorder:    'rgba(50,60,170,0.20)',
      separator:       'rgba(50,60,170,0.13)',
      fill:            'rgba(50,60,170,0.08)',
      fillSecondary:   'rgba(50,60,170,0.04)',
      fillTertiary:    'rgba(50,60,170,0.02)',
      label:           '#08102A',
      labelSecondary:  '#283580',
      labelTertiary:   '#5C6AAE',
      labelQuaternary: '#A0AACC',
      gradientFrom:    '#3C50CC',
      gradientTo:      '#7090FF',
      bgTint:          '#3C50CC',
      bgTintOpacity:   0.08,
    },
  },

  waterfall_cove: {
    id: 'waterfall_cove',
    name: 'Waterfall Cove',
    emoji: '',
    description: 'Lush sage — mossy morning mist',
    pattern: 'wave',
    patternEmoji: '',
    colors: {
      background:      '#C8E8D8',       // vivid sage-green
      surface:         '#E8F8F0',       // sage white
      surfaceElevated: '#F2FCF7',
      surfaceSunken:   '#B8D8C8',
      groupedBg:       '#C8E8D8',
      tabBarBackground: 'rgba(232,248,240,0.92)',
      tabBarBorder:    'rgba(30,130,80,0.22)',
      separator:       'rgba(30,130,80,0.14)',
      fill:            'rgba(30,130,80,0.08)',
      fillSecondary:   'rgba(30,130,80,0.04)',
      fillTertiary:    'rgba(30,130,80,0.02)',
      label:           '#0A2018',
      labelSecondary:  '#1E5A38',
      labelTertiary:   '#4A9870',
      labelQuaternary: '#96C8B0',
      gradientFrom:    '#1E9958',
      gradientTo:      '#52D08A',
      bgTint:          '#1E9958',
      bgTintOpacity:   0.09,
    },
  },

};

export const DEFAULT_THEME_ID: ACThemeId = 'default_ios';

export const AC_THEME_ORDER: ACThemeId[] = [
  'default_ios',
  'resident_services',
  'tom_nooks_shop',
  'nook_inc',
  'isabelles_desk',
  'able_sisters',
  'kk_slider_stage',
  'waterfall_cove',
];

import type { UserId } from '@/types';

export interface ACColorSwatch {
  id: string;
  name: string;
  hex: string;
  emoji: string;
  category: 'nature' | 'sky' | 'warm' | 'cool' | 'neutral';
}

export const AC_COLOR_SWATCHES: ACColorSwatch[] = [
  // ── Original app colors ────────────────────────────────────────────────────
  { id: 'adrian_original',    name: 'Emerald',          hex: '#00563B', emoji: '', category: 'nature'  },
  { id: 'sarah_original',     name: 'Crimson',          hex: '#800020', emoji: '', category: 'warm'    },

  // ── Nature ─────────────────────────────────────────────────────────────────
  { id: 'sage_green',         name: 'Sage Green',       hex: '#7FB069', emoji: '', category: 'nature'  },
  { id: 'forest_green',       name: 'Forest Green',     hex: '#3A7D44', emoji: '', category: 'nature'  },
  { id: 'mint_leaf',          name: 'Mint Leaf',        hex: '#3DAA8D', emoji: '', category: 'nature'  },
  { id: 'fern',               name: 'Fern',             hex: '#4F7942', emoji: '', category: 'nature'  },

  // ── Sky & Cool ─────────────────────────────────────────────────────────────
  { id: 'ocean_teal',         name: 'Ocean Teal',       hex: '#2B8FA6', emoji: '', category: 'cool'    },
  { id: 'sky_blue',           name: 'Sky Blue',         hex: '#4A8EC2', emoji: '', category: 'sky'     },
  { id: 'cobalt',             name: 'Cobalt',           hex: '#3355AA', emoji: '', category: 'sky'     },
  { id: 'lavender',           name: 'Lavender',         hex: '#7E6BAD', emoji: '💜', category: 'cool'    },
  { id: 'starlight_purple',   name: 'Purple',           hex: '#6B4F9E', emoji: '', category: 'cool'    },

  // ── Warm ───────────────────────────────────────────────────────────────────
  { id: 'warm_tan',           name: 'Warm Tan',         hex: '#B87333', emoji: '', category: 'warm'    },
  { id: 'sunset_orange',      name: 'Sunset Orange',    hex: '#E07B4A', emoji: '', category: 'warm'    },
  { id: 'golden_yellow',      name: 'Golden Yellow',    hex: '#C49A10', emoji: '', category: 'warm'    },
  { id: 'mushroom_brown',     name: 'Brown',            hex: '#8B6F47', emoji: '', category: 'warm'    },

  // ── Rosy & Pink ────────────────────────────────────────────────────────────
  { id: 'rosy_pink',          name: 'Rosy Pink',        hex: '#D4607B', emoji: '', category: 'warm'    },
  { id: 'cherry_blossom',     name: 'Cherry Blossom',   hex: '#C56B8A', emoji: '', category: 'warm'    },
  { id: 'peach',              name: 'Peach',            hex: '#D98C6F', emoji: '', category: 'warm'    },
  { id: 'hot_pink',           name: 'Hot Pink',         hex: '#D44080', emoji: '', category: 'warm'    },

  // ── Neutral ────────────────────────────────────────────────────────────────
  { id: 'coral_reef',         name: 'Coral',            hex: '#C8705A', emoji: '', category: 'neutral' },
  { id: 'river_clay',         name: 'River Clay',       hex: '#9B7B6A', emoji: '', category: 'neutral' },
  { id: 'slate',              name: 'Slate',            hex: '#5A7084', emoji: '', category: 'neutral' },
  { id: 'charcoal',           name: 'Charcoal',         hex: '#4A4A5A', emoji: '', category: 'neutral' },
];

/** Default AC user colors */
export const AC_USER_COLOR_DEFAULTS: Record<UserId, string> = {
  adrian: '#00563B',  // Emerald — original Adrian color
  sarah:  '#800020',  // Crimson — original Sarah color
};

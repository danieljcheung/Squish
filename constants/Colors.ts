// Light theme colors
export const lightColors = {
  // Primary palette (from designer)
  primary: '#bae9d1',
  primaryDark: '#8ecbb0',

  // Backgrounds
  background: '#f6f8f7',

  // Surfaces
  surface: '#ffffff',

  // Text
  text: '#101914',
  textMuted: '#5b8b72',

  // Legacy aliases (for compatibility)
  mint: '#bae9d1',
  lavender: '#E8D0E8',
  peach: '#F8E0D0',
  skyBlue: '#D0E8F8',
  cream: '#f6f8f7',
  textLight: '#5b8b72',

  // Slime color palette (8 options for customization)
  slime: {
    mint: '#bae9d1',      // Default/base - soft mint green
    peach: '#FFD4BE',     // Warm peachy coral
    lavender: '#D4C4E8',  // Soft purple lavender
    skyBlue: '#B8D9F0',   // Light sky blue
    coral: '#FFB8B8',     // Soft coral/salmon
    lemon: '#F0E8A0',     // Soft lemon yellow
    rose: '#F0C4D4',      // Dusty rose pink
    sage: '#C4D9C4',      // Muted sage green
  },

  // Legacy slime colors (for compatibility)
  slimeBase: '#bae9d1',
  slimeCoach: '#FFB8B8',
  slimeBudget: '#B8D4FF',
  slimeStudy: '#E8E8B8',

  // Accent colors
  blueAccent: 'rgba(219, 234, 254, 0.4)', // blue-100/40
};

// Dark theme colors
export const darkColors = {
  // Primary palette (keep same accent colors)
  primary: '#bae9d1',
  primaryDark: '#8ecbb0',

  // Backgrounds
  background: '#141e19',

  // Surfaces
  surface: '#1c2b24',

  // Text
  text: '#ffffff',
  textMuted: '#a0a0a0',

  // Legacy aliases (for compatibility in dark mode)
  mint: '#bae9d1',
  lavender: '#E8D0E8',
  peach: '#F8E0D0',
  skyBlue: '#D0E8F8',
  cream: '#141e19',
  textLight: '#a0a0a0',

  // Slime color palette (same as light mode)
  slime: {
    mint: '#bae9d1',
    peach: '#FFD4BE',
    lavender: '#D4C4E8',
    skyBlue: '#B8D9F0',
    coral: '#FFB8B8',
    lemon: '#F0E8A0',
    rose: '#F0C4D4',
    sage: '#C4D9C4',
  },

  // Legacy slime colors
  slimeBase: '#bae9d1',
  slimeCoach: '#FFB8B8',
  slimeBudget: '#B8D4FF',
  slimeStudy: '#E8E8B8',

  // Accent colors
  blueAccent: 'rgba(186, 233, 209, 0.2)', // primary color at 20%
};

// Default export for backwards compatibility (uses light theme)
export const colors = lightColors;

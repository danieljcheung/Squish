import { Platform } from 'react-native';

// Typography scale
export const typography = {
  // Font sizes
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 32,
    '4xl': 42,
  },
  // Font weights (as string for StyleSheet)
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  // Line heights
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
};

// Spacing scale (4px base unit)
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
};

// Border radius scale
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

// Shadow presets
export const shadows = {
  sm: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
    },
    android: {
      elevation: 1,
    },
    default: {},
  }),
  md: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
    },
    android: {
      elevation: 2,
    },
    default: {},
  }),
  lg: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
    },
    android: {
      elevation: 4,
    },
    default: {},
  }),
};

// Animation durations
export const animation = {
  fast: 150,
  normal: 250,
  slow: 350,
};

// Common component sizes
export const sizes = {
  headerHeight: 56,
  tabBarHeight: 80,
  buttonHeight: 52,
  inputHeight: 52,
  avatarSm: 40,
  avatarMd: 60,
  avatarLg: 80,
  avatarXl: 120,
};

// Hit slop for touch targets (minimum 44pt recommended)
export const hitSlop = {
  top: 10,
  bottom: 10,
  left: 10,
  right: 10,
};

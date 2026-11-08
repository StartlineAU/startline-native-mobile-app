import { Platform } from 'react-native';

export const colors = {
  background: '#141414',
  surface: '#1F1F1F',
  surfaceAlt: '#2A2A2A',
  raised: '#353535',
  border: '#353535',
  borderSubtle: 'rgba(255,255,255,0.06)',
  text: '#F5F7FA',
  muted: '#8A8F98',
  mutedDark: '#6E737B',
  primary: '#B3E153',
  primaryInk: '#141414',
  primarySoft: 'rgba(179,225,83,0.10)',
  primaryBorder: 'rgba(179,225,83,0.40)',
  info: '#60A5FA',
  infoSoft: 'rgba(96,165,250,0.12)',
  danger: '#F87171',
  dangerSoft: 'rgba(248,113,113,0.12)',
  warning: '#FBBF24',
  warningSoft: 'rgba(251,191,36,0.12)',
  overlay: 'rgba(10,10,10,0.72)',
} as const;

export const fonts = {
  display: 'ChakraPetch_700Bold',
  displayItalic: 'ChakraPetch_700Bold_Italic',
  displayMedium: 'ChakraPetch_500Medium',
  displaySemiBold: 'ChakraPetch_600SemiBold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemiBold: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 14,
  xl: 18,
  hero: 24,
  pill: 999,
} as const;

export const shadow = {
  machined: Platform.select({
    ios: {
      shadowColor: colors.primary,
      shadowOffset: { width: 2, height: 2 },
      shadowOpacity: 1,
      shadowRadius: 0,
    },
    android: { elevation: 4 },
    default: {},
  }),
} as const;

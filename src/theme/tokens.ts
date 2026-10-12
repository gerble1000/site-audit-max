export const palette = {
  steel: '#0B1219',
  steelMid: '#121A24',
  steelSoft: '#1A2430',
  mist: '#E8EEF2',
  paper: '#F4F6F8',
  white: '#FFFFFF',
  ink: '#121820',
  muted: '#6B7785',
  /** Brand green from Site Audit Max logo / splash */
  brandGreen: '#2F6B3A',
  brandGreenBright: '#3D8B4F',
  brandGreenSoft: '#E8F2EA',
  brandGreenDarkSoft: '#1A3320',
  brandCream: '#F5F5F0',
  safety: '#E85D04',
  safetySoft: '#FFECDF',
  success: '#2F6F4E',
  danger: '#B42318',
  border: '#D0D7DE',
  borderDark: '#243040',
  rowMeta: '#8FA3B8',
};

export const fonts = {
  display: 'System',
  body: 'System',
  mono: 'SpaceMono',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radii = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
};

export const breakpoints = {
  tablet: 600,
};

export type AppColors = {
  background: string;
  surface: string;
  surfaceElevated: string;
  text: string;
  textMuted: string;
  border: string;
  accent: string;
  accentSoft: string;
  danger: string;
  success: string;
  fab: string;
  header: string;
  headerText: string;
};

export const lightColors: AppColors = {
  background: palette.brandCream,
  surface: palette.white,
  surfaceElevated: '#EEF0E8',
  text: palette.ink,
  textMuted: palette.muted,
  border: palette.border,
  accent: palette.brandGreen,
  accentSoft: palette.brandGreenSoft,
  danger: palette.danger,
  success: palette.success,
  fab: palette.brandGreen,
  header: palette.white,
  headerText: palette.ink,
};

export const darkColors: AppColors = {
  background: '#081219',
  surface: '#0E1720',
  surfaceElevated: '#15202B',
  text: '#FFFFFF',
  textMuted: palette.rowMeta,
  border: '#1E2A38',
  accent: palette.brandGreenBright,
  accentSoft: palette.brandGreenDarkSoft,
  danger: '#F97066',
  success: '#6FCF97',
  fab: palette.brandGreenBright,
  header: '#081219',
  headerText: '#FFFFFF',
};

export type StatusKey = 'completed' | 'overdue' | 'critical' | 'inProgress' | 'notStarted';

export type StatusColor = {
  label: string;
  color: string;
  soft: string;
  bar: string;
};

export const statusColorsLight: Record<StatusKey, StatusColor> = {
  completed: {
    label: 'COMPLETED',
    color: palette.brandGreen,
    soft: palette.brandGreenSoft,
    bar: palette.brandGreen,
  },
  overdue: {
    label: 'OVERDUE',
    color: palette.danger,
    soft: '#FCE8E6',
    bar: palette.danger,
  },
  critical: {
    label: 'CRITICAL',
    color: palette.safety,
    soft: palette.safetySoft,
    bar: palette.safety,
  },
  inProgress: {
    label: 'IN PROGRESS',
    color: '#2B6CB0',
    soft: '#E8F1FA',
    bar: '#4A90D9',
  },
  notStarted: {
    label: 'NOT STARTED',
    color: '#B7791F',
    soft: '#FEF3C7',
    bar: '#F79009',
  },
};

export const statusColorsDark: Record<StatusKey, StatusColor> = {
  completed: {
    label: 'COMPLETED',
    color: '#6FCF97',
    soft: '#1A3320',
    bar: palette.brandGreenBright,
  },
  overdue: {
    label: 'OVERDUE',
    color: '#F97066',
    soft: '#3A1A1A',
    bar: '#F97066',
  },
  critical: {
    label: 'CRITICAL',
    color: '#FB923C',
    soft: '#3A2410',
    bar: palette.safety,
  },
  inProgress: {
    label: 'IN PROGRESS',
    color: '#6BB3F0',
    soft: '#152A3D',
    bar: '#4A90D9',
  },
  notStarted: {
    label: 'NOT STARTED',
    color: '#F6C35B',
    soft: '#2E2610',
    bar: '#F79009',
  },
};

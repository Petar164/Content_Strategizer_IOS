import { AccentColor } from '@/types/database';

export const Colors = {
  light: {
    background: '#FAFAF9',
    surface: '#FFFFFF',
    border: '#E5E5E3',
    text: '#111111',
    textSecondary: '#6B6B6B',
    textTertiary: '#9CA3AF',
    tabBar: '#FFFFFF',
    tabBarBorder: '#E5E5E3',
    inputBg: '#F3F4F6',
    danger: '#E11D48',
    success: '#059669',
    warning: '#D97706',
  },
  dark: {
    background: '#0F0F0D',
    surface: '#1A1A17',
    border: '#2A2A26',
    text: '#FAFAF9',
    textSecondary: '#A3A3A0',
    textTertiary: '#6B6B68',
    tabBar: '#1A1A17',
    tabBarBorder: '#2A2A26',
    inputBg: '#252522',
    danger: '#FB7185',
    success: '#34D399',
    warning: '#F59E0B',
  },
};

export const AccentValues: Record<AccentColor, { light: string; dark: string }> = {
  mono: { light: '#111111', dark: '#FFFFFF' },
  amber: { light: '#D97706', dark: '#F59E0B' },
  indigo: { light: '#4F46E5', dark: '#818CF8' },
  rose: { light: '#E11D48', dark: '#FB7185' },
  emerald: { light: '#059669', dark: '#34D399' },
};

export const EVENT_COLORS: Record<string, string> = {
  post: '#3B82F6',
  shoot: '#6B7280',
  edit: '#F59E0B',
  repost: '#8B5CF6',
  deadline: '#EF4444',
  other: '#6B7280',
};

export function formatNumber(n: number | null | undefined): string {
  if (n == null) return '—';
  return n.toLocaleString('en-US');
}

export function formatEur(n: number | null | undefined): string {
  if (n == null) return '—';
  return `€${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

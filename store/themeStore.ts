import { create } from 'zustand';
import { AccentColor } from '@/types/database';

interface ThemeState {
  darkMode: boolean;
  accentColor: AccentColor;
  setDarkMode: (val: boolean) => void;
  setAccentColor: (color: AccentColor) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  darkMode: false,
  accentColor: 'mono',
  setDarkMode: (val) => set({ darkMode: val }),
  setAccentColor: (color) => set({ accentColor: color }),
}));

export const ACCENT_COLORS: Record<AccentColor, { light: string; dark: string; label: string }> = {
  mono: { light: '#111111', dark: '#FFFFFF', label: 'Mono' },
  amber: { light: '#D97706', dark: '#F59E0B', label: 'Amber' },
  indigo: { light: '#4F46E5', dark: '#818CF8', label: 'Indigo' },
  rose: { light: '#E11D48', dark: '#FB7185', label: 'Rose' },
  emerald: { light: '#059669', dark: '#34D399', label: 'Emerald' },
};

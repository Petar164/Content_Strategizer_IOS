import { useThemeStore } from '@/store/themeStore';
import { Colors, AccentValues } from '@/lib/theme';

export function useTheme() {
  const { darkMode, accentColor } = useThemeStore();
  const colors = darkMode ? Colors.dark : Colors.light;
  const accent = AccentValues[accentColor][darkMode ? 'dark' : 'light'];
  return { darkMode, colors, accent, accentColor };
}

import { Stack } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';

export default function InventoryLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="new" options={{ title: 'Add Item', presentation: 'modal' }} />
      <Stack.Screen name="[id]" options={{ title: 'Item Detail' }} />
    </Stack>
  );
}

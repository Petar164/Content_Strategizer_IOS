import { Stack } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';

export default function MoreLayout() {
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
      <Stack.Screen name="shoot-planner" options={{ title: 'Shoot Planner' }} />
      <Stack.Screen name="hashtags" options={{ title: 'Hashtag Library' }} />
      <Stack.Screen name="ai-chat" options={{ title: 'Void', headerShown: false }} />
      <Stack.Screen name="settings" options={{ title: 'Settings' }} />
    </Stack>
  );
}

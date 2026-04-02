import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { useProfileStore } from '@/store/profileStore';
import { useTheme } from '@/hooks/useTheme';

export default function IndexScreen() {
  const router = useRouter();
  const { session, initialized } = useAuthStore();
  const { profile } = useProfileStore();
  const { colors } = useTheme();

  useEffect(() => {
    if (!initialized) return;

    if (!session) {
      router.replace('/(auth)/login');
    } else if (profile && !profile.onboarding_complete) {
      router.replace('/onboarding');
    } else if (profile?.onboarding_complete) {
      router.replace('/(tabs)');
    }
    // If session exists but profile isn't loaded yet, wait
  }, [initialized, session, profile]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator color={colors.text} />
    </View>
  );
}

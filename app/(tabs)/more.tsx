import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Card } from '@/components/ui/Card';

interface MenuItemProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  sub?: string;
  onPress: () => void;
}

function MenuItem({ icon, label, sub, onPress }: MenuItemProps) {
  const { colors, accent } = useTheme();
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}>
        <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: `${accent}15`, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={icon} size={20} color={accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>{label}</Text>
          {sub && <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 1 }}>{sub}</Text>}
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
      </View>
    </TouchableOpacity>
  );
}

export default function MoreScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView>
        <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20 }}>
          <Text style={{ fontSize: 26, fontWeight: '700', color: colors.text, letterSpacing: -0.8, marginBottom: 20 }}>More</Text>

          <Card style={{ padding: 0, marginBottom: 16, overflow: 'hidden' }}>
            <MenuItem icon="camera-outline" label="Shoot Planner" sub="Plan sessions and shot lists" onPress={() => router.push('/more/shoot-planner')} />
            <MenuItem icon="pricetag-outline" label="Hashtag Library" sub="Manage and copy hashtags" onPress={() => router.push('/more/hashtags')} />
            <MenuItem icon="chatbubble-ellipses-outline" label="Void — AI Chat" sub="Your content strategy assistant" onPress={() => router.push('/more/ai-chat')} />
            <MenuItem icon="settings-outline" label="Settings" sub="Profile, theme, API key" onPress={() => router.push('/more/settings')} />
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

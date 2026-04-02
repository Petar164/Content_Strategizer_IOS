import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useProfileStore } from '@/store/profileStore';
import { useThemeStore, ACCENT_COLORS } from '@/store/themeStore';
import { useTheme } from '@/hooks/useTheme';
import { Card } from '@/components/ui/Card';
import { getClaudeApiKey, setClaudeApiKey } from '@/lib/claude';
import { AccentColor } from '@/types/database';

function SettingRow({ label, sub, children }: { label: string; sub?: string; children?: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, color: colors.text }}>{label}</Text>
        {sub && <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 1 }}>{sub}</Text>}
      </View>
      {children}
    </View>
  );
}

function SectionHeader({ title }: { title: string }) {
  const { colors } = useTheme();
  return (
    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8 }}>
      {title}
    </Text>
  );
}

export default function SettingsScreen() {
  const { user, setSession } = useAuthStore();
  const { profile, setProfile } = useProfileStore();
  const { darkMode, accentColor, setDarkMode, setAccentColor } = useThemeStore();
  const { colors, accent } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [claudeKey, setClaudeKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [followerGoalInput, setFollowerGoalInput] = useState('');
  const [editingGoal, setEditingGoal] = useState(false);
  const [optimizationMode, setOptimizationMode] = useState(profile?.optimization_mode ?? 'Growth');
  const [instagramHandle, setInstagramHandle] = useState(profile?.instagram_handle ?? '');
  const [editingHandle, setEditingHandle] = useState(false);

  useEffect(() => {
    getClaudeApiKey().then((key) => { if (key) setClaudeKey(key); });
    if (profile?.follower_goal) setFollowerGoalInput(String(profile.follower_goal));
    if (profile?.optimization_mode) setOptimizationMode(profile.optimization_mode);
    if (profile?.instagram_handle) setInstagramHandle(profile.instagram_handle);
  }, [profile]);

  async function handleSaveTheme(dm: boolean, ac: AccentColor) {
    if (!user) return;
    await supabase.from('user_profile').update({ dark_mode: dm, accent_color: ac, updated_at: new Date().toISOString() }).eq('user_id', user.id);
    const updated = profile ? { ...profile, dark_mode: dm, accent_color: ac } : null;
    if (updated) setProfile(updated);
  }

  async function handleToggleDarkMode(val: boolean) {
    setDarkMode(val);
    await handleSaveTheme(val, accentColor);
  }

  async function handleAccentColor(color: AccentColor) {
    setAccentColor(color);
    await handleSaveTheme(darkMode, color);
  }

  async function handleSaveApiKey() {
    await setClaudeApiKey(claudeKey.trim());
    Alert.alert('Saved', 'Claude API key saved securely.');
  }

  async function handleSaveGoal() {
    if (!user) return;
    const n = parseInt(followerGoalInput);
    if (isNaN(n) || n < 0) { Alert.alert('Error', 'Invalid number'); return; }
    await supabase.from('user_profile').update({ follower_goal: n, updated_at: new Date().toISOString() }).eq('user_id', user.id);
    if (profile) setProfile({ ...profile, follower_goal: n });
    setEditingGoal(false);
  }

  async function handleSaveOptimization(mode: string) {
    if (!user) return;
    setOptimizationMode(mode);
    await supabase.from('user_profile').update({ optimization_mode: mode, updated_at: new Date().toISOString() }).eq('user_id', user.id);
    if (profile) setProfile({ ...profile, optimization_mode: mode });
  }

  async function handleSaveHandle() {
    if (!user) return;
    const h = instagramHandle.trim().replace('@', '');
    await supabase.from('user_profile').update({ instagram_handle: h, updated_at: new Date().toISOString() }).eq('user_id', user.id);
    if (profile) setProfile({ ...profile, instagram_handle: h });
    setEditingHandle(false);
  }

  async function handleLogout() {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          setProfile(null);
          queryClient.clear();
          router.replace('/(auth)/login');
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <SectionHeader title="Account" />
        <Card style={{ padding: 0, marginHorizontal: 16, overflow: 'hidden' }}>
          <SettingRow label="Instagram Handle" sub={profile?.instagram_handle ? `@${profile.instagram_handle}` : 'Not set'}>
            <TouchableOpacity onPress={() => setEditingHandle(true)} hitSlop={8}>
              <Ionicons name="pencil-outline" size={18} color={accent} />
            </TouchableOpacity>
          </SettingRow>

          <View style={{ paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text style={{ fontSize: 16, color: colors.text, marginBottom: 8 }}>Follower Goal</Text>
            {editingGoal ? (
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TextInput
                  value={followerGoalInput}
                  onChangeText={setFollowerGoalInput}
                  keyboardType="numeric"
                  autoFocus
                  style={{ flex: 1, backgroundColor: colors.inputBg, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: colors.text, borderWidth: 1, borderColor: colors.border }}
                />
                <TouchableOpacity onPress={handleSaveGoal} style={{ backgroundColor: accent, borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center' }}>
                  <Text style={{ color: accent === '#111111' ? '#fff' : '#0F0F0D', fontWeight: '700' }}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setEditingGoal(false)} style={{ justifyContent: 'center' }}>
                  <Text style={{ color: colors.textSecondary }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={() => setEditingGoal(true)} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 15, color: colors.textSecondary }}>{profile?.follower_goal ? profile.follower_goal.toLocaleString() : 'Not set'}</Text>
                <Ionicons name="pencil-outline" size={18} color={accent} />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity onPress={() => router.push('/onboarding')} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 }}>
            <Text style={{ fontSize: 16, color: colors.text }}>Edit Profile</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        </Card>

        <SectionHeader title="Strategy" />
        <Card style={{ padding: 0, marginHorizontal: 16, overflow: 'hidden' }}>
          <View style={{ paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text style={{ fontSize: 16, color: colors.text, marginBottom: 10 }}>Optimization Mode</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {['Growth', 'Sales', 'Authority'].map((mode) => (
                <TouchableOpacity
                  key={mode}
                  onPress={() => handleSaveOptimization(mode)}
                  style={{ flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: optimizationMode === mode ? accent : colors.inputBg, borderWidth: 1, borderColor: optimizationMode === mode ? accent : colors.border }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: optimizationMode === mode ? (accent === '#111111' ? '#fff' : '#0F0F0D') : colors.text }}>{mode}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Card>

        <SectionHeader title="Appearance" />
        <Card style={{ padding: 0, marginHorizontal: 16, overflow: 'hidden' }}>
          <SettingRow label="Dark Mode">
            <Switch value={darkMode} onValueChange={handleToggleDarkMode} trackColor={{ true: accent }} />
          </SettingRow>
          <View style={{ paddingVertical: 14, paddingHorizontal: 16 }}>
            <Text style={{ fontSize: 16, color: colors.text, marginBottom: 12 }}>Accent Color</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {(Object.keys(ACCENT_COLORS) as AccentColor[]).map((key) => {
                const colorVal = ACCENT_COLORS[key][darkMode ? 'dark' : 'light'];
                return (
                  <TouchableOpacity
                    key={key}
                    onPress={() => handleAccentColor(key)}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: colorVal,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: accentColor === key ? 3 : 0,
                      borderColor: colors.text,
                    }}
                  >
                    {accentColor === key && <Ionicons name="checkmark" size={18} color={key === 'mono' ? (darkMode ? '#0F0F0D' : '#FFFFFF') : '#FFFFFF'} />}
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
              {(Object.keys(ACCENT_COLORS) as AccentColor[]).map((key) => (
                <Text key={key} style={{ width: 36, fontSize: 10, color: colors.textSecondary, textAlign: 'center' }}>{ACCENT_COLORS[key].label}</Text>
              ))}
            </View>
          </View>
        </Card>

        <SectionHeader title="AI" />
        <Card style={{ padding: 0, marginHorizontal: 16, overflow: 'hidden' }}>
          <View style={{ paddingVertical: 14, paddingHorizontal: 16 }}>
            <Text style={{ fontSize: 16, color: colors.text, marginBottom: 4 }}>Claude API Key</Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 12 }}>Required for Void AI Chat and Caption Generation. Stored securely on device.</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.inputBg, borderRadius: 10, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.border }}>
                <TextInput
                  value={claudeKey}
                  onChangeText={setClaudeKey}
                  placeholder="sk-ant-..."
                  placeholderTextColor={colors.textTertiary}
                  secureTextEntry={!showKey}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={{ flex: 1, paddingVertical: 12, fontSize: 14, color: colors.text }}
                />
                <TouchableOpacity onPress={() => setShowKey(!showKey)} hitSlop={8}>
                  <Ionicons name={showKey ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textTertiary} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={handleSaveApiKey} style={{ backgroundColor: accent, borderRadius: 10, paddingHorizontal: 14, justifyContent: 'center' }}>
                <Text style={{ color: accent === '#111111' ? '#fff' : '#0F0F0D', fontWeight: '700' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Card>

        <SectionHeader title="Account" />
        <Card style={{ padding: 0, marginHorizontal: 16, overflow: 'hidden', marginBottom: 24 }}>
          <TouchableOpacity
            onPress={handleLogout}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16 }}
          >
            <Ionicons name="log-out-outline" size={20} color={colors.danger} />
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.danger }}>Log Out</Text>
          </TouchableOpacity>
        </Card>
      </ScrollView>

      {/* Edit Handle Modal */}
      <Modal visible={editingHandle} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditingHandle(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>Instagram Handle</Text>
            <TouchableOpacity onPress={() => setEditingHandle(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <View style={{ padding: 20, gap: 14 }}>
            <TextInput
              placeholder="@yourhandle"
              placeholderTextColor={colors.textTertiary}
              value={instagramHandle}
              onChangeText={setInstagramHandle}
              autoCapitalize="none"
              autoFocus
              style={{ backgroundColor: colors.inputBg, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: colors.text, borderWidth: 1, borderColor: colors.border }}
            />
            <TouchableOpacity
              onPress={handleSaveHandle}
              style={{ backgroundColor: accent, borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}
            >
              <Text style={{ color: accent === '#111111' ? '#fff' : '#0F0F0D', fontWeight: '700', fontSize: 16 }}>Save</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

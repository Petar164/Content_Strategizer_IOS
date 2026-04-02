import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, addDays, startOfWeek, isToday, isPast, isFuture } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useProfileStore } from '@/store/profileStore';
import { useTheme } from '@/hooks/useTheme';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatNumber } from '@/lib/theme';
import { AnalyticsEntry, Recommendation } from '@/types/database';

export default function DashboardScreen() {
  const { user } = useAuthStore();
  const { profile } = useProfileStore();
  const { colors, accent, darkMode } = useTheme();
  const queryClient = useQueryClient();
  const [editingFollowers, setEditingFollowers] = useState(false);
  const [followerInput, setFollowerInput] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch analytics
  const { data: analytics = [] } = useQuery<AnalyticsEntry[]>({
    queryKey: ['analytics', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('analytics_entries')
        .select('*')
        .eq('user_id', user!.id)
        .order('post_date', { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  // Fetch recommendations
  const { data: recommendations = [] } = useQuery<Recommendation[]>({
    queryKey: ['recommendations', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('recommendations')
        .select('*')
        .eq('user_id', user!.id)
        .eq('is_dismissed', false)
        .order('created_at', { ascending: false })
        .limit(3);
      return data ?? [];
    },
    enabled: !!user,
  });

  // Fetch this week's calendar events
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 6);

  const { data: weekEvents = [] } = useQuery({
    queryKey: ['calendar-week', user?.id, format(weekStart, 'yyyy-MM-dd')],
    queryFn: async () => {
      const { data } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', user!.id)
        .gte('start_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('start_date', format(weekEnd, 'yyyy-MM-dd'))
        .order('start_date');
      return data ?? [];
    },
    enabled: !!user,
  });

  // Fetch inventory gaps
  const { data: inventoryGaps } = useQuery({
    queryKey: ['inventory-gaps', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('inventory_items')
        .select('status')
        .eq('user_id', user!.id);
      const items = data ?? [];
      return {
        unposted: items.filter((i) => i.status === 'unposted').length,
        needsRepost: items.filter((i) => i.status === 'needs_repost').length,
      };
    },
    enabled: !!user,
  });

  // Update follower count mutation
  const updateFollowers = useMutation({
    mutationFn: async (count: number) => {
      await supabase
        .from('user_profile')
        .update({ current_followers: count, updated_at: new Date().toISOString() })
        .eq('user_id', user!.id);
      // Also add to follower history
      await supabase.from('follower_history').upsert({
        user_id: user!.id,
        recorded_date: format(new Date(), 'yyyy-MM-dd'),
        follower_count: count,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['follower-history'] });
      setEditingFollowers(false);
    },
  });

  // Dismiss recommendation
  const dismissRec = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('recommendations').update({ is_dismissed: true }).eq('id', id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recommendations', user?.id] }),
  });

  // Calculate metrics
  const avgViews =
    analytics.length > 0
      ? Math.round(analytics.reduce((s, e) => s + (e.views ?? 0), 0) / analytics.length)
      : null;
  const avgSaves =
    analytics.length > 0
      ? Math.round(analytics.reduce((s, e) => s + (e.saves ?? 0), 0) / analytics.length)
      : null;
  const avgFollowersPerPost =
    analytics.length > 0
      ? Math.round(analytics.reduce((s, e) => s + (e.followers_gained ?? 0), 0) / analytics.length)
      : null;

  // Follower projection
  const currentFollowers = profile?.current_followers ?? 0;
  const followerGoal = profile?.follower_goal ?? 0;
  const toGo = Math.max(0, followerGoal - currentFollowers);
  const pct = followerGoal > 0 ? Math.min(100, Math.round((currentFollowers / followerGoal) * 100)) : 0;
  const projectedDays =
    avgFollowersPerPost && avgFollowersPerPost > 0 && toGo > 0
      ? Math.ceil(toGo / avgFollowersPerPost)
      : null;

  // This week strip
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  async function onRefresh() {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setRefreshing(false);
  }

  function handleFollowerTap() {
    setFollowerInput(String(profile?.current_followers ?? ''));
    setEditingFollowers(true);
  }

  function handleFollowerSave() {
    const n = parseInt(followerInput);
    if (isNaN(n) || n < 0) return;
    updateFollowers.mutate(n);
  }

  const EVENT_COLORS: Record<string, string> = {
    post: '#3B82F6',
    shoot: '#6B7280',
    edit: '#F59E0B',
    repost: '#8B5CF6',
    deadline: '#EF4444',
    other: '#9CA3AF',
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textSecondary, letterSpacing: 2, textTransform: 'uppercase' }}>
              FASHIONVOID
            </Text>
            <Text style={{ fontSize: 26, fontWeight: '700', color: colors.text, letterSpacing: -0.8, marginTop: 2 }}>
              Dashboard
            </Text>
          </View>
          <View style={{ backgroundColor: `${accent}22`, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: accent, letterSpacing: 1 }}>
              {profile?.optimization_mode?.toUpperCase() ?? 'GROWTH'}
            </Text>
          </View>
        </View>

        {/* Follower Goal Card */}
        <Card>
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
            Follower Goal
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
            {editingFollowers ? (
              <View style={{ flexDirection: 'row', gap: 8, flex: 1 }}>
                <TextInput
                  value={followerInput}
                  onChangeText={setFollowerInput}
                  keyboardType="numeric"
                  autoFocus
                  style={{ flex: 1, fontSize: 28, fontWeight: '700', color: colors.text, borderBottomWidth: 2, borderBottomColor: accent }}
                />
                <TouchableOpacity onPress={handleFollowerSave} style={{ justifyContent: 'center' }}>
                  <Text style={{ color: accent, fontWeight: '700', fontSize: 16 }}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setEditingFollowers(false)} style={{ justifyContent: 'center' }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 16 }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={handleFollowerTap} style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                <Text style={{ fontSize: 32, fontWeight: '700', color: colors.text, letterSpacing: -1 }}>
                  {formatNumber(currentFollowers)}
                </Text>
                <Ionicons name="pencil-outline" size={14} color={colors.textTertiary} />
              </TouchableOpacity>
            )}
            <Text style={{ fontSize: 16, color: colors.textSecondary }}>
              / {formatNumber(followerGoal)}
            </Text>
          </View>
          <View style={{ height: 6, backgroundColor: colors.inputBg, borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
            <View style={{ height: '100%', width: `${pct}%`, backgroundColor: accent, borderRadius: 3 }} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 13, color: colors.textSecondary }}>{pct}% complete</Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary }}>{formatNumber(toGo)} to go</Text>
          </View>
          {projectedDays && (
            <Text style={{ fontSize: 12, color: colors.textTertiary, marginTop: 6 }}>
              At current pace: ~{projectedDays} posts to reach goal
            </Text>
          )}
        </Card>

        {/* Metric Cards */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Card style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Avg Views</Text>
            <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text }}>{avgViews != null ? formatNumber(avgViews) : '—'}</Text>
          </Card>
          <Card style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Avg Saves</Text>
            <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text }}>{avgSaves != null ? formatNumber(avgSaves) : '—'}</Text>
          </Card>
          <Card style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Followers/Post</Text>
            <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text }}>{avgFollowersPerPost != null ? `+${avgFollowersPerPost}` : '—'}</Text>
          </Card>
        </View>

        {/* Content Gaps */}
        {((inventoryGaps?.unposted ?? 0) > 0 || (inventoryGaps?.needsRepost ?? 0) > 0) && (
          <Card style={{ backgroundColor: `${accent}11` }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: accent, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Content Gaps</Text>
            {(inventoryGaps?.unposted ?? 0) > 0 && (
              <Text style={{ fontSize: 14, color: colors.text, marginBottom: 4 }}>
                {inventoryGaps!.unposted} unposted item{inventoryGaps!.unposted !== 1 ? 's' : ''} ready to go
              </Text>
            )}
            {(inventoryGaps?.needsRepost ?? 0) > 0 && (
              <Text style={{ fontSize: 14, color: colors.text }}>
                {inventoryGaps!.needsRepost} item{inventoryGaps!.needsRepost !== 1 ? 's' : ''} need repost
              </Text>
            )}
          </Card>
        )}

        {/* AI Recommendations */}
        {recommendations.length > 0 && (
          <View>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12, letterSpacing: -0.3 }}>Recommendations</Text>
            <View style={{ gap: 10 }}>
              {recommendations.map((rec) => (
                <Card key={rec.id} style={{ gap: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Badge
                      label={rec.rec_type.replace(/_/g, ' ')}
                      color={`${accent}22`}
                      textColor={accent}
                    />
                    <TouchableOpacity onPress={() => dismissRec.mutate(rec.id)} hitSlop={8}>
                      <Ionicons name="close" size={18} color={colors.textTertiary} />
                    </TouchableOpacity>
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{rec.title}</Text>
                  <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 19 }}>{rec.summary}</Text>
                  {rec.expected_impact && (
                    <Text style={{ fontSize: 12, color: colors.success ?? colors.textTertiary }}>Expected: {rec.expected_impact}</Text>
                  )}
                </Card>
              ))}
            </View>
          </View>
        )}

        {/* This Week's Plan */}
        <View>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12, letterSpacing: -0.3 }}>This Week</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {weekDays.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const dayEvents = weekEvents.filter((e: any) => e.start_date === dateStr);
                const isPastDay = isPast(day) && !isToday(day);

                return (
                  <View
                    key={dateStr}
                    style={{
                      width: 72,
                      backgroundColor: isToday(day) ? `${accent}22` : colors.surface,
                      borderRadius: 12,
                      padding: 10,
                      alignItems: 'center',
                      borderWidth: isToday(day) ? 1 : 0,
                      borderColor: isToday(day) ? accent : 'transparent',
                      opacity: isPastDay ? 0.4 : 1,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '600', color: isToday(day) ? accent : colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {format(day, 'EEE')}
                    </Text>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: isToday(day) ? accent : colors.text, marginTop: 4 }}>
                      {format(day, 'd')}
                    </Text>
                    <View style={{ marginTop: 6, gap: 3, width: '100%' }}>
                      {dayEvents.slice(0, 3).map((evt: any) => (
                        <View
                          key={evt.id}
                          style={{ height: 4, borderRadius: 2, backgroundColor: EVENT_COLORS[evt.event_type] ?? '#9CA3AF' }}
                        />
                      ))}
                      {dayEvents.length > 3 && (
                        <Text style={{ fontSize: 9, color: colors.textTertiary, textAlign: 'center' }}>+{dayEvents.length - 3}</Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

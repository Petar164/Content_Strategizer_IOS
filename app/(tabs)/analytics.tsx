import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { format, subDays, parseISO } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/hooks/useTheme';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AnalyticsEntry, FollowerHistory, PostType } from '@/types/database';
import { formatNumber } from '@/lib/theme';

const TABS = ['Overview', 'New Post', 'History', 'Check-in', 'Heatmap', 'Compare'] as const;
type TabType = (typeof TABS)[number];

const POST_TYPES: PostType[] = ['carousel', 'reel', 'single', 'story'];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

// ── Follower History Section ──
function FollowerHistorySection() {
  const { user } = useAuthStore();
  const { colors, accent } = useTheme();
  const queryClient = useQueryClient();
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [count, setCount] = useState('');
  const [notes, setNotes] = useState('');
  const [adding, setAdding] = useState(false);

  const { data: history = [] } = useQuery<FollowerHistory[]>({
    queryKey: ['follower-history', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('follower_history')
        .select('*')
        .eq('user_id', user!.id)
        .order('recorded_date', { ascending: true });
      return data ?? [];
    },
    enabled: !!user,
  });

  const addEntry = useMutation({
    mutationFn: async () => {
      const n = parseInt(count);
      if (isNaN(n)) throw new Error('Invalid count');
      await supabase.from('follower_history').upsert({
        user_id: user!.id,
        recorded_date: date,
        follower_count: n,
        notes: notes || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follower-history', user?.id] });
      setCount('');
      setNotes('');
      setAdding(false);
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('follower_history').delete().eq('id', id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['follower-history', user?.id] }),
  });

  const latest = history.length > 0 ? history[history.length - 1].follower_count : null;
  const totalGain = history.length > 1 ? history[history.length - 1].follower_count - history[0].follower_count : null;

  return (
    <View style={{ gap: 14 }}>
      {/* Simple chart - bar representation */}
      {history.length >= 2 && (
        <Card>
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
            Follower Growth
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 80 }}>
            {history.slice(-20).map((h, idx, arr) => {
              const min = Math.min(...arr.map((x) => x.follower_count));
              const max = Math.max(...arr.map((x) => x.follower_count));
              const range = max - min || 1;
              const barH = ((h.follower_count - min) / range) * 64 + 8;
              return (
                <View
                  key={h.id}
                  style={{ flex: 1, height: barH, backgroundColor: accent, borderRadius: 2, opacity: 0.7 + (idx / arr.length) * 0.3 }}
                />
              );
            })}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
            {history.length > 0 && (
              <Text style={{ fontSize: 11, color: colors.textTertiary }}>{history[Math.max(0, history.length - 20)].recorded_date}</Text>
            )}
            <Text style={{ fontSize: 11, color: colors.textTertiary }}>{history[history.length - 1]?.recorded_date}</Text>
          </View>
        </Card>
      )}

      {/* Stats strip */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Card style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Latest</Text>
          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>{formatNumber(latest) ?? '—'}</Text>
        </Card>
        <Card style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Total Gain</Text>
          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>{totalGain != null ? `+${formatNumber(totalGain)}` : '—'}</Text>
        </Card>
        <Card style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Entries</Text>
          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>{history.length}</Text>
        </Card>
      </View>

      {/* Add entry */}
      {adding ? (
        <Card>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 12 }}>Add Entry</Text>
          <TextInput placeholder="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} style={inputStyle(colors)} placeholderTextColor={colors.textTertiary} />
          <TextInput placeholder="Follower count" value={count} onChangeText={setCount} keyboardType="numeric" style={inputStyle(colors)} placeholderTextColor={colors.textTertiary} />
          <TextInput placeholder="Notes (optional)" value={notes} onChangeText={setNotes} style={inputStyle(colors)} placeholderTextColor={colors.textTertiary} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity onPress={() => addEntry.mutate()} style={{ flex: 1, backgroundColor: accent, borderRadius: 10, paddingVertical: 12, alignItems: 'center' }}>
              <Text style={{ color: accent === '#111111' ? '#fff' : '#0F0F0D', fontWeight: '700' }}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setAdding(false)} style={{ flex: 1, backgroundColor: colors.inputBg, borderRadius: 10, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ color: colors.text, fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Card>
      ) : (
        <TouchableOpacity
          onPress={() => setAdding(true)}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border }}
        >
          <Ionicons name="add-circle-outline" size={18} color={accent} />
          <Text style={{ fontSize: 15, fontWeight: '600', color: accent }}>Add Follower Count</Text>
        </TouchableOpacity>
      )}

      {/* Log */}
      {history.slice().reverse().map((h) => (
        <Card key={h.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{formatNumber(h.follower_count)}</Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary }}>{h.recorded_date}</Text>
            {h.notes && <Text style={{ fontSize: 12, color: colors.textTertiary }}>{h.notes}</Text>}
          </View>
          <TouchableOpacity onPress={() => deleteEntry.mutate(h.id)} hitSlop={8}>
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
          </TouchableOpacity>
        </Card>
      ))}
    </View>
  );
}

// ── New Post Form ──
interface NewPostForm {
  post_date: string;
  post_time: string;
  post_type: PostType;
  views: string;
  likes: string;
  comments: string;
  saves: string;
  followers_gained: string;
  notes: string;
}

const DEFAULT_POST_FORM: NewPostForm = {
  post_date: format(new Date(), 'yyyy-MM-dd'),
  post_time: '12:00',
  post_type: 'carousel',
  views: '',
  likes: '',
  comments: '',
  saves: '',
  followers_gained: '',
  notes: '',
};

function NewPostTab() {
  const { user } = useAuthStore();
  const { colors, accent } = useTheme();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<NewPostForm>(DEFAULT_POST_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [csvMode, setCsvMode] = useState(false);
  const [csvText, setCsvText] = useState('');

  function set(key: keyof NewPostForm, val: string) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function handleSubmit() {
    if (!user || !form.post_date) return;
    setSubmitting(true);
    const { error } = await supabase.from('analytics_entries').insert({
      user_id: user.id,
      post_date: form.post_date,
      post_time: form.post_time || '12:00',
      post_type: form.post_type,
      platform: 'instagram',
      views: form.views ? parseInt(form.views) : null,
      likes: form.likes ? parseInt(form.likes) : null,
      comments: form.comments ? parseInt(form.comments) : null,
      saves: form.saves ? parseInt(form.saves) : null,
      followers_gained: form.followers_gained ? parseInt(form.followers_gained) : null,
      notes: form.notes || null,
      source: 'manual',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    setSubmitting(false);
    if (error) { Alert.alert('Error', error.message); return; }
    queryClient.invalidateQueries({ queryKey: ['analytics', user.id] });
    setForm(DEFAULT_POST_FORM);
    Alert.alert('Saved', 'Analytics entry added.');
  }

  async function handleCsvImport() {
    if (!user) return;
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) { Alert.alert('Error', 'CSV needs a header row + at least 1 data row'); return; }
    const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const entries = lines.slice(1).map((line) => {
      const vals = line.split(',');
      const row: Record<string, string> = {};
      header.forEach((h, i) => { row[h] = vals[i]?.trim() ?? ''; });
      return {
        user_id: user.id,
        post_date: row.date || format(new Date(), 'yyyy-MM-dd'),
        post_type: (row.type || 'carousel') as PostType,
        platform: 'instagram',
        views: row.views ? parseInt(row.views) : null,
        likes: row.likes ? parseInt(row.likes) : null,
        saves: row.saves ? parseInt(row.saves) : null,
        followers_gained: row.followers_gained ? parseInt(row.followers_gained) : null,
        source: 'csv',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });
    const { error } = await supabase.from('analytics_entries').insert(entries);
    if (error) { Alert.alert('Error', error.message); return; }
    queryClient.invalidateQueries({ queryKey: ['analytics', user.id] });
    setCsvText('');
    setCsvMode(false);
    Alert.alert('Imported', `${entries.length} entries imported.`);
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 4 }}>
        <TouchableOpacity onPress={() => setCsvMode(false)} style={{ flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: !csvMode ? accent : colors.surface, borderWidth: 1, borderColor: !csvMode ? accent : colors.border }}>
          <Text style={{ fontWeight: '600', color: !csvMode ? (accent === '#111111' ? '#fff' : '#0F0F0D') : colors.text }}>Manual</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setCsvMode(true)} style={{ flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: csvMode ? accent : colors.surface, borderWidth: 1, borderColor: csvMode ? accent : colors.border }}>
          <Text style={{ fontWeight: '600', color: csvMode ? (accent === '#111111' ? '#fff' : '#0F0F0D') : colors.text }}>CSV Import</Text>
        </TouchableOpacity>
      </View>

      {csvMode ? (
        <>
          <Text style={{ fontSize: 13, color: colors.textSecondary }}>
            Paste CSV with header: date,type,views,likes,saves,followers_gained
          </Text>
          <TextInput
            multiline
            value={csvText}
            onChangeText={setCsvText}
            placeholder="date,type,views,likes,saves,followers_gained&#10;2024-01-15,carousel,5000,200,150,12"
            placeholderTextColor={colors.textTertiary}
            style={{ backgroundColor: colors.inputBg, borderRadius: 10, padding: 14, fontSize: 13, color: colors.text, minHeight: 150, textAlignVertical: 'top', borderWidth: 1, borderColor: colors.border }}
          />
          <TouchableOpacity onPress={handleCsvImport} style={{ backgroundColor: accent, borderRadius: 10, paddingVertical: 14, alignItems: 'center' }}>
            <Text style={{ color: accent === '#111111' ? '#fff' : '#0F0F0D', fontWeight: '700', fontSize: 16 }}>Import CSV</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <TextInput placeholder="Date (YYYY-MM-DD)" value={form.post_date} onChangeText={(v) => set('post_date', v)} style={inputStyle(colors)} placeholderTextColor={colors.textTertiary} />
          <TextInput placeholder="Time (HH:MM)" value={form.post_time} onChangeText={(v) => set('post_time', v)} style={inputStyle(colors)} placeholderTextColor={colors.textTertiary} />

          <View>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.2 }}>Post Type</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {POST_TYPES.map((t) => (
                <TouchableOpacity key={t} onPress={() => set('post_type', t)} style={{ flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', backgroundColor: form.post_type === t ? accent : colors.surface, borderWidth: 1, borderColor: form.post_type === t ? accent : colors.border }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: form.post_type === t ? (accent === '#111111' ? '#fff' : '#0F0F0D') : colors.text }}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {[
            { key: 'views', label: 'Views' },
            { key: 'likes', label: 'Likes' },
            { key: 'comments', label: 'Comments' },
            { key: 'saves', label: 'Saves' },
            { key: 'followers_gained', label: 'Followers Gained' },
          ].map(({ key, label }) => (
            <TextInput key={key} placeholder={label} value={form[key as keyof NewPostForm]} onChangeText={(v) => set(key as keyof NewPostForm, v)} keyboardType="numeric" style={inputStyle(colors)} placeholderTextColor={colors.textTertiary} />
          ))}

          <TextInput placeholder="Notes (optional)" value={form.notes} onChangeText={(v) => set('notes', v)} style={inputStyle(colors)} placeholderTextColor={colors.textTertiary} />

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={submitting}
            style={{ backgroundColor: accent, borderRadius: 10, paddingVertical: 14, alignItems: 'center', opacity: submitting ? 0.6 : 1 }}
          >
            <Text style={{ color: accent === '#111111' ? '#fff' : '#0F0F0D', fontWeight: '700', fontSize: 16 }}>Save Entry</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

// ── History Tab ──
function HistoryTab({ analytics }: { analytics: AnalyticsEntry[] }) {
  const { colors, accent } = useTheme();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('analytics_entries').delete().eq('id', id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['analytics', user?.id] }),
  });

  const POST_TYPE_COLORS: Record<PostType, string> = {
    carousel: '#3B82F6',
    reel: '#8B5CF6',
    single: '#10B981',
    story: '#F59E0B',
  };

  return (
    <FlatList
      data={analytics}
      keyExtractor={(item) => item.id}
      renderItem={({ item: entry }) => (
        <Card style={{ marginHorizontal: 16, marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ gap: 4 }}>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <Badge
                  label={entry.post_type ?? 'post'}
                  color={`${POST_TYPE_COLORS[entry.post_type as PostType] ?? '#6B7280'}22`}
                  textColor={POST_TYPE_COLORS[entry.post_type as PostType] ?? '#6B7280'}
                />
                <Text style={{ fontSize: 13, color: colors.textSecondary }}>{entry.post_date}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 16, marginTop: 4 }}>
                <MetricPill label="Views" value={entry.views} colors={colors} />
                <MetricPill label="Likes" value={entry.likes} colors={colors} />
                <MetricPill label="Saves" value={entry.saves} colors={colors} />
                <MetricPill label="+Followers" value={entry.followers_gained} colors={colors} />
              </View>
              {(entry.views_1h != null || entry.views_24h != null) && (
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 2 }}>
                  {entry.views_1h != null && <MetricPill label="1h" value={entry.views_1h} colors={colors} />}
                  {entry.views_24h != null && <MetricPill label="24h" value={entry.views_24h} colors={colors} />}
                </View>
              )}
            </View>
            <TouchableOpacity onPress={() => deleteEntry.mutate(entry.id)} hitSlop={8}>
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
            </TouchableOpacity>
          </View>
        </Card>
      )}
      ListEmptyComponent={
        <View style={{ alignItems: 'center', paddingTop: 60 }}>
          <Text style={{ fontSize: 15, color: colors.textSecondary }}>No analytics entries yet</Text>
        </View>
      }
      contentContainerStyle={{ paddingVertical: 12 }}
    />
  );
}

function MetricPill({ label, value, colors }: { label: string; value: number | null | undefined; colors: any }) {
  return (
    <View>
      <Text style={{ fontSize: 10, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.3 }}>{label}</Text>
      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{value != null ? formatNumber(value) : '—'}</Text>
    </View>
  );
}

// ── Check-in Tab ──
function CheckinTab({ analytics }: { analytics: AnalyticsEntry[] }) {
  const { colors, accent } = useTheme();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const last7 = analytics.filter((e) => {
    try { return parseISO(e.post_date) >= subDays(new Date(), 7); } catch { return false; }
  });

  const [edits, setEdits] = useState<Record<string, Partial<AnalyticsEntry>>>({});

  function setField(id: string, key: keyof AnalyticsEntry, val: string) {
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], [key]: val === '' ? null : parseInt(val) } }));
  }

  async function saveRow(id: string) {
    const patch = edits[id];
    if (!patch) return;
    await supabase.from('analytics_entries').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['analytics', user?.id] });
    setEdits((prev) => { const n = { ...prev }; delete n[id]; return n; });
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      {last7.length === 0 && (
        <View style={{ alignItems: 'center', paddingTop: 40 }}>
          <Text style={{ fontSize: 15, color: colors.textSecondary }}>No posts in the last 7 days</Text>
        </View>
      )}
      {last7.map((entry) => {
        const hasEdits = !!edits[entry.id];
        return (
          <Card key={entry.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{entry.post_date}</Text>
              <Badge label={entry.post_type ?? 'post'} />
            </View>
            <View style={{ gap: 8 }}>
              {([
                { key: 'views_1h', label: 'Views 1h' },
                { key: 'views_24h', label: 'Views 24h' },
                { key: 'views', label: 'Total Views' },
                { key: 'followers_gained', label: 'Followers Gained' },
              ] as { key: keyof AnalyticsEntry; label: string }[]).map(({ key, label }) => {
                const current = edits[entry.id]?.[key] ?? entry[key];
                return (
                  <View key={key} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 13, color: colors.textSecondary, flex: 1 }}>{label}</Text>
                    <TextInput
                      value={current != null ? String(current) : ''}
                      onChangeText={(v) => setField(entry.id, key, v)}
                      keyboardType="numeric"
                      style={{ backgroundColor: colors.inputBg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontSize: 14, color: colors.text, minWidth: 80, textAlign: 'right', borderWidth: 1, borderColor: hasEdits ? accent : colors.border }}
                    />
                  </View>
                );
              })}
            </View>
            {hasEdits && (
              <TouchableOpacity onPress={() => saveRow(entry.id)} style={{ marginTop: 10, backgroundColor: accent, borderRadius: 8, paddingVertical: 10, alignItems: 'center' }}>
                <Text style={{ color: accent === '#111111' ? '#fff' : '#0F0F0D', fontWeight: '700' }}>Save</Text>
              </TouchableOpacity>
            )}
          </Card>
        );
      })}
    </ScrollView>
  );
}

// ── Heatmap Tab ──
function HeatmapTab({ analytics }: { analytics: AnalyticsEntry[] }) {
  const { colors, accent } = useTheme();

  // Build 7x24 grid
  const grid: Record<string, number[]> = {};
  analytics.forEach((e) => {
    if (!e.post_date || e.views == null) return;
    const day = new Date(e.post_date).getDay(); // 0=Sun
    const mondayIdx = (day + 6) % 7; // Mon=0
    const hour = e.post_time ? parseInt(e.post_time.split(':')[0]) : 12;
    const key = `${mondayIdx}-${hour}`;
    if (!grid[key]) grid[key] = [];
    grid[key].push(e.views);
  });

  const cellAvg = (d: number, h: number) => {
    const vals = grid[`${d}-${h}`];
    if (!vals || vals.length === 0) return 0;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  };

  const maxVal = Math.max(...Object.values(grid).map((v) => v.reduce((a, b) => a + b, 0) / v.length), 1);

  let bestDay = 0, bestHour = 0, bestVal = 0;
  DAYS.forEach((_, d) => {
    HOURS.forEach((h) => {
      const val = cellAvg(d, h);
      if (val > bestVal) { bestVal = val; bestDay = d; bestHour = h; }
    });
  });

  if (analytics.length < 5) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <Ionicons name="time-outline" size={48} color={colors.textTertiary} />
        <Text style={{ fontSize: 15, color: colors.textSecondary, marginTop: 12, textAlign: 'center' }}>
          Add at least 5 analytics entries to see posting heatmap
        </Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      {bestVal > 0 && (
        <Card style={{ marginBottom: 16, backgroundColor: `${accent}11` }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: accent, marginBottom: 4 }}>BEST TIME TO POST</Text>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>
            {DAYS[bestDay]} at {bestHour}:00
          </Text>
          <Text style={{ fontSize: 13, color: colors.textSecondary }}>Avg {Math.round(bestVal).toLocaleString()} views</Text>
        </Card>
      )}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          {/* Hour labels */}
          <View style={{ flexDirection: 'row', marginLeft: 32 }}>
            {[0, 3, 6, 9, 12, 15, 18, 21].map((h) => (
              <View key={h} style={{ width: 28, alignItems: 'center' }}>
                <Text style={{ fontSize: 9, color: colors.textTertiary }}>{h}h</Text>
              </View>
            ))}
          </View>
          {DAYS.map((day, d) => (
            <View key={day} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
              <Text style={{ width: 30, fontSize: 10, color: colors.textSecondary }}>{day}</Text>
              {HOURS.map((h) => {
                const val = cellAvg(d, h);
                const intensity = maxVal > 0 ? val / maxVal : 0;
                return (
                  <View
                    key={h}
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 2,
                      marginHorizontal: 1,
                      backgroundColor: intensity > 0 ? accent : colors.inputBg,
                      opacity: intensity > 0 ? 0.2 + intensity * 0.8 : 1,
                    }}
                  />
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
    </ScrollView>
  );
}

// ── Compare Tab ──
function CompareTab({ analytics }: { analytics: AnalyticsEntry[] }) {
  const { colors, accent } = useTheme();

  const byType: Record<string, number[]> = {};
  const byDay: Record<number, number[]> = {};

  analytics.forEach((e) => {
    if (e.views == null) return;
    if (e.post_type) {
      if (!byType[e.post_type]) byType[e.post_type] = [];
      byType[e.post_type].push(e.views);
    }
    try {
      const day = (new Date(e.post_date).getDay() + 6) % 7;
      if (!byDay[day]) byDay[day] = [];
      byDay[day].push(e.views);
    } catch {}
  });

  const typeAvgs = POST_TYPES.map((t) => ({
    label: t,
    avg: byType[t]?.length ? Math.round(byType[t].reduce((a, b) => a + b, 0) / byType[t].length) : 0,
    count: byType[t]?.length ?? 0,
  }));

  const dayAvgs = DAYS.map((day, i) => ({
    label: day,
    avg: byDay[i]?.length ? Math.round(byDay[i].reduce((a, b) => a + b, 0) / byDay[i].length) : 0,
  }));

  const maxTypeAvg = Math.max(...typeAvgs.map((t) => t.avg), 1);
  const maxDayAvg = Math.max(...dayAvgs.map((d) => d.avg), 1);

  function BarChart({ data, maxVal, label }: { data: { label: string; avg: number; count?: number }[]; maxVal: number; label: string }) {
    return (
      <Card style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 }}>{label}</Text>
        <View style={{ gap: 10 }}>
          {data.map((item) => (
            <View key={item.label}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ fontSize: 13, color: colors.text, fontWeight: '500', textTransform: 'capitalize' }}>{item.label}</Text>
                <Text style={{ fontSize: 13, color: colors.textSecondary }}>{item.avg > 0 ? formatNumber(item.avg) : '—'}</Text>
              </View>
              <View style={{ height: 6, backgroundColor: colors.inputBg, borderRadius: 3, overflow: 'hidden' }}>
                <View style={{ height: '100%', width: `${maxVal > 0 ? (item.avg / maxVal) * 100 : 0}%`, backgroundColor: accent, borderRadius: 3 }} />
              </View>
            </View>
          ))}
        </View>
      </Card>
    );
  }

  if (analytics.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <Text style={{ fontSize: 15, color: colors.textSecondary, textAlign: 'center' }}>No data to compare yet. Add analytics entries first.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <BarChart data={typeAvgs} maxVal={maxTypeAvg} label="Avg Views by Post Type" />
      <BarChart data={dayAvgs} maxVal={maxDayAvg} label="Avg Views by Day" />
    </ScrollView>
  );
}

// ── Main Analytics Screen ──
export default function AnalyticsScreen() {
  const { user } = useAuthStore();
  const { colors, accent } = useTheme();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('Overview');
  const [refreshing, setRefreshing] = useState(false);

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

  const avgViews = analytics.length > 0 ? Math.round(analytics.reduce((s, e) => s + (e.views ?? 0), 0) / analytics.length) : null;
  const avgSaves = analytics.length > 0 ? Math.round(analytics.reduce((s, e) => s + (e.saves ?? 0), 0) / analytics.length) : null;
  const avgFollowers = analytics.length > 0 ? Math.round(analytics.reduce((s, e) => s + (e.followers_gained ?? 0), 0) / analytics.length) : null;

  async function onRefresh() {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['analytics'] });
    setRefreshing(false);
  }

  function renderTabContent() {
    switch (activeTab) {
      case 'Overview':
        return (
          <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />} contentContainerStyle={{ padding: 16, gap: 14 }}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Card style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Posts</Text>
                <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text }}>{analytics.length}</Text>
              </Card>
              <Card style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Avg Views</Text>
                <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text }}>{avgViews != null ? formatNumber(avgViews) : '—'}</Text>
              </Card>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Card style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Avg Saves</Text>
                <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text }}>{avgSaves != null ? formatNumber(avgSaves) : '—'}</Text>
              </Card>
              <Card style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Followers/Post</Text>
                <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text }}>{avgFollowers != null ? `+${formatNumber(avgFollowers)}` : '—'}</Text>
              </Card>
            </View>
            <FollowerHistorySection />
          </ScrollView>
        );
      case 'New Post': return <NewPostTab />;
      case 'History': return <HistoryTab analytics={analytics} />;
      case 'Check-in': return <CheckinTab analytics={analytics} />;
      case 'Heatmap': return <HeatmapTab analytics={analytics} />;
      case 'Compare': return <CompareTab analytics={analytics} />;
      default: return null;
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 }}>
        <Text style={{ fontSize: 26, fontWeight: '700', color: colors.text, letterSpacing: -0.8, marginBottom: 14 }}>Analytics</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {TABS.map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 8,
                  backgroundColor: activeTab === tab ? accent : colors.inputBg,
                  borderWidth: 1,
                  borderColor: activeTab === tab ? accent : colors.border,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: activeTab === tab ? (accent === '#111111' ? '#fff' : '#0F0F0D') : colors.textSecondary }}>
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      <View style={{ flex: 1 }}>
        {renderTabContent()}
      </View>
    </SafeAreaView>
  );
}

function inputStyle(colors: any) {
  return {
    backgroundColor: colors.inputBg,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
  };
}

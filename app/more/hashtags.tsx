import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/hooks/useTheme';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Hashtag, ReachTier } from '@/types/database';

const REACH_TIERS: { value: ReachTier; label: string; color: string }[] = [
  { value: 'micro', label: 'Micro', color: '#10B981' },
  { value: 'mid', label: 'Mid', color: '#3B82F6' },
  { value: 'macro', label: 'Macro', color: '#8B5CF6' },
  { value: 'mega', label: 'Mega', color: '#EF4444' },
];

interface AddHashtagForm {
  tag: string;
  category: string;
  reach_tier: ReachTier;
  notes: string;
}

export default function HashtagLibraryScreen() {
  const { user } = useAuthStore();
  const { colors, accent } = useTheme();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<AddHashtagForm>({ tag: '', category: '', reach_tier: 'micro', notes: '' });
  const [filterTier, setFilterTier] = useState<ReachTier | 'all'>('all');

  const { data: hashtags = [] } = useQuery<Hashtag[]>({
    queryKey: ['hashtags', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('hashtags')
        .select('*')
        .eq('user_id', user!.id)
        .order('category', { ascending: true });
      return data ?? [];
    },
    enabled: !!user,
  });

  const addHashtag = useMutation({
    mutationFn: async () => {
      const tag = form.tag.trim().replace(/^#/, '');
      if (!tag) throw new Error('Tag is required');
      await supabase.from('hashtags').insert({
        user_id: user!.id,
        tag,
        category: form.category || null,
        reach_tier: form.reach_tier,
        notes: form.notes || null,
        times_used: 0,
        created_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hashtags', user?.id] });
      setShowAdd(false);
      setForm({ tag: '', category: '', reach_tier: 'micro', notes: '' });
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const deleteHashtag = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('hashtags').delete().eq('id', id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hashtags', user?.id] }),
  });

  async function handleCopy(tag: string) {
    await Clipboard.setStringAsync(`#${tag}`);
    // Increment times_used
    const ht = hashtags.find((h) => h.tag === tag);
    if (ht) {
      await supabase.from('hashtags').update({ times_used: ht.times_used + 1 }).eq('id', ht.id);
      queryClient.invalidateQueries({ queryKey: ['hashtags', user?.id] });
    }
    Alert.alert('Copied', `#${tag} copied to clipboard`);
  }

  const filtered = filterTier === 'all' ? hashtags : hashtags.filter((h) => h.reach_tier === filterTier);

  // Group by category
  const grouped: Record<string, Hashtag[]> = {};
  filtered.forEach((h) => {
    const cat = h.category ?? 'Uncategorized';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(h);
  });

  const tierColor = (tier: ReachTier | null) => REACH_TIERS.find((t) => t.value === tier)?.color ?? '#9CA3AF';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom']}>
      {/* Filter bar */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            onPress={() => setFilterTier('all')}
            style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, backgroundColor: filterTier === 'all' ? accent : colors.inputBg, borderWidth: 1, borderColor: filterTier === 'all' ? accent : colors.border }}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: filterTier === 'all' ? (accent === '#111111' ? '#fff' : '#0F0F0D') : colors.text }}>All</Text>
          </TouchableOpacity>
          {REACH_TIERS.map((t) => (
            <TouchableOpacity
              key={t.value}
              onPress={() => setFilterTier(t.value)}
              style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, backgroundColor: filterTier === t.value ? t.color : colors.inputBg, borderWidth: 1, borderColor: filterTier === t.value ? t.color : colors.border }}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: filterTier === t.value ? '#fff' : colors.text }}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={Object.entries(grouped)}
        keyExtractor={([cat]) => cat}
        renderItem={({ item: [category, tags] }) => (
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginHorizontal: 16, marginBottom: 8, marginTop: 12 }}>
              {category}
            </Text>
            {tags.map((ht) => (
              <TouchableOpacity key={ht.id} onPress={() => handleCopy(ht.tag)} activeOpacity={0.7}>
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>#{ht.tag}</Text>
                    {ht.notes && <Text style={{ fontSize: 12, color: colors.textTertiary }}>{ht.notes}</Text>}
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    {ht.reach_tier && (
                      <Badge label={ht.reach_tier} color={`${tierColor(ht.reach_tier)}22`} textColor={tierColor(ht.reach_tier)} />
                    )}
                    {ht.times_used > 0 && (
                      <Text style={{ fontSize: 12, color: colors.textTertiary }}>{ht.times_used}×</Text>
                    )}
                    <TouchableOpacity onPress={() => deleteHashtag.mutate(ht.id)} hitSlop={8}>
                      <Ionicons name="trash-outline" size={18} color={colors.danger} />
                    </TouchableOpacity>
                    <Ionicons name="copy-outline" size={18} color={accent} />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <Ionicons name="pricetag-outline" size={48} color={colors.textTertiary} />
            <Text style={{ fontSize: 15, color: colors.textSecondary, marginTop: 12 }}>
              No hashtags yet. Tap + to add.
            </Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 100 }}
      />

      {/* FAB */}
      <TouchableOpacity
        onPress={() => setShowAdd(true)}
        style={{ position: 'absolute', right: 20, bottom: 30, width: 56, height: 56, borderRadius: 28, backgroundColor: accent, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 8 }}
      >
        <Ionicons name="add" size={28} color={accent === '#111111' ? '#fff' : '#0F0F0D'} />
      </TouchableOpacity>

      {/* Add Modal */}
      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAdd(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>Add Hashtag</Text>
            <TouchableOpacity onPress={() => setShowAdd(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <View style={{ padding: 20, gap: 14 }}>
            <TextInput
              placeholder="#hashtag"
              placeholderTextColor={colors.textTertiary}
              value={form.tag}
              onChangeText={(v) => setForm((f) => ({ ...f, tag: v }))}
              autoCapitalize="none"
              style={inputStyle(colors)}
            />
            <TextInput
              placeholder="Category (e.g. Archive, Brand, Era)"
              placeholderTextColor={colors.textTertiary}
              value={form.category}
              onChangeText={(v) => setForm((f) => ({ ...f, category: v }))}
              style={inputStyle(colors)}
            />
            <View>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.2 }}>Reach Tier</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {REACH_TIERS.map((t) => (
                  <TouchableOpacity
                    key={t.value}
                    onPress={() => setForm((f) => ({ ...f, reach_tier: t.value }))}
                    style={{ flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', backgroundColor: form.reach_tier === t.value ? t.color : colors.inputBg, borderWidth: 1, borderColor: form.reach_tier === t.value ? t.color : colors.border }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '600', color: form.reach_tier === t.value ? '#fff' : colors.text }}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <TextInput
              placeholder="Notes (optional)"
              placeholderTextColor={colors.textTertiary}
              value={form.notes}
              onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))}
              style={inputStyle(colors)}
            />
            <TouchableOpacity
              onPress={() => addHashtag.mutate()}
              disabled={addHashtag.isPending}
              style={{ backgroundColor: accent, borderRadius: 12, paddingVertical: 14, alignItems: 'center', opacity: addHashtag.isPending ? 0.6 : 1 }}
            >
              <Text style={{ color: accent === '#111111' ? '#fff' : '#0F0F0D', fontWeight: '700', fontSize: 16 }}>Add Hashtag</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
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
  };
}

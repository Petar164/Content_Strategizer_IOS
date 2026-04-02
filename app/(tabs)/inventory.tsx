import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/hooks/useTheme';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { InventoryItem, ItemStatus } from '@/types/database';
import { formatEur } from '@/lib/theme';

const STATUS_FILTERS = ['All', 'Unposted', 'Posted', 'Personal', 'Sold'] as const;
type FilterType = (typeof STATUS_FILTERS)[number];

const STATUS_LABELS: Record<ItemStatus, string> = {
  in_hand: 'In Hand',
  on_the_way: 'On the Way',
  sold: 'Sold',
  personal_collection: 'Personal',
  posted: 'Posted',
  unposted: 'Unposted',
  needs_repost: 'Needs Repost',
};

const STATUS_COLORS: Record<ItemStatus, string> = {
  in_hand: '#3B82F6',
  on_the_way: '#F59E0B',
  sold: '#6B7280',
  personal_collection: '#8B5CF6',
  posted: '#10B981',
  unposted: '#EF4444',
  needs_repost: '#F97316',
};

function filterItems(items: InventoryItem[], filter: FilterType): InventoryItem[] {
  switch (filter) {
    case 'Unposted': return items.filter((i) => i.status === 'unposted' || i.status === 'needs_repost' || i.status === 'in_hand');
    case 'Posted': return items.filter((i) => i.status === 'posted');
    case 'Personal': return items.filter((i) => i.status === 'personal_collection');
    case 'Sold': return items.filter((i) => i.status === 'sold');
    default: return items;
  }
}

export default function InventoryScreen() {
  const { user } = useAuthStore();
  const { colors, accent } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterType>('All');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const { data: items = [], isLoading } = useQuery<InventoryItem[]>({
    queryKey: ['inventory', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('inventory_items').delete().eq('id', id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inventory', user?.id] }),
  });

  const markPosted = useMutation({
    mutationFn: async (id: string) => {
      await supabase
        .from('inventory_items')
        .update({ status: 'posted', date_posted: new Date().toISOString().split('T')[0], updated_at: new Date().toISOString() })
        .eq('id', id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inventory', user?.id] }),
  });

  const filteredItems = filterItems(items, filter).filter((item) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      item.brand?.toLowerCase().includes(q) ||
      item.item_name?.toLowerCase().includes(q) ||
      item.designer?.toLowerCase().includes(q) ||
      item.category?.toLowerCase().includes(q)
    );
  });

  async function onRefresh() {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['inventory'] });
    setRefreshing(false);
  }

  function handleDelete(id: string, name: string) {
    Alert.alert('Delete Item', `Delete "${name || 'this item'}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteItem.mutate(id) },
    ]);
  }

  function renderItem({ item }: { item: InventoryItem }) {
    const statusColor = item.status ? STATUS_COLORS[item.status] : '#9CA3AF';
    const statusLabel = item.status ? STATUS_LABELS[item.status] : '—';

    return (
      <TouchableOpacity
        onPress={() => router.push(`/inventory/${item.id}`)}
        activeOpacity={0.8}
      >
        <Card style={{ marginHorizontal: 16, marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1, gap: 4 }}>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                {item.brand && (
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {item.brand}
                  </Text>
                )}
                {item.season && (
                  <Text style={{ fontSize: 12, color: colors.textTertiary }}>{item.season}</Text>
                )}
              </View>
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, letterSpacing: -0.2 }} numberOfLines={2}>
                {item.item_name || 'Untitled Item'}
              </Text>
              {item.designer && (
                <Text style={{ fontSize: 13, color: colors.textSecondary }}>{item.designer}</Text>
              )}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                <Badge label={statusLabel} color={`${statusColor}22`} textColor={statusColor} />
                {item.rarity_estimate && (
                  <Badge label={item.rarity_estimate} color={`${accent}11`} textColor={accent} />
                )}
              </View>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 8 }}>
              {item.target_price != null && (
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
                  {formatEur(item.target_price)}
                </Text>
              )}
              <View style={{ flexDirection: 'row', gap: 12 }}>
                {item.status !== 'posted' && (
                  <TouchableOpacity
                    onPress={() => markPosted.mutate(item.id)}
                    hitSlop={8}
                  >
                    <Ionicons name="checkmark-circle-outline" size={22} color={colors.success} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => handleDelete(item.id, item.item_name ?? '')}
                  hitSlop={8}
                >
                  <Ionicons name="trash-outline" size={20} color={colors.danger} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <Text style={{ fontSize: 26, fontWeight: '700', color: colors.text, letterSpacing: -0.8 }}>
            Inventory
          </Text>
          <Text style={{ fontSize: 14, color: colors.textSecondary }}>
            {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
          </Text>
        </View>

        {/* Search */}
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.inputBg, borderRadius: 10, paddingHorizontal: 12, marginBottom: 12, borderWidth: 1, borderColor: colors.border }}>
          <Ionicons name="search-outline" size={18} color={colors.textTertiary} />
          <TextInput
            placeholder="Search brand, item, designer..."
            placeholderTextColor={colors.textTertiary}
            value={search}
            onChangeText={setSearch}
            style={{ flex: 1, paddingVertical: 10, paddingLeft: 8, fontSize: 15, color: colors.text }}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter bar */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {STATUS_FILTERS.map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 7,
                borderRadius: 8,
                backgroundColor: filter === f ? accent : colors.inputBg,
                borderWidth: 1,
                borderColor: filter === f ? accent : colors.border,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: filter === f ? (accent === '#111111' ? '#fff' : '#0F0F0D') : colors.textSecondary }}>
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <Ionicons name="albums-outline" size={48} color={colors.textTertiary} />
            <Text style={{ fontSize: 16, color: colors.textSecondary, marginTop: 12, fontWeight: '500' }}>
              {isLoading ? 'Loading...' : 'No items found'}
            </Text>
            <Text style={{ fontSize: 14, color: colors.textTertiary, marginTop: 4 }}>
              Tap + to add your first item
            </Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 100 }}
      />

      {/* FAB */}
      <TouchableOpacity
        onPress={() => router.push('/inventory/new')}
        style={{
          position: 'absolute',
          right: 20,
          bottom: 30,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: accent,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        <Ionicons name="add" size={28} color={accent === '#111111' ? '#fff' : '#0F0F0D'} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

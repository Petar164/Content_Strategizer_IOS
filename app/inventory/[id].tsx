import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/hooks/useTheme';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ItemForm, ItemFormData, DEFAULT_FORM } from '@/components/inventory/ItemForm';
import { InventoryItem, Caption } from '@/types/database';
import { formatEur, formatNumber } from '@/lib/theme';

const STATUS_COLORS: Record<string, string> = {
  in_hand: '#3B82F6',
  on_the_way: '#F59E0B',
  sold: '#6B7280',
  personal_collection: '#8B5CF6',
  posted: '#10B981',
  unposted: '#EF4444',
  needs_repost: '#F97316',
};

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const { colors, accent } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<ItemFormData>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);

  const { data: item, isLoading } = useQuery<InventoryItem>({
    queryKey: ['inventory-item', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('id', id)
        .single();
      return data;
    },
    enabled: !!id,
  });

  const { data: captions = [] } = useQuery<Caption[]>({
    queryKey: ['captions', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('captions')
        .select('*')
        .eq('item_id', id)
        .order('created_at', { ascending: false });
      return data ?? [];
    },
    enabled: !!id,
  });

  const deleteItem = useMutation({
    mutationFn: async () => {
      await supabase.from('inventory_items').delete().eq('id', id!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', user?.id] });
      router.back();
    },
  });

  function startEdit() {
    if (!item) return;
    setEditForm({
      brand: item.brand ?? '',
      season: item.season ?? '',
      collection_name: item.collection_name ?? '',
      designer: item.designer ?? '',
      item_name: item.item_name ?? '',
      category: item.category ?? '',
      condition_score: item.condition_score != null ? String(item.condition_score) : '',
      condition_flaws: item.condition_flaws ?? '',
      size_tagged: item.size_tagged ?? '',
      measurements: item.measurements ?? '',
      fit_notes: item.fit_notes ?? '',
      status: item.status ?? 'in_hand',
      price_paid: item.price_paid != null ? String(item.price_paid) : '',
      target_price: item.target_price != null ? String(item.target_price) : '',
      availability_type: item.availability_type ?? 'for_sale',
      acquisition_date: item.acquisition_date ?? '',
      rarity_estimate: item.rarity_estimate ?? 'common',
      engagement_potential: item.engagement_potential ?? 'medium',
      sales_potential: item.sales_potential ?? 'medium',
      notes: item.notes ?? '',
    });
    setEditing(true);
  }

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase
      .from('inventory_items')
      .update({
        brand: editForm.brand || null,
        season: editForm.season || null,
        collection_name: editForm.collection_name || null,
        designer: editForm.designer || null,
        item_name: editForm.item_name || null,
        category: editForm.category || null,
        condition_score: editForm.condition_score ? parseFloat(editForm.condition_score) : null,
        condition_flaws: editForm.condition_flaws || null,
        size_tagged: editForm.size_tagged || null,
        measurements: editForm.measurements || null,
        fit_notes: editForm.fit_notes || null,
        status: editForm.status,
        price_paid: editForm.price_paid ? parseFloat(editForm.price_paid) : null,
        target_price: editForm.target_price ? parseFloat(editForm.target_price) : null,
        availability_type: editForm.availability_type,
        acquisition_date: editForm.acquisition_date || null,
        rarity_estimate: editForm.rarity_estimate,
        engagement_potential: editForm.engagement_potential,
        sales_potential: editForm.sales_potential,
        notes: editForm.notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id!);
    setSaving(false);
    if (error) {
      Alert.alert('Error', error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['inventory-item', id] });
    queryClient.invalidateQueries({ queryKey: ['inventory', user?.id] });
    setEditing(false);
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }

  if (!item) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <Text style={{ color: colors.text }}>Item not found</Text>
      </View>
    );
  }

  if (editing) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom']}>
        <Stack.Screen
          options={{
            title: 'Edit Item',
            headerRight: () => (
              <TouchableOpacity onPress={() => setEditing(false)}>
                <Text style={{ color: accent }}>Cancel</Text>
              </TouchableOpacity>
            ),
          }}
        />
        <ItemForm data={editForm} onChange={setEditForm} onSubmit={handleSave} loading={saving} submitLabel="Save Changes" />
      </SafeAreaView>
    );
  }

  const statusColor = item.status ? STATUS_COLORS[item.status] : '#9CA3AF';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: item.item_name ?? 'Item Detail',
          headerRight: () => (
            <TouchableOpacity onPress={startEdit}>
              <Ionicons name="pencil-outline" size={20} color={accent} />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        {/* Header */}
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <View style={{ flex: 1, gap: 4 }}>
              {item.brand && (
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {item.brand} {item.season && `· ${item.season}`}
                </Text>
              )}
              <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text, letterSpacing: -0.5 }}>
                {item.item_name ?? 'Untitled Item'}
              </Text>
              {item.designer && (
                <Text style={{ fontSize: 15, color: colors.textSecondary }}>{item.designer}</Text>
              )}
            </View>
            {item.target_price != null && (
              <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text }}>{formatEur(item.target_price)}</Text>
            )}
          </View>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {item.status && <Badge label={item.status.replace(/_/g, ' ')} color={`${statusColor}22`} textColor={statusColor} />}
            {item.rarity_estimate && <Badge label={item.rarity_estimate} color={`${accent}11`} textColor={accent} />}
            {item.availability_type && <Badge label={item.availability_type.replace(/_/g, ' ')} />}
          </View>
        </Card>

        {/* Details grid */}
        <Card>
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Details</Text>
          <View style={{ gap: 10 }}>
            {[
              ['Collection', item.collection_name],
              ['Category', item.category],
              ['Size Tagged', item.size_tagged],
              ['Measurements', item.measurements],
              ['Fit Notes', item.fit_notes],
              ['Condition', item.condition_score != null ? `${item.condition_score}/10` : null],
              ['Flaws', item.condition_flaws],
              ['Price Paid', item.price_paid != null ? formatEur(item.price_paid) : null],
              ['Target Price', item.target_price != null ? formatEur(item.target_price) : null],
              ['Acquired', item.acquisition_date],
              ['Times Posted', item.times_posted > 0 ? String(item.times_posted) : null],
              ['Engagement', item.engagement_potential],
              ['Sales Potential', item.sales_potential],
            ].filter(([, v]) => v).map(([label, val]) => (
              <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 14, color: colors.textSecondary, flex: 1 }}>{label}</Text>
                <Text style={{ fontSize: 14, color: colors.text, flex: 1, textAlign: 'right' }}>{val}</Text>
              </View>
            ))}
          </View>
        </Card>

        {item.notes && (
          <Card>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Notes</Text>
            <Text style={{ fontSize: 15, color: colors.text, lineHeight: 22 }}>{item.notes}</Text>
          </Card>
        )}

        {/* Caption Generator */}
        <Button
          onPress={() => router.push({ pathname: '/inventory/caption', params: { itemId: id } })}
          label="Generate Caption"
          variant="secondary"
        />

        {/* Caption History */}
        {captions.length > 0 && (
          <View>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 10 }}>Caption History</Text>
            <View style={{ gap: 10 }}>
              {captions.map((cap) => (
                <Card key={cap.id}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Badge label={cap.platform ?? 'instagram'} />
                    <Text style={{ fontSize: 12, color: colors.textTertiary }}>
                      {format(new Date(cap.created_at), 'MMM d, yyyy')}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 14, color: colors.text, lineHeight: 20 }} numberOfLines={4}>
                    {cap.full_caption ?? `${cap.title_line ?? ''}\n${cap.body_copy ?? ''}`}
                  </Text>
                </Card>
              ))}
            </View>
          </View>
        )}

        {/* Delete */}
        <Button
          onPress={() =>
            Alert.alert('Delete Item', 'This cannot be undone.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => deleteItem.mutate() },
            ])
          }
          label="Delete Item"
          variant="danger"
          style={{ marginTop: 8 }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

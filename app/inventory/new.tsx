import React, { useState } from 'react';
import { Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/hooks/useTheme';
import { ItemForm, ItemFormData, DEFAULT_FORM } from '@/components/inventory/ItemForm';

export default function NewItemScreen() {
  const { user } = useAuthStore();
  const { colors } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ItemFormData>(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!user) return;
    if (!form.item_name && !form.brand) {
      Alert.alert('Error', 'Please enter at least a brand or item name.');
      return;
    }

    setLoading(true);
    const now = new Date().toISOString();
    const { error } = await supabase.from('inventory_items').insert({
      user_id: user.id,
      brand: form.brand || null,
      season: form.season || null,
      collection_name: form.collection_name || null,
      designer: form.designer || null,
      item_name: form.item_name || null,
      category: form.category || null,
      condition_score: form.condition_score ? parseFloat(form.condition_score) : null,
      condition_flaws: form.condition_flaws || null,
      size_tagged: form.size_tagged || null,
      measurements: form.measurements || null,
      fit_notes: form.fit_notes || null,
      status: form.status,
      price_paid: form.price_paid ? parseFloat(form.price_paid) : null,
      target_price: form.target_price ? parseFloat(form.target_price) : null,
      availability_type: form.availability_type,
      acquisition_date: form.acquisition_date || null,
      rarity_estimate: form.rarity_estimate,
      engagement_potential: form.engagement_potential,
      sales_potential: form.sales_potential,
      notes: form.notes || null,
      times_posted: 0,
      created_at: now,
      updated_at: now,
    });

    setLoading(false);
    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    queryClient.invalidateQueries({ queryKey: ['inventory', user.id] });
    router.back();
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom']}>
      <ItemForm data={form} onChange={setForm} onSubmit={handleSubmit} loading={loading} submitLabel="Add Item" />
    </SafeAreaView>
  );
}

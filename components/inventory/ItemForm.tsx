import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ItemStatus, RarityEstimate, EngagementPotential, SalesPotential, AvailabilityType } from '@/types/database';

export interface ItemFormData {
  brand: string;
  season: string;
  collection_name: string;
  designer: string;
  item_name: string;
  category: string;
  condition_score: string;
  condition_flaws: string;
  size_tagged: string;
  measurements: string;
  fit_notes: string;
  status: ItemStatus;
  price_paid: string;
  target_price: string;
  availability_type: AvailabilityType;
  acquisition_date: string;
  rarity_estimate: RarityEstimate;
  engagement_potential: EngagementPotential;
  sales_potential: SalesPotential;
  notes: string;
}

export const DEFAULT_FORM: ItemFormData = {
  brand: '',
  season: '',
  collection_name: '',
  designer: '',
  item_name: '',
  category: '',
  condition_score: '',
  condition_flaws: '',
  size_tagged: '',
  measurements: '',
  fit_notes: '',
  status: 'in_hand',
  price_paid: '',
  target_price: '',
  availability_type: 'for_sale',
  acquisition_date: '',
  rarity_estimate: 'common',
  engagement_potential: 'medium',
  sales_potential: 'medium',
  notes: '',
};

interface Props {
  data: ItemFormData;
  onChange: (data: ItemFormData) => void;
  onSubmit: () => void;
  loading?: boolean;
  submitLabel?: string;
}

function Section({ title }: { title: string }) {
  const { colors } = useTheme();
  return (
    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 20, marginBottom: 10 }}>
      {title}
    </Text>
  );
}

function SelectRow<T extends string>({
  label,
  options,
  value,
  onSelect,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onSelect: (v: T) => void;
}) {
  const { colors, accent } = useTheme();
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.2 }}>{label}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            onPress={() => onSelect(opt.value)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 8,
              backgroundColor: value === opt.value ? accent : colors.inputBg,
              borderWidth: 1,
              borderColor: value === opt.value ? accent : colors.border,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: value === opt.value ? (accent === '#111111' ? '#fff' : '#0F0F0D') : colors.text }}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export function ItemForm({ data, onChange, onSubmit, loading, submitLabel = 'Save Item' }: Props) {
  const { colors } = useTheme();

  function set(field: keyof ItemFormData, val: string) {
    onChange({ ...data, [field]: val });
  }

  function NotesInput({ data, set }: { data: ItemFormData; set: (k: keyof ItemFormData, v: string) => void }) {
    return (
      <TextInput
        multiline
        numberOfLines={4}
        placeholder="Additional notes..."
        placeholderTextColor={colors.textTertiary}
        value={data.notes}
        onChangeText={(v) => set('notes', v)}
        style={{
          backgroundColor: colors.inputBg,
          borderRadius: 10,
          padding: 14,
          fontSize: 15,
          color: colors.text,
          minHeight: 100,
          textAlignVertical: 'top',
          marginBottom: 20,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      />
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <Section title="Item Info" />
      <Input label="Brand" placeholder="Maison Margiela" value={data.brand} onChangeText={(v) => set('brand', v)} />
      <Input label="Item Name" placeholder="Tabi boots" value={data.item_name} onChangeText={(v) => set('item_name', v)} />
      <Input label="Designer" placeholder="Martin Margiela" value={data.designer} onChangeText={(v) => set('designer', v)} />
      <Input label="Category" placeholder="Footwear" value={data.category} onChangeText={(v) => set('category', v)} />
      <Input label="Season" placeholder="AW96" value={data.season} onChangeText={(v) => set('season', v)} />
      <Input label="Collection Name" placeholder="Artisanal" value={data.collection_name} onChangeText={(v) => set('collection_name', v)} />

      <Section title="Condition" />
      <Input label="Condition Score (1–10)" placeholder="8" value={data.condition_score} onChangeText={(v) => set('condition_score', v)} keyboardType="numeric" />
      <Input label="Condition Flaws" placeholder="Minor heel wear..." value={data.condition_flaws} onChangeText={(v) => set('condition_flaws', v)} />

      <Section title="Sizing" />
      <Input label="Size Tagged" placeholder="EU 42" value={data.size_tagged} onChangeText={(v) => set('size_tagged', v)} />
      <Input label="Measurements" placeholder="Shaft 14cm, toe..." value={data.measurements} onChangeText={(v) => set('measurements', v)} />
      <Input label="Fit Notes" placeholder="Runs small, add +0.5" value={data.fit_notes} onChangeText={(v) => set('fit_notes', v)} />

      <Section title="Status" />
      <SelectRow
        label="Status"
        options={[
          { value: 'in_hand', label: 'In Hand' },
          { value: 'on_the_way', label: 'On the Way' },
          { value: 'unposted', label: 'Unposted' },
          { value: 'posted', label: 'Posted' },
          { value: 'needs_repost', label: 'Needs Repost' },
          { value: 'personal_collection', label: 'Personal' },
          { value: 'sold', label: 'Sold' },
        ]}
        value={data.status}
        onSelect={(v) => onChange({ ...data, status: v })}
      />
      <SelectRow
        label="Availability"
        options={[
          { value: 'for_sale', label: 'For Sale' },
          { value: 'personal', label: 'Personal' },
          { value: 'hold', label: 'Hold' },
        ]}
        value={data.availability_type}
        onSelect={(v) => onChange({ ...data, availability_type: v })}
      />

      <Section title="Pricing" />
      <Input label="Price Paid (€)" placeholder="80" value={data.price_paid} onChangeText={(v) => set('price_paid', v)} keyboardType="numeric" />
      <Input label="Target Price (€)" placeholder="250" value={data.target_price} onChangeText={(v) => set('target_price', v)} keyboardType="numeric" />
      <Input label="Acquisition Date" placeholder="2024-01-15" value={data.acquisition_date} onChangeText={(v) => set('acquisition_date', v)} />

      <Section title="Assessment" />
      <SelectRow
        label="Rarity"
        options={[
          { value: 'common', label: 'Common' },
          { value: 'uncommon', label: 'Uncommon' },
          { value: 'rare', label: 'Rare' },
          { value: 'grail', label: 'Grail' },
        ]}
        value={data.rarity_estimate}
        onSelect={(v) => onChange({ ...data, rarity_estimate: v })}
      />
      <SelectRow
        label="Engagement Potential"
        options={[
          { value: 'low', label: 'Low' },
          { value: 'medium', label: 'Medium' },
          { value: 'high', label: 'High' },
          { value: 'viral', label: 'Viral' },
        ]}
        value={data.engagement_potential}
        onSelect={(v) => onChange({ ...data, engagement_potential: v })}
      />
      <SelectRow
        label="Sales Potential"
        options={[
          { value: 'low', label: 'Low' },
          { value: 'medium', label: 'Medium' },
          { value: 'high', label: 'High' },
        ]}
        value={data.sales_potential}
        onSelect={(v) => onChange({ ...data, sales_potential: v })}
      />

      <Section title="Notes" />
      <NotesInput data={data} set={set} />

      <Button onPress={onSubmit} label={submitLabel} loading={loading} />
    </ScrollView>
  );
}

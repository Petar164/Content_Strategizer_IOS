import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useProfileStore } from '@/store/profileStore';
import { useTheme } from '@/hooks/useTheme';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { callClaude, getClaudeApiKey, buildSystemPrompt } from '@/lib/claude';
import { InventoryItem } from '@/types/database';

type CaptionPlatform = 'instagram' | 'grailed' | 'vinted';

const PLATFORM_OPTIONS: { value: CaptionPlatform; label: string }[] = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'grailed', label: 'Grailed' },
  { value: 'vinted', label: 'Vinted' },
];

async function fetchWebContext(brand: string, season: string, collection: string, item: string, designer: string): Promise<string> {
  const contexts: string[] = [];
  try {
    const ddgQuery = encodeURIComponent(`${brand} ${season} ${collection} ${item} fashion archive`);
    const ddgRes = await fetch(
      `https://api.duckduckgo.com/?q=${ddgQuery}&format=json&no_html=1&skip_disambig=1`,
      { signal: AbortSignal.timeout(4000) }
    );
    const ddgData = await ddgRes.json();
    if (ddgData.AbstractText) {
      contexts.push(`Brand/Item context: ${ddgData.AbstractText}`);
    }
  } catch (_) {}

  try {
    if (designer) {
      const wikiSlug = encodeURIComponent(`${designer.replace(/ /g, '_')}_(fashion_designer)`);
      const wikiRes = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${wikiSlug}`,
        { signal: AbortSignal.timeout(4000) }
      );
      if (wikiRes.ok) {
        const wikiData = await wikiRes.json();
        if (wikiData.extract) {
          contexts.push(`Designer context: ${wikiData.extract.slice(0, 300)}`);
        }
      }
    }
  } catch (_) {}

  return contexts.join('\n\n');
}

function buildCaptionPrompt(item: InventoryItem, platform: CaptionPlatform, webContext: string): string {
  const itemDetails = [
    item.brand && `Brand: ${item.brand}`,
    item.season && `Season: ${item.season}`,
    item.collection_name && `Collection: ${item.collection_name}`,
    item.designer && `Designer: ${item.designer}`,
    item.item_name && `Item: ${item.item_name}`,
    item.category && `Category: ${item.category}`,
    item.condition_score != null && `Condition: ${item.condition_score}/10`,
    item.condition_flaws && `Flaws: ${item.condition_flaws}`,
    item.size_tagged && `Size: ${item.size_tagged}`,
    item.measurements && `Measurements: ${item.measurements}`,
    item.fit_notes && `Fit notes: ${item.fit_notes}`,
    item.rarity_estimate && `Rarity: ${item.rarity_estimate}`,
  ].filter(Boolean).join('\n');

  if (platform === 'instagram') {
    return `Write an Instagram caption for this archive fashion item.

ITEM DETAILS:
${itemDetails}

${webContext ? `WEB CONTEXT:\n${webContext}\n` : ''}

RULES:
- Editorial voice, no em dashes, no price mentions
- Body: one editorial paragraph (2-4 sentences), use the web context to add accuracy and depth
- End with: "Available via DM or at fashionvoid.net"
- Exactly 5 niche fashion hashtags at the very end, each on its own line starting with #
- No filler phrases like "timeless" or "iconic"

Output ONLY the caption text, nothing else.`;
  }

  if (platform === 'grailed') {
    return `Write a Grailed listing for this archive fashion item.

ITEM DETAILS:
${itemDetails}

${webContext ? `WEB CONTEXT:\n${webContext}\n` : ''}

Format:
TITLE: [brand] [item name] [season/year] [size]
DESCRIPTION: [2-3 detailed paragraphs about the piece, its history, condition details, sizing]
MEASUREMENTS: [list measurements if provided]
CONDITION: [honest condition description based on score and flaws]

Output ONLY the listing text.`;
  }

  return `Write a Vinted listing for this archive fashion item.

ITEM DETAILS:
${itemDetails}

${webContext ? `WEB CONTEXT:\n${webContext}\n` : ''}

Format:
TITLE: [brand] [item] [size]
DESCRIPTION: [Clear, honest description: what it is, brand heritage briefly, condition, sizing notes]

Keep it conversational and informative. Output ONLY the listing text.`;
}

export default function CaptionGeneratorScreen() {
  const { itemId } = useLocalSearchParams<{ itemId: string }>();
  const { user } = useAuthStore();
  const { profile } = useProfileStore();
  const { colors, accent } = useTheme();
  const queryClient = useQueryClient();
  const [platform, setPlatform] = useState<CaptionPlatform>('instagram');
  const [generating, setGenerating] = useState(false);
  const [caption, setCaption] = useState('');
  const [saved, setSaved] = useState(false);

  const { data: item } = useQuery<InventoryItem>({
    queryKey: ['inventory-item', itemId],
    queryFn: async () => {
      const { data } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('id', itemId!)
        .single();
      return data;
    },
    enabled: !!itemId,
  });

  async function handleGenerate() {
    const apiKey = await getClaudeApiKey();
    if (!apiKey) {
      Alert.alert('API Key Required', 'Please add your Claude API key in Settings → Claude API Key.');
      return;
    }
    if (!item) return;

    setGenerating(true);
    setSaved(false);
    try {
      const webContext = await fetchWebContext(
        item.brand ?? '',
        item.season ?? '',
        item.collection_name ?? '',
        item.item_name ?? '',
        item.designer ?? ''
      );

      const systemPrompt = profile ? buildSystemPrompt(profile as any) : 'You are Void, a content strategy AI for an archive fashion account.';
      const userPrompt = buildCaptionPrompt(item, platform, webContext);

      const result = await callClaude([{ role: 'user', content: userPrompt }], systemPrompt, apiKey);
      setCaption(result);
    } catch (err: any) {
      Alert.alert('Generation Failed', err.message ?? 'Unknown error');
    } finally {
      setGenerating(false);
    }
  }

  async function handleCopy() {
    await Clipboard.setStringAsync(caption);
    Alert.alert('Copied', 'Caption copied to clipboard.');
  }

  async function handleSave() {
    if (!user || !caption) return;
    const { error } = await supabase.from('captions').insert({
      user_id: user.id,
      item_id: itemId ?? null,
      platform,
      full_caption: caption,
      is_validated: false,
      is_posted: false,
      created_at: new Date().toISOString(),
    });
    if (error) {
      Alert.alert('Error', error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['captions', itemId] });
    setSaved(true);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Caption Generator', presentation: 'modal' }} />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        {/* Item context */}
        {item && (
          <Card>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Item</Text>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>{item.item_name ?? 'Untitled'}</Text>
            {item.brand && <Text style={{ fontSize: 14, color: colors.textSecondary }}>{item.brand} {item.season && `· ${item.season}`}</Text>}
          </Card>
        )}

        {/* Platform selector */}
        <View>
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Platform</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {PLATFORM_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                onPress={() => setPlatform(opt.value)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: 'center',
                  backgroundColor: platform === opt.value ? accent : colors.surface,
                  borderWidth: 1,
                  borderColor: platform === opt.value ? accent : colors.border,
                }}
              >
                <Text style={{ fontWeight: '600', fontSize: 14, color: platform === opt.value ? (accent === '#111111' ? '#fff' : '#0F0F0D') : colors.text }}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Button
          onPress={handleGenerate}
          label={generating ? 'Generating...' : 'Generate Caption'}
          loading={generating}
        />

        {/* Result */}
        {caption.length > 0 && (
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Badge label={platform} />
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity onPress={handleCopy} hitSlop={8}>
                  <Ionicons name="copy-outline" size={20} color={accent} />
                </TouchableOpacity>
                {!saved && (
                  <TouchableOpacity onPress={handleSave} hitSlop={8}>
                    <Ionicons name="save-outline" size={20} color={accent} />
                  </TouchableOpacity>
                )}
                {saved && (
                  <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                )}
              </View>
            </View>
            <TextInput
              multiline
              value={caption}
              onChangeText={setCaption}
              style={{ fontSize: 15, color: colors.text, lineHeight: 22, minHeight: 200 }}
            />
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

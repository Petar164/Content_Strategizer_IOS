import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useProfileStore } from '@/store/profileStore';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const TOTAL_STEPS = 8; // 0-7

type TagInputProps = {
  label: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  accent: string;
};

function TagInput({ label, tags, onChange, placeholder, accent }: TagInputProps) {
  const { colors } = useTheme();
  const [input, setInput] = useState('');

  function addTag() {
    const t = input.trim().replace(/^#/, '');
    if (t && !tags.includes(t)) onChange([...tags, t]);
    setInput('');
  }

  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.2 }}>
        {label}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
        {tags.map((tag) => (
          <TouchableOpacity
            key={tag}
            onPress={() => onChange(tags.filter((t) => t !== tag))}
            style={{ backgroundColor: `${accent}22`, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 4 }}
          >
            <Text style={{ color: accent, fontWeight: '600', fontSize: 13 }}>{tag}</Text>
            <Text style={{ color: accent, fontSize: 12 }}>×</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder={placeholder ?? 'Type and add'}
          placeholderTextColor={colors.textTertiary}
          onSubmitEditing={addTag}
          returnKeyType="done"
          style={{
            flex: 1,
            backgroundColor: colors.inputBg,
            borderRadius: 10,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontSize: 15,
            color: colors.text,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        />
        <TouchableOpacity
          onPress={addTag}
          style={{ backgroundColor: accent, borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center' }}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 18 }}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

type ToggleChipProps = {
  label: string;
  selected: boolean;
  onToggle: () => void;
  accent: string;
};

function ToggleChip({ label, selected, onToggle, accent }: ToggleChipProps) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      onPress={onToggle}
      style={{
        backgroundColor: selected ? accent : colors.inputBg,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: selected ? accent : colors.border,
        margin: 4,
      }}
    >
      <Text style={{ color: selected ? (accent === '#111111' ? '#fff' : '#0F0F0D') : colors.text, fontWeight: '600', fontSize: 14 }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function OnboardingScreen() {
  const { colors, accent } = useTheme();
  const { user } = useAuthStore();
  const { setProfile } = useProfileStore();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Form state
  const [instagramHandle, setInstagramHandle] = useState('');
  const [currentFollowers, setCurrentFollowers] = useState('');
  const [followerGoal, setFollowerGoal] = useState('');
  const [accountStartYear, setAccountStartYear] = useState('');
  const [nicheDescription, setNicheDescription] = useState('');
  const [primaryEras, setPrimaryEras] = useState<string[]>([]);
  const [heroBrands, setHeroBrands] = useState<string[]>([]);
  const [postTypesUsed, setPostTypesUsed] = useState<string[]>([]);
  const [postingFrequency, setPostingFrequency] = useState('');
  const [appearsOnCamera, setAppearsOnCamera] = useState('');
  const [captionStyle, setCaptionStyle] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [audienceComeFor, setAudienceComeFor] = useState<string[]>([]);
  const [competitorAccounts, setCompetitorAccounts] = useState<string[]>([]);
  const [sellsItems, setSellsItems] = useState(false);
  const [avgItemPrice, setAvgItemPrice] = useState('');
  const [monthlyBudget, setMonthlyBudget] = useState('');
  const [sellPlatforms, setSellPlatforms] = useState<string[]>([]);
  const [secondaryPlatforms, setSecondaryPlatforms] = useState<string[]>([]);
  const [biggestChallenge, setBiggestChallenge] = useState('');
  const [whatWorked, setWhatWorked] = useState('');
  const [aiContext, setAiContext] = useState('');

  const ERAS = ['80s', '90s', '00s', '10s', 'Y2K', 'SS', 'AW'];
  const POST_TYPES = ['carousel', 'reel', 'single', 'story'];
  const SELL_PLATFORMS_LIST = ['Grailed', 'Vinted', 'DM', 'Website'];
  const SECONDARY_PLATFORMS_LIST = ['TikTok', 'Pinterest', 'Twitter/X', 'YouTube'];

  function toggleArray(arr: string[], val: string, set: (a: string[]) => void) {
    set(arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]);
  }

  async function handleFinish() {
    if (!user) return;
    setSaving(true);
    const { data, error } = await supabase
      .from('user_profile')
      .upsert({
        user_id: user.id,
        instagram_handle: instagramHandle,
        current_followers: parseInt(currentFollowers) || null,
        follower_goal: parseInt(followerGoal) || null,
        account_start_year: parseInt(accountStartYear) || null,
        niche_description: nicheDescription,
        primary_eras: primaryEras,
        hero_brands: heroBrands,
        post_types_used: postTypesUsed,
        posting_frequency: postingFrequency,
        appears_on_camera: appearsOnCamera,
        caption_style: captionStyle,
        target_audience: targetAudience,
        audience_comes_for: audienceComeFor,
        competitor_accounts: competitorAccounts,
        sells_items: sellsItems,
        avg_item_price: parseFloat(avgItemPrice) || null,
        monthly_budget: parseFloat(monthlyBudget) || null,
        sell_platforms: sellPlatforms,
        secondary_platforms: secondaryPlatforms,
        biggest_challenge: biggestChallenge,
        what_worked: whatWorked,
        ai_context: aiContext,
        optimization_mode: 'Growth',
        dark_mode: false,
        accent_color: 'mono',
        onboarding_complete: true,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    setSaving(false);
    if (error) {
      Alert.alert('Error', error.message);
      return;
    }
    if (data) setProfile(data);
    router.replace('/(tabs)');
  }

  function renderStep() {
    switch (step) {
      case 0:
        return (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ fontSize: 13, fontWeight: '700', letterSpacing: 4, textTransform: 'uppercase', color: colors.textSecondary, marginBottom: 12 }}>
              FASHIONVOID
            </Text>
            <Text style={{ fontSize: 36, fontWeight: '700', color: colors.text, letterSpacing: -1.5, textAlign: 'center', marginBottom: 12 }}>
              Strategizer
            </Text>
            <Text style={{ fontSize: 17, color: colors.textSecondary, textAlign: 'center', lineHeight: 26, maxWidth: 300 }}>
              Your archive fashion strategy engine. Let's set up your account.
            </Text>
          </View>
        );

      case 1:
        return (
          <View>
            <Text style={sectionTitle(colors)}>Account Basics</Text>
            <Input label="Instagram Handle" placeholder="@yourhandle" value={instagramHandle} onChangeText={setInstagramHandle} autoCapitalize="none" />
            <Input label="Current Followers" placeholder="2847" value={currentFollowers} onChangeText={setCurrentFollowers} keyboardType="numeric" />
            <Input label="Follower Goal" placeholder="10000" value={followerGoal} onChangeText={setFollowerGoal} keyboardType="numeric" />
            <Input label="Account Start Year" placeholder="2021" value={accountStartYear} onChangeText={setAccountStartYear} keyboardType="numeric" />
          </View>
        );

      case 2:
        return (
          <View>
            <Text style={sectionTitle(colors)}>Your Niche</Text>
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.2 }}>
                Niche Description
              </Text>
              <TextInput
                multiline
                numberOfLines={4}
                placeholder="Describe your archive fashion account..."
                placeholderTextColor={colors.textTertiary}
                value={nicheDescription}
                onChangeText={setNicheDescription}
                style={{ backgroundColor: colors.inputBg, borderRadius: 10, padding: 14, fontSize: 15, color: colors.text, borderWidth: 1, borderColor: colors.border, minHeight: 100, textAlignVertical: 'top', marginBottom: 16 }}
              />
            </View>
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.2 }}>
                Primary Eras
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {ERAS.map((era) => (
                  <ToggleChip key={era} label={era} selected={primaryEras.includes(era)} onToggle={() => toggleArray(primaryEras, era, setPrimaryEras)} accent={accent} />
                ))}
              </View>
            </View>
            <TagInput label="Hero Brands" tags={heroBrands} onChange={setHeroBrands} placeholder="e.g. Maison Margiela" accent={accent} />
          </View>
        );

      case 3:
        return (
          <View>
            <Text style={sectionTitle(colors)}>Content Style</Text>
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.2 }}>
                Post Types Used
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {POST_TYPES.map((type) => (
                  <ToggleChip key={type} label={type} selected={postTypesUsed.includes(type)} onToggle={() => toggleArray(postTypesUsed, type, setPostTypesUsed)} accent={accent} />
                ))}
              </View>
            </View>
            <Input label="Posting Frequency" placeholder="e.g. 3x per week" value={postingFrequency} onChangeText={setPostingFrequency} />
            <Input label="Appears on Camera?" placeholder="Yes / No / Sometimes" value={appearsOnCamera} onChangeText={setAppearsOnCamera} />
            <Input label="Caption Style" placeholder="e.g. Editorial, minimal, detailed" value={captionStyle} onChangeText={setCaptionStyle} />
          </View>
        );

      case 4:
        return (
          <View>
            <Text style={sectionTitle(colors)}>Your Audience</Text>
            <Input label="Target Audience" placeholder="e.g. 18-30 fashion enthusiasts" value={targetAudience} onChangeText={setTargetAudience} />
            <TagInput label="Audience Comes For" tags={audienceComeFor} onChange={setAudienceComeFor} placeholder="e.g. styling, rare finds" accent={accent} />
            <TagInput label="Competitor / Peer Accounts" tags={competitorAccounts} onChange={setCompetitorAccounts} placeholder="e.g. @account" accent={accent} />
          </View>
        );

      case 5:
        return (
          <View>
            <Text style={sectionTitle(colors)}>Business</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.inputBg, borderRadius: 10, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontSize: 16, color: colors.text, fontWeight: '500' }}>I sell items</Text>
              <Switch value={sellsItems} onValueChange={setSellsItems} trackColor={{ true: accent }} />
            </View>
            {sellsItems && (
              <>
                <Input label="Avg Item Price (€)" placeholder="150" value={avgItemPrice} onChangeText={setAvgItemPrice} keyboardType="numeric" />
                <Input label="Monthly Budget (€)" placeholder="300" value={monthlyBudget} onChangeText={setMonthlyBudget} keyboardType="numeric" />
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.2 }}>Sell Platforms</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    {SELL_PLATFORMS_LIST.map((p) => (
                      <ToggleChip key={p} label={p} selected={sellPlatforms.includes(p)} onToggle={() => toggleArray(sellPlatforms, p, setSellPlatforms)} accent={accent} />
                    ))}
                  </View>
                </View>
              </>
            )}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.2 }}>Secondary Platforms</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {SECONDARY_PLATFORMS_LIST.map((p) => (
                  <ToggleChip key={p} label={p} selected={secondaryPlatforms.includes(p)} onToggle={() => toggleArray(secondaryPlatforms, p, setSecondaryPlatforms)} accent={accent} />
                ))}
              </View>
            </View>
          </View>
        );

      case 6:
        return (
          <View>
            <Text style={sectionTitle(colors)}>AI Context</Text>
            <Text style={{ fontSize: 15, color: colors.textSecondary, marginBottom: 20, lineHeight: 22 }}>
              Help Void understand your account. This context makes all AI recommendations more accurate.
            </Text>
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.2 }}>Biggest Challenge</Text>
              <TextInput multiline numberOfLines={3} placeholder="e.g. Consistency, finding the right audience..." placeholderTextColor={colors.textTertiary} value={biggestChallenge} onChangeText={setBiggestChallenge} style={{ backgroundColor: colors.inputBg, borderRadius: 10, padding: 14, fontSize: 15, color: colors.text, borderWidth: 1, borderColor: colors.border, minHeight: 80, textAlignVertical: 'top', marginBottom: 16 }} />
            </View>
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.2 }}>What Has Worked</Text>
              <TextInput multiline numberOfLines={3} placeholder="e.g. Close-up detail shots, late night posts..." placeholderTextColor={colors.textTertiary} value={whatWorked} onChangeText={setWhatWorked} style={{ backgroundColor: colors.inputBg, borderRadius: 10, padding: 14, fontSize: 15, color: colors.text, borderWidth: 1, borderColor: colors.border, minHeight: 80, textAlignVertical: 'top', marginBottom: 16 }} />
            </View>
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.2 }}>Additional Context for Void</Text>
              <TextInput multiline numberOfLines={4} placeholder="Anything else Void should know about your account..." placeholderTextColor={colors.textTertiary} value={aiContext} onChangeText={setAiContext} style={{ backgroundColor: colors.inputBg, borderRadius: 10, padding: 14, fontSize: 15, color: colors.text, borderWidth: 1, borderColor: colors.border, minHeight: 100, textAlignVertical: 'top' }} />
            </View>
          </View>
        );

      case 7:
        return (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ fontSize: 48, marginBottom: 20 }}>✦</Text>
            <Text style={{ fontSize: 28, fontWeight: '700', color: colors.text, letterSpacing: -0.8, marginBottom: 12 }}>
              All set.
            </Text>
            <Text style={{ fontSize: 16, color: colors.textSecondary, textAlign: 'center', lineHeight: 24, maxWidth: 280 }}>
              {instagramHandle ? `@${instagramHandle.replace('@', '')}` : 'Your account'} is ready. Void is ready to strategize.
            </Text>
          </View>
        );

      default:
        return null;
    }
  }

  const isLast = step === TOTAL_STEPS - 1;
  const isFirst = step === 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Progress bar */}
      {step > 0 && step < TOTAL_STEPS - 1 && (
        <View style={{ height: 2, backgroundColor: colors.border, marginHorizontal: 24, borderRadius: 1, marginTop: 4 }}>
          <View style={{ height: '100%', width: `${((step) / (TOTAL_STEPS - 2)) * 100}%`, backgroundColor: accent, borderRadius: 1 }} />
        </View>
      )}

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, padding: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {renderStep()}
      </ScrollView>

      <View style={{ padding: 24, paddingBottom: 8, flexDirection: 'row', gap: 12 }}>
        {!isFirst && (
          <Button variant="secondary" onPress={() => setStep(step - 1)} label="Back" style={{ flex: 1 }} />
        )}
        {isLast ? (
          <Button onPress={handleFinish} label="Let's go" loading={saving} style={{ flex: 1 }} />
        ) : (
          <Button onPress={() => setStep(step + 1)} label={step === 0 ? "Get started" : "Continue"} style={{ flex: isFirst ? undefined : 1 }} />
        )}
      </View>
    </SafeAreaView>
  );
}

function sectionTitle(colors: ReturnType<typeof useTheme>['colors']) {
  return {
    fontSize: 26,
    fontWeight: '700' as const,
    color: colors.text,
    letterSpacing: -0.8,
    marginBottom: 24,
  };
}

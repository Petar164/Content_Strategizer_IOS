import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useProfileStore } from '@/store/profileStore';
import { useTheme } from '@/hooks/useTheme';
import { callClaude, getClaudeApiKey, buildSystemPrompt } from '@/lib/claude';
import { AnalyticsEntry } from '@/types/database';
import { formatNumber } from '@/lib/theme';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const SUGGESTED_PROMPTS = [
  { label: 'Daily Brief', prompt: 'Give me a daily content brief: what should I post today, what should I shoot next, and one key insight from my recent analytics.' },
  { label: 'Content Gap Analysis', prompt: 'Analyze my content gaps. What types of content am I missing and what should I create next based on what has worked?' },
  { label: 'Best Time to Post', prompt: 'Based on my account and target audience, what is the best time to post and why?' },
  { label: 'Caption Ideas', prompt: 'Give me 3 caption ideas in different styles for my next archive fashion post.' },
];

export default function AiChatScreen() {
  const { user } = useAuthStore();
  const { profile } = useProfileStore();
  const { colors, accent, darkMode } = useTheme();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: `Hey, I'm Void. Your archive fashion content strategist. What do you want to work on today?`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch recent analytics for context
  const { data: recentAnalytics = [] } = useQuery<AnalyticsEntry[]>({
    queryKey: ['analytics-recent', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('analytics_entries')
        .select('*')
        .eq('user_id', user!.id)
        .order('post_date', { ascending: false })
        .limit(10);
      return data ?? [];
    },
    enabled: !!user,
  });

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  function buildEnrichedSystemPrompt(): string {
    const base = profile ? buildSystemPrompt(profile as any) : 'You are Void, a content strategy AI for an archive fashion account.';

    let analyticsContext = '';
    if (recentAnalytics.length > 0) {
      const avgViews = Math.round(recentAnalytics.reduce((s, e) => s + (e.views ?? 0), 0) / recentAnalytics.length);
      const avgFollowers = Math.round(recentAnalytics.reduce((s, e) => s + (e.followers_gained ?? 0), 0) / recentAnalytics.length);
      const topPost = recentAnalytics.reduce((a, b) => (b.views ?? 0) > (a.views ?? 0) ? b : a);
      analyticsContext = `\n\nRecent analytics context (last ${recentAnalytics.length} posts):
- Average views: ${formatNumber(avgViews)}
- Average followers gained per post: +${formatNumber(avgFollowers)}
- Best recent post: ${topPost.post_type ?? 'post'} on ${topPost.post_date} with ${formatNumber(topPost.views ?? 0)} views
- Account: @${profile?.instagram_handle ?? 'unknown'} with ${formatNumber(profile?.current_followers ?? 0)} followers`;
    }

    return base + analyticsContext + '\n\nBe concise, specific, and actionable. You are a strategy AI, not a generic chatbot. Reference the account context in your answers.';
  }

  async function handleSend(promptOverride?: string) {
    const content = promptOverride ?? input.trim();
    if (!content || loading) return;

    const apiKey = await getClaudeApiKey();
    if (!apiKey) {
      Alert.alert('API Key Required', 'Add your Claude API key in Settings to use Void.');
      return;
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Build message history for Claude (excluding system message, max 10 turns)
      const history = [...messages, userMsg]
        .filter((m) => m.id !== '0')
        .slice(-10)
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

      const response = await callClaude(history, buildEnrichedSystemPrompt(), apiKey);

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to get response from Void');
    } finally {
      setLoading(false);
    }
  }

  function handleSuggestedPrompt(prompt: string) {
    handleSend(prompt);
  }

  const BG_USER = accent;
  const BG_ASSISTANT = colors.surface;
  const TEXT_USER = accent === '#111111' ? '#FFFFFF' : '#0F0F0D';
  const TEXT_ASSISTANT = colors.text;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, letterSpacing: -0.3 }}>Void</Text>
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>Content Strategy AI</Text>
        </View>
        <TouchableOpacity onPress={() => setMessages([{ id: '0', role: 'assistant', content: `Hey, I'm Void. Your archive fashion content strategist. What do you want to work on today?`, timestamp: new Date() }])} hitSlop={8}>
          <Ionicons name="refresh-outline" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((msg) => (
            <View
              key={msg.id}
              style={{
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
              }}
            >
              <View
                style={{
                  backgroundColor: msg.role === 'user' ? BG_USER : BG_ASSISTANT,
                  borderRadius: 16,
                  borderTopRightRadius: msg.role === 'user' ? 4 : 16,
                  borderTopLeftRadius: msg.role === 'assistant' ? 4 : 16,
                  padding: 14,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 2,
                  elevation: 1,
                }}
              >
                <Text
                  style={{
                    fontSize: 15,
                    color: msg.role === 'user' ? TEXT_USER : TEXT_ASSISTANT,
                    lineHeight: 22,
                  }}
                >
                  {msg.content}
                </Text>
              </View>
              <Text style={{ fontSize: 11, color: colors.textTertiary, marginTop: 3, alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', marginHorizontal: 4 }}>
                {format(msg.timestamp, 'HH:mm')}
              </Text>
            </View>
          ))}

          {loading && (
            <View style={{ alignSelf: 'flex-start', backgroundColor: colors.surface, borderRadius: 16, borderTopLeftRadius: 4, padding: 14 }}>
              <ActivityIndicator size="small" color={colors.textSecondary} />
            </View>
          )}

          {/* Suggested prompts (shown when only intro message) */}
          {messages.length === 1 && !loading && (
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 8 }}>Suggested</Text>
              {SUGGESTED_PROMPTS.map((p) => (
                <TouchableOpacity
                  key={p.label}
                  onPress={() => handleSuggestedPrompt(p.prompt)}
                  style={{ backgroundColor: `${accent}11`, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: `${accent}33` }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '600', color: accent }}>{p.label}</Text>
                  <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }} numberOfLines={2}>{p.prompt}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Input bar */}
        <View style={{ flexDirection: 'row', gap: 10, padding: 14, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background }}>
          <TextInput
            placeholder="Ask Void anything..."
            placeholderTextColor={colors.textTertiary}
            value={input}
            onChangeText={setInput}
            multiline
            style={{
              flex: 1,
              backgroundColor: colors.inputBg,
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 10,
              fontSize: 15,
              color: colors.text,
              maxHeight: 120,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          />
          <TouchableOpacity
            onPress={() => handleSend()}
            disabled={!input.trim() || loading}
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: input.trim() && !loading ? accent : colors.inputBg,
              alignItems: 'center',
              justifyContent: 'center',
              alignSelf: 'flex-end',
            }}
          >
            <Ionicons name="arrow-up" size={20} color={input.trim() && !loading ? (accent === '#111111' ? '#fff' : '#0F0F0D') : colors.textTertiary} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

import * as SecureStore from 'expo-secure-store';

export const CLAUDE_KEY_STORE = 'claude_api_key';

export async function getClaudeApiKey(): Promise<string | null> {
  return SecureStore.getItemAsync(CLAUDE_KEY_STORE);
}

export async function setClaudeApiKey(key: string): Promise<void> {
  return SecureStore.setItemAsync(CLAUDE_KEY_STORE, key);
}

export async function callClaude(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  systemPrompt: string,
  apiKey: string,
  model = 'claude-haiku-4-5-20251001'
): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as any)?.error?.message ?? `Claude API error: ${response.status}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text ?? '';
}

export function buildSystemPrompt(profile: {
  instagram_handle?: string | null;
  niche_description?: string | null;
  hero_brands?: unknown;
  primary_eras?: unknown;
  optimization_mode?: string | null;
  posting_frequency?: string | null;
  target_audience?: string | null;
  what_worked?: string | null;
  ai_context?: string | null;
}): string {
  return `You are Void, a content strategy AI for @${profile.instagram_handle ?? 'unknown'}, an archive fashion account.
Account context: ${profile.niche_description ?? 'archive fashion'}.
Hero brands: ${JSON.stringify(profile.hero_brands ?? [])}.
Era focus: ${JSON.stringify(profile.primary_eras ?? [])}.
Optimization goal: ${profile.optimization_mode ?? 'Growth'}.
Posting frequency: ${profile.posting_frequency ?? 'regular'}.
Target audience: ${profile.target_audience ?? 'fashion enthusiasts'}.
What has worked: ${profile.what_worked ?? 'not specified'}.
Additional context: ${profile.ai_context ?? 'none'}.`;
}

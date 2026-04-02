import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { format, isPast, parseISO } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/hooks/useTheme';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ShootSession, ShootSessionItem, InventoryItem, SessionStatus } from '@/types/database';
import { EVENT_COLORS } from '@/lib/theme';

const STATUS_COLORS: Record<SessionStatus, string> = {
  planned: '#3B82F6',
  in_progress: '#F59E0B',
  done: '#10B981',
  cancelled: '#6B7280',
};

interface CreateSessionForm {
  title: string;
  session_date: string;
  location: string;
  notes: string;
}

export default function ShootPlannerScreen() {
  const { user } = useAuthStore();
  const { colors, accent } = useTheme();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedSession, setSelectedSession] = useState<ShootSession | null>(null);
  const [form, setForm] = useState<CreateSessionForm>({ title: '', session_date: format(new Date(), 'yyyy-MM-dd'), location: '', notes: '' });
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const { data: sessions = [] } = useQuery<ShootSession[]>({
    queryKey: ['shoot-sessions', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('shoot_sessions')
        .select('*')
        .eq('user_id', user!.id)
        .order('session_date', { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: inventory = [] } = useQuery<InventoryItem[]>({
    queryKey: ['inventory', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('inventory_items').select('id, brand, item_name, status').eq('user_id', user!.id).order('created_at', { ascending: false });
      return (data ?? []) as InventoryItem[];
    },
    enabled: !!user,
  });

  const { data: sessionItems = [] } = useQuery<(ShootSessionItem & { inventory_items: InventoryItem })[]>({
    queryKey: ['session-items', selectedSession?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('shoot_session_items')
        .select('*, inventory_items(id, brand, item_name, status)')
        .eq('session_id', selectedSession!.id)
        .order('sort_order');
      return (data ?? []) as any;
    },
    enabled: !!selectedSession,
  });

  const createSession = useMutation({
    mutationFn: async () => {
      if (!form.title.trim()) throw new Error('Title is required');
      const now = new Date().toISOString();

      // Create session
      const { data: session, error } = await supabase
        .from('shoot_sessions')
        .insert({ user_id: user!.id, title: form.title.trim(), session_date: form.session_date, status: 'planned', location: form.location || null, notes: form.notes || null, created_at: now, updated_at: now })
        .select()
        .single();
      if (error) throw error;

      // Create session items
      if (selectedItems.length > 0) {
        const items = inventory.filter((i) => selectedItems.includes(i.id));
        await supabase.from('shoot_session_items').insert(
          items.map((item, idx) => ({
            session_id: session.id,
            item_id: item.id,
            item_label: `${item.brand ?? ''} ${item.item_name ?? ''}`.trim(),
            status: 'pending',
            sort_order: idx,
          }))
        );
      }

      // Create calendar event
      await supabase.from('calendar_events').insert({
        user_id: user!.id,
        title: `Shoot: ${form.title.trim()}`,
        event_type: 'shoot',
        start_date: form.session_date,
        status: 'planned',
        color: EVENT_COLORS.shoot,
        created_at: now,
        updated_at: now,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shoot-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      setShowCreate(false);
      setForm({ title: '', session_date: format(new Date(), 'yyyy-MM-dd'), location: '', notes: '' });
      setSelectedItems([]);
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const updateItemStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'pending' | 'shot' | 'skipped' }) => {
      await supabase.from('shoot_session_items').update({ status }).eq('id', id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['session-items', selectedSession?.id] }),
  });

  const updateSessionStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: SessionStatus }) => {
      await supabase.from('shoot_sessions').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shoot-sessions'] });
      if (selectedSession) setSelectedSession((s) => s ? { ...s, status } : null);
    },
  });

  function toggleItemSelect(id: string) {
    setSelectedItems((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  const shotCount = sessionItems.filter((i) => i.status === 'shot').length;
  const progressPct = sessionItems.length > 0 ? (shotCount / sessionItems.length) * 100 : 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom']}>
      {selectedSession ? (
        // Session Detail View
        <View style={{ flex: 1 }}>
          <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <TouchableOpacity onPress={() => setSelectedSession(null)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <Ionicons name="arrow-back" size={20} color={accent} />
              <Text style={{ color: accent, fontSize: 15, fontWeight: '600' }}>All Sessions</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text }}>{selectedSession.title}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
              <Badge label={selectedSession.status} color={`${STATUS_COLORS[selectedSession.status]}22`} textColor={STATUS_COLORS[selectedSession.status]} />
              <Text style={{ fontSize: 14, color: colors.textSecondary }}>{selectedSession.session_date}</Text>
            </View>
            {/* Progress bar */}
            <View style={{ marginTop: 12 }}>
              <View style={{ height: 6, backgroundColor: colors.inputBg, borderRadius: 3, overflow: 'hidden' }}>
                <View style={{ height: '100%', width: `${progressPct}%`, backgroundColor: accent, borderRadius: 3 }} />
              </View>
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>
                {shotCount}/{sessionItems.length} shot
              </Text>
            </View>
            {/* Status buttons */}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              {(['planned', 'in_progress', 'done'] as SessionStatus[]).map((s) => (
                <TouchableOpacity
                  key={s}
                  onPress={() => updateSessionStatus.mutate({ id: selectedSession.id, status: s })}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 8,
                    backgroundColor: selectedSession.status === s ? STATUS_COLORS[s] : colors.inputBg,
                    borderWidth: 1,
                    borderColor: selectedSession.status === s ? STATUS_COLORS[s] : colors.border,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '600', color: selectedSession.status === s ? '#fff' : colors.text }}>
                    {s.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <FlatList
            data={sessionItems}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const STATUS_ITEM_COLORS = { pending: colors.textSecondary, shot: '#10B981', skipped: colors.danger };
              return (
                <Card style={{ marginHorizontal: 16, marginBottom: 10 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>
                        {item.item_label || (item.inventory_items as any)?.item_name || 'Item'}
                      </Text>
                      <Badge label={item.status} color={`${STATUS_ITEM_COLORS[item.status]}22`} textColor={STATUS_ITEM_COLORS[item.status]} style={{ marginTop: 4 }} />
                    </View>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <TouchableOpacity onPress={() => updateItemStatus.mutate({ id: item.id, status: 'shot' })} hitSlop={8}>
                        <Ionicons name="camera" size={22} color={item.status === 'shot' ? '#10B981' : colors.textTertiary} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => updateItemStatus.mutate({ id: item.id, status: 'skipped' })} hitSlop={8}>
                        <Ionicons name="close-circle-outline" size={22} color={item.status === 'skipped' ? colors.danger : colors.textTertiary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </Card>
              );
            }}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', paddingTop: 40 }}>
                <Text style={{ color: colors.textSecondary }}>No items in this session</Text>
              </View>
            }
            contentContainerStyle={{ paddingVertical: 12 }}
          />
        </View>
      ) : (
        // Sessions List
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          <TouchableOpacity
            onPress={() => setShowCreate(true)}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: accent, borderRadius: 12, padding: 14 }}
          >
            <Ionicons name="add-circle-outline" size={20} color={accent === '#111111' ? '#fff' : '#0F0F0D'} />
            <Text style={{ fontSize: 15, fontWeight: '700', color: accent === '#111111' ? '#fff' : '#0F0F0D' }}>New Shoot Session</Text>
          </TouchableOpacity>

          {sessions.length === 0 ? (
            <View style={{ alignItems: 'center', paddingTop: 40 }}>
              <Ionicons name="camera-outline" size={48} color={colors.textTertiary} />
              <Text style={{ fontSize: 15, color: colors.textSecondary, marginTop: 12 }}>No shoot sessions yet</Text>
            </View>
          ) : (
            sessions.map((session) => {
              const isPastSession = isPast(parseISO(session.session_date));
              return (
                <TouchableOpacity key={session.id} onPress={() => setSelectedSession(session)}>
                  <Card style={{ opacity: isPastSession && session.status !== 'done' ? 0.6 : 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <View>
                        <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>{session.title}</Text>
                        <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 2 }}>{session.session_date}</Text>
                        {session.location && <Text style={{ fontSize: 13, color: colors.textTertiary }}>📍 {session.location}</Text>}
                      </View>
                      <Badge label={session.status} color={`${STATUS_COLORS[session.status]}22`} textColor={STATUS_COLORS[session.status]} />
                    </View>
                  </Card>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Create Session Modal */}
      <Modal visible={showCreate} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowCreate(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>New Shoot Session</Text>
            <TouchableOpacity onPress={() => setShowCreate(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }} keyboardShouldPersistTaps="handled">
            <TextInput placeholder="Session title" placeholderTextColor={colors.textTertiary} value={form.title} onChangeText={(v) => setForm((f) => ({ ...f, title: v }))} style={inputStyle(colors)} />
            <TextInput placeholder="Date (YYYY-MM-DD)" placeholderTextColor={colors.textTertiary} value={form.session_date} onChangeText={(v) => setForm((f) => ({ ...f, session_date: v }))} style={inputStyle(colors)} />
            <TextInput placeholder="Location (optional)" placeholderTextColor={colors.textTertiary} value={form.location} onChangeText={(v) => setForm((f) => ({ ...f, location: v }))} style={inputStyle(colors)} />
            <TextInput placeholder="Notes (optional)" placeholderTextColor={colors.textTertiary} value={form.notes} onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))} multiline style={[inputStyle(colors), { minHeight: 70, textAlignVertical: 'top' }]} />

            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, marginTop: 8 }}>Add Inventory Items</Text>
            <View style={{ gap: 8 }}>
              {inventory.slice(0, 30).map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => toggleItemSelect(item.id)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    padding: 12,
                    borderRadius: 10,
                    backgroundColor: selectedItems.includes(item.id) ? `${accent}22` : colors.inputBg,
                    borderWidth: 1,
                    borderColor: selectedItems.includes(item.id) ? accent : colors.border,
                  }}
                >
                  <Ionicons name={selectedItems.includes(item.id) ? 'checkbox' : 'square-outline'} size={20} color={selectedItems.includes(item.id) ? accent : colors.textTertiary} />
                  <Text style={{ fontSize: 14, color: colors.text, flex: 1 }}>
                    {item.brand && `${item.brand} — `}{item.item_name ?? 'Untitled'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              onPress={() => createSession.mutate()}
              disabled={createSession.isPending}
              style={{ backgroundColor: accent, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8, opacity: createSession.isPending ? 0.6 : 1 }}
            >
              <Text style={{ color: accent === '#111111' ? '#fff' : '#0F0F0D', fontWeight: '700', fontSize: 16 }}>Create Session</Text>
            </TouchableOpacity>
          </ScrollView>
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

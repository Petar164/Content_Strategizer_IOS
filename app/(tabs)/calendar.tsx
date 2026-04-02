import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  isPast,
  parseISO,
} from 'date-fns';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/hooks/useTheme';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { CalendarEvent, EventType, EventStatus } from '@/types/database';
import { EVENT_COLORS } from '@/lib/theme';

const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: 'post', label: 'Post' },
  { value: 'shoot', label: 'Shoot' },
  { value: 'edit', label: 'Edit' },
  { value: 'repost', label: 'Repost' },
  { value: 'deadline', label: 'Deadline' },
  { value: 'other', label: 'Other' },
];

interface AddEventForm {
  title: string;
  event_type: EventType;
  start_date: string;
  notes: string;
}

export default function CalendarScreen() {
  const { user } = useAuthStore();
  const { colors, accent } = useTheme();
  const queryClient = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [form, setForm] = useState<AddEventForm>({
    title: '',
    event_type: 'post',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const { data: events = [] } = useQuery<CalendarEvent[]>({
    queryKey: ['calendar-events', user?.id, format(monthStart, 'yyyy-MM')],
    queryFn: async () => {
      const { data } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', user!.id)
        .gte('start_date', format(startOfWeek(monthStart, { weekStartsOn: 1 }), 'yyyy-MM-dd'))
        .lte('start_date', format(endOfWeek(monthEnd, { weekStartsOn: 1 }), 'yyyy-MM-dd'))
        .order('start_date');
      return data ?? [];
    },
    enabled: !!user,
  });

  const addEvent = useMutation({
    mutationFn: async () => {
      if (!form.title.trim()) throw new Error('Title is required');
      await supabase.from('calendar_events').insert({
        user_id: user!.id,
        title: form.title.trim(),
        event_type: form.event_type,
        start_date: form.start_date,
        status: 'planned',
        notes: form.notes || null,
        color: EVENT_COLORS[form.event_type],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      setShowAddModal(false);
      setForm({ title: '', event_type: 'post', start_date: format(new Date(), 'yyyy-MM-dd'), notes: '' });
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('calendar_events').delete().eq('id', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      setSelectedEvent(null);
    },
  });

  const markEventDone = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('calendar_events').update({ status: 'done', updated_at: new Date().toISOString() }).eq('id', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      setSelectedEvent(null);
    },
  });

  function getEventsForDate(date: Date) {
    const dateStr = format(date, 'yyyy-MM-dd');
    return events.filter((e) => e.start_date === dateStr);
  }

  function handleDayPress(date: Date) {
    setSelectedDate(date);
    setForm((f) => ({ ...f, start_date: format(date, 'yyyy-MM-dd') }));
    setShowAddModal(true);
  }

  // Build calendar grid
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays: Date[] = [];
  let cur = calendarStart;
  while (cur <= calendarEnd) {
    calendarDays.push(cur);
    cur = addDays(cur, 1);
  }

  // Week view
  const weekStart = startOfWeek(currentMonth, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <Text style={{ fontSize: 26, fontWeight: '700', color: colors.text, letterSpacing: -0.8 }}>Calendar</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              onPress={() => setViewMode(viewMode === 'month' ? 'week' : 'month')}
              style={{ backgroundColor: colors.inputBg, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: colors.border }}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
                {viewMode === 'month' ? 'Week' : 'Month'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowAddModal(true)}
              style={{ backgroundColor: accent, borderRadius: 8, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="add" size={22} color={accent === '#111111' ? '#fff' : '#0F0F0D'} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Month navigation */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <TouchableOpacity onPress={() => setCurrentMonth(subMonths(currentMonth, 1))} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, letterSpacing: -0.3 }}>
            {format(currentMonth, 'MMMM yyyy')}
          </Text>
          <TouchableOpacity onPress={() => setCurrentMonth(addMonths(currentMonth, 1))} hitSlop={8}>
            <Ionicons name="chevron-forward" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Day of week headers */}
        <View style={{ flexDirection: 'row' }}>
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <View key={i} style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary }}>{d}</Text>
            </View>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
        {viewMode === 'month' ? (
          <>
            {/* Month grid */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 }}>
              {calendarDays.map((day, idx) => {
                const dayEvents = getEventsForDate(day);
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isPastDay = isPast(day) && !isToday(day);
                const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;

                return (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => handleDayPress(day)}
                    style={{
                      width: '14.285%',
                      aspectRatio: 0.85,
                      padding: 2,
                    }}
                  >
                    <View style={{
                      flex: 1,
                      borderRadius: 8,
                      alignItems: 'center',
                      paddingTop: 4,
                      backgroundColor: isToday(day) ? `${accent}22` : isSelected ? `${accent}11` : 'transparent',
                      borderWidth: isToday(day) ? 1 : 0,
                      borderColor: isToday(day) ? accent : 'transparent',
                      opacity: !isCurrentMonth ? 0.3 : isPastDay ? 0.5 : 1,
                    }}>
                      <Text style={{
                        fontSize: 13,
                        fontWeight: isToday(day) ? '700' : '500',
                        color: isToday(day) ? accent : colors.text,
                      }}>
                        {format(day, 'd')}
                      </Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 1, marginTop: 2, justifyContent: 'center' }}>
                        {dayEvents.slice(0, 3).map((evt) => (
                          <View
                            key={evt.id}
                            style={{
                              width: 5,
                              height: 5,
                              borderRadius: 2.5,
                              backgroundColor: EVENT_COLORS[evt.event_type] ?? accent,
                              opacity: evt.status === 'done' ? 0.4 : 1,
                            }}
                          />
                        ))}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Events list for selected month */}
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12 }}>
              {format(currentMonth, 'MMMM')} Events
            </Text>
            {events.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                <Text style={{ fontSize: 14, color: colors.textSecondary }}>No events this month</Text>
              </View>
            ) : (
              <View style={{ gap: 8 }}>
                {events.map((evt) => {
                  const evtDate = parseISO(evt.start_date);
                  const isPastEvt = isPast(evtDate) && !isToday(evtDate);
                  return (
                    <TouchableOpacity key={evt.id} onPress={() => setSelectedEvent(evt)}>
                      <Card style={{ opacity: isPastEvt ? 0.5 : 1 }}>
                        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                          <View style={{ width: 4, height: 40, borderRadius: 2, backgroundColor: EVENT_COLORS[evt.event_type] ?? accent }} />
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{evt.title}</Text>
                            <View style={{ flexDirection: 'row', gap: 8, marginTop: 3 }}>
                              <Text style={{ fontSize: 13, color: colors.textSecondary }}>{format(parseISO(evt.start_date), 'MMM d')}</Text>
                              <Badge label={evt.event_type} color={`${EVENT_COLORS[evt.event_type]}22`} textColor={EVENT_COLORS[evt.event_type]} />
                              {evt.status === 'done' && <Badge label="done" color="#10B98122" textColor="#10B981" />}
                            </View>
                          </View>
                          <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                        </View>
                      </Card>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </>
        ) : (
          /* Week view */
          <View style={{ gap: 8 }}>
            {weekDays.map((day) => {
              const dayEvents = getEventsForDate(day);
              const isPastDay = isPast(day) && !isToday(day);
              return (
                <TouchableOpacity key={format(day, 'yyyy-MM-dd')} onPress={() => handleDayPress(day)}>
                  <Card style={{ opacity: isPastDay ? 0.5 : 1 }}>
                    <View style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
                      <View style={{ width: 42, alignItems: 'center' }}>
                        <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase' }}>{format(day, 'EEE')}</Text>
                        <Text style={{
                          fontSize: 20,
                          fontWeight: '700',
                          color: isToday(day) ? accent : colors.text,
                          marginTop: 2,
                        }}>
                          {format(day, 'd')}
                        </Text>
                      </View>
                      <View style={{ flex: 1, gap: 6 }}>
                        {dayEvents.length === 0 ? (
                          <Text style={{ fontSize: 13, color: colors.textTertiary, paddingTop: 4 }}>Tap to add event</Text>
                        ) : (
                          dayEvents.map((evt) => (
                            <TouchableOpacity
                              key={evt.id}
                              onPress={(e) => { e.stopPropagation(); setSelectedEvent(evt); }}
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 8,
                                backgroundColor: `${EVENT_COLORS[evt.event_type] ?? accent}15`,
                                borderRadius: 8,
                                padding: 8,
                              }}
                            >
                              <View style={{ width: 3, height: 20, borderRadius: 1.5, backgroundColor: EVENT_COLORS[evt.event_type] ?? accent }} />
                              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, flex: 1 }}>{evt.title}</Text>
                              {evt.status === 'done' && <Ionicons name="checkmark-circle" size={16} color="#10B981" />}
                            </TouchableOpacity>
                          ))
                        )}
                      </View>
                    </View>
                  </Card>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Add Event Modal */}
      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddModal(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>Add Event</Text>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }} keyboardShouldPersistTaps="handled">
            <TextInput
              placeholder="Event title"
              placeholderTextColor={colors.textTertiary}
              value={form.title}
              onChangeText={(v) => setForm((f) => ({ ...f, title: v }))}
              style={inputStyle(colors)}
            />
            <TextInput
              placeholder="Date (YYYY-MM-DD)"
              placeholderTextColor={colors.textTertiary}
              value={form.start_date}
              onChangeText={(v) => setForm((f) => ({ ...f, start_date: v }))}
              style={inputStyle(colors)}
            />
            <View>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.2 }}>Event Type</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {EVENT_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t.value}
                    onPress={() => setForm((f) => ({ ...f, event_type: t.value }))}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 8,
                      backgroundColor: form.event_type === t.value ? EVENT_COLORS[t.value] : colors.inputBg,
                      borderWidth: 1,
                      borderColor: form.event_type === t.value ? EVENT_COLORS[t.value] : colors.border,
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '600', color: form.event_type === t.value ? '#fff' : colors.text }}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <TextInput
              placeholder="Notes (optional)"
              placeholderTextColor={colors.textTertiary}
              value={form.notes}
              onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))}
              multiline
              style={[inputStyle(colors), { minHeight: 80, textAlignVertical: 'top' }]}
            />
            <TouchableOpacity
              onPress={() => addEvent.mutate()}
              disabled={addEvent.isPending}
              style={{ backgroundColor: accent, borderRadius: 12, paddingVertical: 14, alignItems: 'center', opacity: addEvent.isPending ? 0.6 : 1 }}
            >
              <Text style={{ color: accent === '#111111' ? '#fff' : '#0F0F0D', fontWeight: '700', fontSize: 16 }}>Add Event</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Event Detail Modal */}
      <Modal visible={!!selectedEvent} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelectedEvent(null)}>
        {selectedEvent && (
          <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>Event</Text>
              <TouchableOpacity onPress={() => setSelectedEvent(null)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={{ padding: 20, gap: 16 }}>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                <View style={{ width: 6, height: 48, borderRadius: 3, backgroundColor: EVENT_COLORS[selectedEvent.event_type] ?? accent }} />
                <View>
                  <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text }}>{selectedEvent.title}</Text>
                  <Text style={{ fontSize: 15, color: colors.textSecondary }}>
                    {format(parseISO(selectedEvent.start_date), 'EEEE, MMMM d yyyy')}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Badge label={selectedEvent.event_type} color={`${EVENT_COLORS[selectedEvent.event_type]}22`} textColor={EVENT_COLORS[selectedEvent.event_type]} />
                <Badge label={selectedEvent.status} />
              </View>
              {selectedEvent.notes && (
                <Card>
                  <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 4, fontWeight: '600' }}>Notes</Text>
                  <Text style={{ fontSize: 15, color: colors.text }}>{selectedEvent.notes}</Text>
                </Card>
              )}
              {selectedEvent.status !== 'done' && (
                <TouchableOpacity
                  onPress={() => markEventDone.mutate(selectedEvent.id)}
                  style={{ backgroundColor: '#10B981', borderRadius: 12, paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Mark Done</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() =>
                  Alert.alert('Delete Event', 'Delete this event?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => deleteEvent.mutate(selectedEvent.id) },
                  ])
                }
                style={{ backgroundColor: `${colors.danger}22`, borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}
              >
                <Text style={{ color: colors.danger, fontWeight: '700', fontSize: 16 }}>Delete Event</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        )}
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

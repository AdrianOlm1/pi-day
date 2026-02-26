/**
 * EditableEventList — AI Import confirm + edit step
 *
 * Displays AI-parsed events in cards that the user can:
 *  • Select / deselect  (tap the checkbox)
 *  • Expand to edit title, date, start time, end time, type
 *  • Delete individually
 */
import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  Animated,
  Platform,
} from 'react-native';
import { ScaledText as Text } from '@/components/ui/ScaledText';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, parseISO, set as dateFnsSet } from 'date-fns';
import type { ParsedShift, ImportEventType } from '@/types';
import { Button } from '@/components/ui/Button';
import { playTrash } from '@/utils/sounds';
import { spacing, typography, colors, radius, shadows } from '@/theme';
import { useAppColors } from '@/contexts/ThemeContext';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EditableEvent extends ParsedShift {
  /** internal id for keying */
  _id: string;
  selected: boolean;
}

interface Props {
  events: EditableEvent[];
  onEventsChange: (events: EditableEvent[]) => void;
  onConfirm: (selected: EditableEvent[]) => void;
  onCancel: () => void;
  accentColor?: string;
  loading?: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function toEditableEvents(shifts: ParsedShift[]): EditableEvent[] {
  return shifts.map((s, i) => ({
    ...s,
    _id: `ev_${i}_${Date.now()}`,
    selected: true,
  }));
}

function fmt24(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function durationLabel(start: string, end: string): string {
  try {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const mins = (eh * 60 + em) - (sh * 60 + sm);
    if (mins <= 0) return '';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
  } catch {
    return '';
  }
}

function dateFromParts(dateStr: string, timeStr: string): Date {
  try {
    const [y, mo, d] = dateStr.split('-').map(Number);
    const [h, mi] = timeStr.split(':').map(Number);
    return new Date(y, mo - 1, d, h, mi);
  } catch {
    return new Date();
  }
}

const TYPE_OPTIONS: { value: ImportEventType; label: string; emoji: string }[] = [
  { value: 'work',     label: 'Work',     emoji: '💼' },
  { value: 'personal', label: 'Personal', emoji: '🌟' },
  { value: 'school',   label: 'School',   emoji: '📚' },
  { value: 'shared',   label: 'Shared',   emoji: '💑' },
];

// ─── EventCard ────────────────────────────────────────────────────────────────

interface EventCardProps {
  event: EditableEvent;
  onChange: (updated: Partial<EditableEvent>) => void;
  onDelete: () => void;
  accentColor: string;
}

function EventCard({ event, onChange, onDelete, accentColor }: EventCardProps) {
  const [expanded, setExpanded] = useState(false);
  const expandAnim = useRef(new Animated.Value(0)).current;

  // iOS date/time picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const toggleExpand = () => {
    const next = !expanded;
    setExpanded(next);
    Animated.spring(expandAnim, {
      toValue: next ? 1 : 0,
      useNativeDriver: false,
      damping: 22,
      stiffness: 260,
      mass: 0.8,
    }).start();
  };

  const maxHeight = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 420],
  });

  let dateLabel = event.date;
  try { dateLabel = format(parseISO(event.date), 'EEE, MMM d, yyyy'); } catch (_) {}

  const dur = durationLabel(event.start_time, event.end_time);
  const eventTypeInfo = TYPE_OPTIONS.find(t => t.value === (event.event_type ?? 'work')) ?? TYPE_OPTIONS[0];

  return (
    <View style={[
      card.wrap,
      event.selected && { borderColor: accentColor, borderWidth: 1.5 },
      !event.selected && { opacity: 0.55 },
    ]}>
      {/* ── Row: checkbox + summary + edit/delete ── */}
      <View style={card.topRow}>
        {/* Checkbox */}
        <Pressable
          onPress={() => onChange({ selected: !event.selected })}
          hitSlop={8}
          style={[card.checkbox, event.selected && { backgroundColor: accentColor, borderColor: accentColor }]}
        >
          {event.selected && <Ionicons name="checkmark" size={13} color="#fff" />}
        </Pressable>

        {/* Summary (tap to expand) */}
        <Pressable style={card.info} onPress={toggleExpand}>
          <Text style={card.titleText} numberOfLines={1}>{event.title || 'Event'}</Text>
          <Text style={card.metaText}>{dateLabel}</Text>
          <Text style={card.timeText}>
            {event.all_day ? 'All day' : `${fmt24(event.start_time)} – ${fmt24(event.end_time)}`}
            {dur ? `  ·  ${dur}` : ''}
          </Text>
        </Pressable>

        {/* Right controls */}
        <View style={card.rightCol}>
          {/* Type badge */}
          <View style={[card.typeBadge, { backgroundColor: accentColor + '15' }]}>
            <Text style={[card.typeText, { color: accentColor }]}>{eventTypeInfo.emoji}</Text>
          </View>
          {/* Edit chevron */}
          <Pressable onPress={toggleExpand} hitSlop={8}>
            <Animated.View style={{
              transform: [{
                rotate: expandAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] })
              }]
            }}>
              <Ionicons name="chevron-down" size={18} color={colors.labelTertiary} />
            </Animated.View>
          </Pressable>
        </View>
      </View>

      {/* ── Expanded edit section ── */}
      <Animated.View style={{ maxHeight, overflow: 'hidden' }}>
        <View style={card.editSection}>
          <View style={card.divider} />

          {/* Title */}
          <View style={card.fieldRow}>
            <Text style={card.fieldLabel}>Title</Text>
            <TextInput
              style={card.textInput}
              value={event.title}
              onChangeText={v => onChange({ title: v })}
              placeholder="Event title"
              placeholderTextColor={colors.labelTertiary}
              returnKeyType="done"
            />
          </View>

          {/* Date */}
          <View style={card.fieldRow}>
            <Text style={card.fieldLabel}>Date</Text>
            <Pressable
              style={card.pickerBtn}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={card.pickerBtnText}>{dateLabel}</Text>
              <Ionicons name="calendar-outline" size={16} color={accentColor} />
            </Pressable>
          </View>
          {showDatePicker && (
            <DateTimePicker
              value={dateFromParts(event.date, event.start_time)}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, d) => {
                setShowDatePicker(false);
                if (d) {
                  onChange({ date: format(d, 'yyyy-MM-dd') });
                }
              }}
            />
          )}

          {/* All day toggle */}
          <View style={card.fieldRow}>
            <Text style={card.fieldLabel}>All day</Text>
            <Pressable
              onPress={() => onChange({ all_day: !event.all_day })}
              style={[card.togglePill, event.all_day && { backgroundColor: accentColor }]}
            >
              <View style={[card.toggleDot, event.all_day && card.toggleDotOn]} />
            </Pressable>
          </View>

          {/* Start / End time (hidden when all_day) */}
          {!event.all_day && (
            <>
              <View style={card.fieldRow}>
                <Text style={card.fieldLabel}>Start</Text>
                <Pressable
                  style={card.pickerBtn}
                  onPress={() => setShowStartPicker(true)}
                >
                  <Text style={card.pickerBtnText}>{fmt24(event.start_time)}</Text>
                  <Ionicons name="time-outline" size={16} color={accentColor} />
                </Pressable>
              </View>
              {showStartPicker && (
                <DateTimePicker
                  value={dateFromParts(event.date, event.start_time)}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  is24Hour={false}
                  onChange={(_, d) => {
                    setShowStartPicker(false);
                    if (d) {
                      const h = String(d.getHours()).padStart(2, '0');
                      const m = String(d.getMinutes()).padStart(2, '0');
                      onChange({ start_time: `${h}:${m}` });
                    }
                  }}
                />
              )}

              <View style={card.fieldRow}>
                <Text style={card.fieldLabel}>End</Text>
                <Pressable
                  style={card.pickerBtn}
                  onPress={() => setShowEndPicker(true)}
                >
                  <Text style={card.pickerBtnText}>{fmt24(event.end_time)}</Text>
                  <Ionicons name="time-outline" size={16} color={accentColor} />
                </Pressable>
              </View>
              {showEndPicker && (
                <DateTimePicker
                  value={dateFromParts(event.date, event.end_time)}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  is24Hour={false}
                  onChange={(_, d) => {
                    setShowEndPicker(false);
                    if (d) {
                      const h = String(d.getHours()).padStart(2, '0');
                      const m = String(d.getMinutes()).padStart(2, '0');
                      onChange({ end_time: `${h}:${m}` });
                    }
                  }}
                />
              )}
            </>
          )}

          {/* Event type */}
          <View style={card.fieldRow}>
            <Text style={card.fieldLabel}>Type</Text>
            <View style={card.typeRow}>
              {TYPE_OPTIONS.map(opt => (
                <Pressable
                  key={opt.value}
                  onPress={() => onChange({ event_type: opt.value })}
                  style={[
                    card.typeChip,
                    (event.event_type ?? 'work') === opt.value && {
                      backgroundColor: accentColor,
                      borderColor: accentColor,
                    },
                  ]}
                >
                  <Text style={[
                    card.typeChipText,
                    (event.event_type ?? 'work') === opt.value && { color: '#fff' },
                  ]}>
                    {opt.emoji} {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Notes */}
          <View style={[card.fieldRow, { alignItems: 'flex-start' }]}>
            <Text style={[card.fieldLabel, { marginTop: 10 }]}>Notes</Text>
            <TextInput
              style={[card.textInput, card.notesInput]}
              value={event.notes ?? ''}
              onChangeText={v => onChange({ notes: v || undefined })}
              placeholder="Optional notes…"
              placeholderTextColor={colors.labelTertiary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Delete */}
          <Pressable onPress={onDelete} style={card.deleteBtn}>
            <Ionicons name="trash-outline" size={15} color={colors.destructive} />
            <Text style={card.deleteText}>Remove from import</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const card = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.separator,
    marginBottom: spacing.sm,
    ...shadows.xs,
    overflow: 'hidden',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  checkbox: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 1.5, borderColor: colors.labelTertiary,
    alignItems: 'center', justifyContent: 'center',
  },
  info: { flex: 1 },
  titleText: { ...typography.bodyEmphasis, color: colors.label },
  metaText: { ...typography.subhead, color: colors.labelSecondary, fontWeight: '400', marginTop: 2 },
  timeText: { ...typography.footnote, color: colors.labelTertiary, marginTop: 1 },
  rightCol: { alignItems: 'center', gap: spacing.xs },
  typeBadge: {
    width: 28, height: 28, borderRadius: radius.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  typeText: { fontSize: 14 },

  // Edit section
  editSection: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.separator, marginBottom: spacing.md },
  fieldRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: spacing.md, marginBottom: spacing.sm,
  },
  fieldLabel: { ...typography.subhead, color: colors.labelSecondary, width: 44 },
  textInput: {
    flex: 1,
    ...typography.body,
    color: colors.label,
    backgroundColor: colors.fillSecondary,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.separator,
  },
  notesInput: { minHeight: 64, paddingTop: spacing.sm },
  pickerBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.fillSecondary,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.separator,
  },
  pickerBtnText: { ...typography.body, color: colors.label },

  // All day toggle
  togglePill: {
    width: 44, height: 26, borderRadius: 13,
    backgroundColor: colors.fillSecondary,
    borderWidth: 1.5, borderColor: colors.separator,
    justifyContent: 'center', paddingHorizontal: 3,
  },
  toggleDot: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: colors.labelTertiary,
  },
  toggleDotOn: {
    backgroundColor: '#fff',
    alignSelf: 'flex-end',
  },

  // Type chips
  typeRow: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  typeChip: {
    paddingHorizontal: spacing.sm, paddingVertical: 5,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.separator,
    backgroundColor: colors.fillSecondary,
  },
  typeChipText: { ...typography.caption, color: colors.labelSecondary },

  // Delete
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    marginTop: spacing.xs, alignSelf: 'flex-end',
    paddingVertical: spacing.xs, paddingHorizontal: spacing.sm,
  },
  deleteText: { ...typography.caption, color: colors.destructive },
});

// ─── EditableEventList ────────────────────────────────────────────────────────

export function EditableEventList({
  events,
  onEventsChange,
  onConfirm,
  onCancel,
  accentColor,
  loading = false,
}: Props) {
  const selectedCount = events.filter(e => e.selected).length;
  const allSelected = selectedCount === events.length;

  const toggleAll = () => {
    onEventsChange(events.map(e => ({ ...e, selected: !allSelected })));
  };

  const updateEvent = useCallback((id: string, patch: Partial<EditableEvent>) => {
    onEventsChange(events.map(e => e._id === id ? { ...e, ...patch } : e));
  }, [events, onEventsChange]);

  const deleteEvent = useCallback((id: string) => {
    playTrash();
    onEventsChange(events.filter(e => e._id !== id));
  }, [events, onEventsChange]);

  return (
    <View style={list.container}>
      {/* Header */}
      <View style={list.headerRow}>
        <View>
          <Text style={list.heading}>Review & edit</Text>
          <Text style={list.sub}>
            {selectedCount} of {events.length} selected · tap to edit
          </Text>
        </View>
        <Pressable onPress={toggleAll} style={list.selectAllBtn}>
          <Text style={[list.selectAllText, { color: accentColor }]}>
            {allSelected ? 'Deselect all' : 'Select all'}
          </Text>
        </Pressable>
      </View>

      {/* Cards */}
      <ScrollView style={list.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {events.map(ev => (
          <EventCard
            key={ev._id}
            event={ev}
            onChange={patch => updateEvent(ev._id, patch)}
            onDelete={() => deleteEvent(ev._id)}
            accentColor={accentColor}
          />
        ))}
        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Actions */}
      <View style={list.actions}>
        <Button
          title="Cancel"
          onPress={onCancel}
          variant="ghost"
          color={colors.labelSecondary}
          size="md"
          style={{ flex: 1 }}
        />
        <Button
          title={
            selectedCount > 0
              ? `Import ${selectedCount} event${selectedCount === 1 ? '' : 's'}`
              : 'Select events'
          }
          onPress={() => onConfirm(events.filter(e => e.selected))}
          color={accentColor}
          loading={loading}
          disabled={selectedCount === 0}
          size="md"
          style={{ flex: 1.8 }}
        />
      </View>
    </View>
  );
}

const list = StyleSheet.create({
  container: { flex: 1, paddingBottom: spacing.md },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  heading: { ...typography.title2, color: colors.label },
  sub: { ...typography.body, color: colors.labelSecondary, marginTop: 2 },
  selectAllBtn: { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm },
  selectAllText: { ...typography.subhead },
  scroll: { flex: 1 },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
});

import React, { useState, useEffect } from 'react';
import {
  View, ScrollView, Switch, Pressable, StyleSheet, Alert, Platform, Dimensions,
} from 'react-native';
import { ScaledText as Text } from '@/components/ui/ScaledText';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, addHours, addWeeks, differenceInCalendarWeeks, startOfDay, parseISO } from 'date-fns';
import { TextInput } from '@/components/ui/TextInput';
import { Button } from '@/components/ui/Button';
import { DatePickerCalendar } from '@/components/calendar/DatePickerCalendar';
import { useUserMode } from '@/contexts/UserModeContext';
import { useCategories } from '@/hooks/useCategories';
import type { UserId, EventType, RecurrenceRuleType } from '@/types';
import { spacing, typography, colors, radius, shadows } from '@/theme';

interface EventFormProps {
  initialDate: Date;
  onSave: (data: EventFormData) => Promise<void>;
  onCancel: () => void;
}

export interface EventFormData {
  title: string;
  type: EventType;
  category_id: string;
  user_id: UserId;
  start_at: string;
  end_at: string;
  all_day: boolean;
  notes: string;
  color: string;
  recurrence: null | {
    rule_type: RecurrenceRuleType;
    days_of_week: number[];
    num_weeks: number | null;
    custom_dates: string[];
  };
}

/** Map category name to legacy EventType for DB constraint */
function categoryNameToType(name: string): EventType {
  const n = name.toLowerCase();
  if (n === 'work') return 'work';
  if (n === 'school') return 'school';
  if (n === 'shared') return 'shared';
  return 'personal';
}

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function EventForm({ initialDate, onSave, onCancel }: EventFormProps) {
  const { userId, userColor } = useUserMode();
  const { categories, getCategoryById } = useCategories();

  const defaultStart = new Date(initialDate);
  defaultStart.setHours(9, 0, 0, 0);
  const defaultEnd = addHours(defaultStart, 1);

  const initialDateStr = format(initialDate, 'yyyy-MM-dd');

  const defaultCategory = categories.find((c) => c.name.toLowerCase() === 'personal') ?? categories[0];
  const [title, setTitle]                 = useState('');
  const [categoryId, setCategoryId]       = useState<string>(defaultCategory?.id ?? '');
  const [eventDaysMode, setEventDaysMode]  = useState<'one' | 'multiple'>('one');
  const [eventSelectedDates, setEventSelectedDates] = useState<string[]>([initialDateStr]);
  const [allDay, setAllDay]               = useState(false);
  const [startDateTime, setStartDateTime] = useState(defaultStart);
  const [endDateTime, setEndDateTime]     = useState(defaultEnd);
  const [notes, setNotes]                 = useState('');
  const [isRecurring, setIsRecurring]     = useState(false);
  const [ruleType, setRuleType]           = useState<RecurrenceRuleType>('weekly');
  const [selectedDows, setSelectedDows]   = useState<number[]>([initialDate.getDay()]);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<Date | null>(null);
  const [selectedCustomDates, setSelectedCustomDates] = useState<string[]>([]);
  const [saving, setSaving]               = useState(false);

  useEffect(() => {
    if (categories.length && !categoryId) {
      const personal = categories.find((c) => c.name.toLowerCase() === 'personal');
      setCategoryId(personal?.id ?? categories[0].id);
    }
  }, [categories, categoryId]);

  useEffect(() => {
    if (isRecurring && ruleType === 'weekly' && !recurrenceEndDate) {
      setRecurrenceEndDate(addWeeks(startOfDay(initialDate), 12));
    }
  }, [isRecurring, ruleType]);

  function toggleDow(d: number) {
    setSelectedDows((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]);
  }

  async function handleSave() {
    if (!title.trim()) { Alert.alert('Missing title', 'Please enter a title.'); return; }

    const dateStr = eventDaysMode === 'one' ? initialDateStr : (eventSelectedDates.length ? eventSelectedDates[0] : initialDateStr);
    const baseDate = parseISO(dateStr);
    const startDate = new Date(baseDate);
    const endDate = new Date(baseDate);
    if (allDay) {
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 0, 0);
    } else {
      startDate.setHours(startDateTime.getHours(), startDateTime.getMinutes(), 0, 0);
      endDate.setHours(endDateTime.getHours(), endDateTime.getMinutes(), 0, 0);
    }
    const startISO = startDate.toISOString();
    const endISO = endDate.toISOString();

    let recurrence: EventFormData['recurrence'] = null;
    if (eventDaysMode === 'multiple') {
      const dates = eventSelectedDates.length ? [...eventSelectedDates].sort() : [initialDateStr];
      if (dates.length === 0) { Alert.alert('Select at least one day', 'Tap dates on the calendar.'); return; }
      recurrence = { rule_type: 'custom', days_of_week: [], num_weeks: null, custom_dates: dates };
    } else if (isRecurring) {
      if (ruleType === 'weekly') {
        if (!selectedDows.length) { Alert.alert('Select days', 'Choose at least one day.'); return; }
        if (!recurrenceEndDate) { Alert.alert('End date required', 'Please choose when the recurrence ends.'); return; }
        if (recurrenceEndDate < startOfDay(initialDate)) { Alert.alert('Invalid end date', 'End date must be on or after the start date.'); return; }
        const num_weeks = Math.max(1, differenceInCalendarWeeks(recurrenceEndDate, startOfDay(initialDate)) + 1);
        recurrence = { rule_type: 'weekly', days_of_week: selectedDows.sort(), num_weeks, custom_dates: [] };
      } else {
        if (!selectedCustomDates.length) { Alert.alert('Select dates', 'Tap dates on the calendar.'); return; }
        recurrence = { rule_type: 'custom', days_of_week: [], num_weeks: null, custom_dates: [...selectedCustomDates].sort() };
      }
    }

    const category = getCategoryById(categoryId) ?? defaultCategory;
    const type = category ? categoryNameToType(category.name) : 'personal';
    const color = category?.color ?? userColor;

    setSaving(true);
    try {
      await onSave({ title: title.trim(), type, category_id: categoryId, user_id: userId, start_at: startISO, end_at: endISO, all_day: allDay, notes: notes.trim(), color, recurrence });
    } finally { setSaving(false); }
  }

  const selectedCategory = getCategoryById(categoryId) ?? defaultCategory;

  return (
    <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <Text style={styles.heading}>New Event</Text>

      <TextInput label="Title" value={title} onChangeText={setTitle}
        placeholder="What's happening?" accentColor={userColor} />

      {/* One day vs multiple days */}
      <Text style={styles.sectionLabel}>When</Text>
      <View style={styles.daysModeRow}>
        <Pressable
          onPress={() => setEventDaysMode('one')}
          style={[styles.daysModeChip, eventDaysMode === 'one' && { backgroundColor: userColor + '18', borderColor: userColor }]}
        >
          <Ionicons name="today-outline" size={16} color={eventDaysMode === 'one' ? userColor : colors.labelTertiary} />
          <Text style={[styles.daysModeChipText, eventDaysMode === 'one' && { color: userColor, fontWeight: '700' }]}>
            One day
          </Text>
          <Text style={styles.daysModeSub}>{format(initialDate, 'EEE, MMM d')}</Text>
        </Pressable>
        <Pressable
          onPress={() => setEventDaysMode('multiple')}
          style={[styles.daysModeChip, eventDaysMode === 'multiple' && { backgroundColor: userColor + '18', borderColor: userColor }]}
        >
          <Ionicons name="calendar-outline" size={16} color={eventDaysMode === 'multiple' ? userColor : colors.labelTertiary} />
          <Text style={[styles.daysModeChipText, eventDaysMode === 'multiple' && { color: userColor, fontWeight: '700' }]}>
            Multiple days
          </Text>
          {eventDaysMode === 'multiple' && eventSelectedDates.length > 0 && (
            <Text style={styles.daysModeSub}>{eventSelectedDates.length} selected</Text>
          )}
        </Pressable>
      </View>

      {eventDaysMode === 'multiple' && (
        <>
          <Text style={styles.calendarHint}>Tap dates to add or remove. Event will be created on each selected day.</Text>
          <DatePickerCalendar
            selectedDates={eventSelectedDates}
            onSelectDates={(dates) => setEventSelectedDates(dates.length ? dates : [initialDateStr])}
            accentColor={userColor}
          />
        </>
      )}

      {/* Category picker */}
      <Text style={styles.sectionLabel}>Category</Text>
      <View style={styles.typeGrid}>
        {categories.map((cat) => {
          const active = categoryId === cat.id;
          return (
            <Pressable
              key={cat.id}
              onPress={() => setCategoryId(cat.id)}
              style={[styles.typeChip, active && { backgroundColor: cat.color + '18', borderColor: cat.color }]}
            >
              <Ionicons name={cat.icon as any} size={16} color={active ? cat.color : colors.labelTertiary} />
              <Text style={[styles.typeChipText, active && { color: cat.color, fontWeight: '700' }]}>{cat.name}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* All day toggle */}
      <View style={styles.toggleRow}>
        <View style={styles.toggleLeft}>
          <Ionicons name="sunny-outline" size={18} color={colors.labelSecondary} />
          <Text style={styles.toggleLabel}>All day</Text>
        </View>
        <Switch value={allDay} onValueChange={setAllDay} trackColor={{ true: userColor }} thumbColor="#fff" />
      </View>

      {!allDay && (
        <View style={styles.timeRowWrap}>
          <View style={styles.timeLabelsRow}>
            <Text style={styles.timePickerLabel}>Start</Text>
            <Text style={styles.timeSepText}>–</Text>
            <Text style={styles.timePickerLabel}>End</Text>
          </View>
          <View style={[styles.timeRow, Platform.OS === 'ios' && styles.timeRowScaled]}>
            <View style={styles.timePickerBlock}>
              <DateTimePicker
                value={startDateTime}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, date) => date && setStartDateTime(date)}
                textColor={colors.label}
                themeVariant="light"
                style={Platform.OS === 'ios' ? styles.timePickerIOS : undefined}
              />
            </View>
            <View style={styles.timePickerBlock}>
              <DateTimePicker
                value={endDateTime}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, date) => date && setEndDateTime(date)}
                textColor={colors.label}
                themeVariant="light"
                style={Platform.OS === 'ios' ? styles.timePickerIOS : undefined}
              />
            </View>
          </View>
        </View>
      )}

      <TextInput label="Notes (optional)" value={notes} onChangeText={setNotes}
        placeholder="Any details…" multiline numberOfLines={3}
        style={{ minHeight: 64 }} accentColor={userColor} />

      {/* Recurring toggle */}
      <View style={styles.toggleRow}>
        <View style={styles.toggleLeft}>
          <Ionicons name="repeat-outline" size={18} color={colors.labelSecondary} />
          <Text style={styles.toggleLabel}>Recurring</Text>
        </View>
        <Switch value={isRecurring} onValueChange={setIsRecurring} trackColor={{ true: userColor }} thumbColor="#fff" />
      </View>

      {isRecurring && (
        <View style={[styles.recurrenceBox, { borderColor: userColor + '30' }]}>
          <View style={styles.ruleTypeRow}>
            {(['weekly', 'custom'] as RecurrenceRuleType[]).map((rt) => (
              <Pressable key={rt} onPress={() => setRuleType(rt)}
                style={[styles.ruleChip, ruleType === rt && { backgroundColor: userColor, borderColor: userColor }]}>
                <Text style={[styles.ruleChipText, ruleType === rt && { color: '#fff', fontWeight: '700' }]}>
                  {rt === 'weekly' ? 'Weekly' : 'Custom dates'}
                </Text>
              </Pressable>
            ))}
          </View>

          {ruleType === 'weekly' ? (
            <>
              <Text style={styles.sectionLabel}>Days of week</Text>
              <View style={styles.dowRow}>
                {DOW.map((d, i) => {
                  const active = selectedDows.includes(i);
                  return (
                    <Pressable key={i} onPress={() => toggleDow(i)}
                      style={[styles.dowBtn, active && { backgroundColor: userColor, borderColor: userColor }]}>
                      <Text style={[styles.dowText, active && { color: '#fff', fontWeight: '700' }]}>{d}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.sectionLabel}>Ends on</Text>
              <Text style={styles.calendarHint}>Tap a date to set when the recurrence ends.</Text>
              <DatePickerCalendar
                selectedDate={recurrenceEndDate}
                onSelectDate={(d) => setRecurrenceEndDate(d)}
                minDate={initialDate}
                accentColor={userColor}
              />
            </>
          ) : (
            <>
              <Text style={styles.sectionLabel}>Select dates</Text>
              <Text style={styles.calendarHint}>Tap dates on the calendar to add or remove them.</Text>
              <DatePickerCalendar
                selectedDates={selectedCustomDates}
                onSelectDates={setSelectedCustomDates}
                accentColor={userColor}
              />
            </>
          )}
        </View>
      )}

      <View style={styles.actions}>
        <Button title="Cancel" onPress={onCancel} variant="outline" color={colors.labelSecondary} size="md" style={[styles.cancelBtn, { borderColor: colors.separator }]} />
        <Button title="Add Event" onPress={handleSave} color={userColor} loading={saving} size="md" style={{ flex: 1 }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  heading: { ...typography.title2, color: colors.label, marginBottom: spacing.xl },
  sectionLabel: { ...typography.subhead, color: colors.labelSecondary, marginBottom: spacing.sm },
  daysModeRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  daysModeChip: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.separator,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.fillSecondary,
  },
  daysModeChipText: { ...typography.subhead, color: colors.labelSecondary },
  daysModeSub: { ...typography.footnote, color: colors.labelTertiary, marginTop: 2 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  typeChip: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    borderWidth: 1.5, borderColor: colors.separator, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.fillSecondary,
  },
  typeChipText: { ...typography.subhead, color: colors.labelSecondary },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator,
    marginBottom: spacing.lg,
  },
  toggleLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  toggleLabel: { ...typography.body, color: colors.label },
  timeRowWrap: {
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  timeLabelsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  timeRow: { flexDirection: 'row', gap: spacing.lg, alignItems: 'center' },
  timeRowScaled: {
    transform: [{ scale: 0.72 }],
  },
  timePickerBlock: { flex: 1, alignItems: 'center' },
  timePickerLabel: { ...typography.subhead, color: colors.labelSecondary },
  timePickerIOS: { height: 100 },
  timeSepText: { ...typography.callout, color: colors.labelTertiary },
  cancelBtn: { flex: 1, backgroundColor: colors.fillSecondary },
  calendarHint: { ...typography.footnote, color: colors.labelTertiary, marginBottom: spacing.sm },
  recurrenceBox: {
    borderWidth: 1.5, borderRadius: radius.lg, padding: spacing.lg,
    marginBottom: spacing.lg, backgroundColor: colors.fillTertiary,
  },
  ruleTypeRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  ruleChip: {
    flex: 1, alignItems: 'center',
    borderWidth: 1.5, borderColor: colors.separator, borderRadius: radius.md,
    paddingVertical: spacing.sm, backgroundColor: colors.fillSecondary,
  },
  ruleChipText: { ...typography.subhead, color: colors.labelSecondary },
  dowRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.lg },
  dowBtn: {
    flex: 1, height: 36, borderRadius: radius.sm,
    borderWidth: 1.5, borderColor: colors.separator,
    backgroundColor: colors.fillSecondary,
    alignItems: 'center', justifyContent: 'center',
  },
  dowText: { fontSize: 12, fontWeight: '600', color: colors.labelSecondary },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
});

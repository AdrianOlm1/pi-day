import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, Pressable, Modal } from 'react-native';
import { ScaledText as Text } from '@/components/ui/ScaledText';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO, isValid, startOfDay } from 'date-fns';
import { TextInput } from '@/components/ui/TextInput';
import { Button } from '@/components/ui/Button';
import { DatePickerCalendar } from '@/components/calendar/DatePickerCalendar';
import type { Order, OrderStatus } from '@/types';
import { spacing, typography, colors, radius } from '@/theme';

interface OrderFormProps {
  initial?: Partial<Order>;
  onSave: (data: Omit<Order, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onCancel: () => void;
  accentColor?: string;
}

const STATUSES: { value: OrderStatus; icon: string; color: string }[] = [
  { value: 'Pending',     icon: 'time-outline',              color: '#F59E0B' },
  { value: 'In Progress', icon: 'hammer-outline',            color: '#3B82F6' },
  { value: 'Complete',    icon: 'checkmark-circle-outline',  color: '#22C55E' },
];

export function OrderForm({ initial, onSave, onCancel, accentColor = '#6366F1' }: OrderFormProps) {
  const [customer, setCustomer]       = useState(initial?.customer_name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [designNotes, setDesignNotes] = useState(initial?.design_notes ?? '');
  const [total, setTotal]             = useState(initial?.total != null ? String(initial.total) : '');
  const [status, setStatus]           = useState<OrderStatus>(initial?.status ?? 'Pending');
  const [dueDate, setDueDate] = useState<Date | null>(() => {
    const d = initial?.due_date?.trim();
    if (!d) return null;
    try {
      const parsed = parseISO(d);
      return isValid(parsed) ? startOfDay(parsed) : null;
    } catch {
      return null;
    }
  });
  const [showCalendar, setShowCalendar] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!customer.trim()) { Alert.alert('Missing customer', 'Please enter the customer name.'); return; }
    if (!description.trim()) { Alert.alert('Missing description', 'Please enter a description.'); return; }
    setSaving(true);
    try {
      await onSave({
        customer_name: customer.trim(),
        description: description.trim(),
        design_notes: designNotes.trim() || null,
        total: total ? parseFloat(total) : null,
        status,
        due_date: dueDate ? format(dueDate, 'yyyy-MM-dd') : null,
      });
    } finally { setSaving(false); }
  }

  return (
    <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <Text style={styles.heading}>{initial?.id ? 'Edit Order' : 'New Order'}</Text>

      <TextInput label="Customer Name" value={customer} onChangeText={setCustomer}
        placeholder="e.g. Jane Smith" accentColor={accentColor} />
      <TextInput label="Description" value={description} onChangeText={setDescription}
        placeholder="What are they ordering?" multiline numberOfLines={2}
        style={{ minHeight: 56 }} accentColor={accentColor} />
      <TextInput label="Design Notes (optional)" value={designNotes} onChangeText={setDesignNotes}
        placeholder="Color, size, special requests…" multiline numberOfLines={3}
        style={{ minHeight: 70 }} accentColor={accentColor} />
      <TextInput label="Total (optional)" value={total} onChangeText={setTotal}
        placeholder="25.00" keyboardType="decimal-pad" prefix="$" accentColor={accentColor} />
      <Text style={styles.sectionLabel}>Due date (optional)</Text>
      <Pressable
        onPress={() => setShowCalendar(true)}
        style={[styles.dueDateRow, { borderColor: colors.separator }]}
      >
        <Ionicons name="calendar-outline" size={20} color={accentColor} />
        <Text style={[styles.dueDateText, { color: colors.label }]}>
          {dueDate ? format(dueDate, 'MMM d, yyyy') : 'Tap to pick a date'}
        </Text>
        {dueDate ? (
          <Pressable onPress={() => setDueDate(null)} hitSlop={8}>
            <Ionicons name="close-circle" size={20} color={colors.labelTertiary} />
          </Pressable>
        ) : null}
      </Pressable>
      <Modal visible={showCalendar} transparent animationType="fade">
        <Pressable style={styles.calendarBackdrop} onPress={() => setShowCalendar(false)}>
          <Pressable style={styles.calendarBox} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.calendarTitle}>Pick due date</Text>
            <DatePickerCalendar
              selectedDate={dueDate}
              onSelectDate={(date) => { setDueDate(date); setShowCalendar(false); }}
              accentColor={accentColor}
            />
            <Button title="Done" onPress={() => setShowCalendar(false)} color={accentColor} size="md" />
          </Pressable>
        </Pressable>
      </Modal>

      <Text style={styles.sectionLabel}>Status</Text>
      <View style={styles.statusRow}>
        {STATUSES.map((s) => {
          const active = status === s.value;
          return (
            <Pressable
              key={s.value}
              onPress={() => setStatus(s.value)}
              style={[styles.statusChip, active && { backgroundColor: s.color + '18', borderColor: s.color }]}
            >
              <Ionicons name={s.icon as any} size={15} color={active ? s.color : colors.labelTertiary} />
              <Text style={[styles.statusChipText, active && { color: s.color, fontWeight: '700' }]}>
                {s.value}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.actions}>
        <Button title="Cancel" onPress={onCancel} variant="ghost" color={colors.labelSecondary} size="md" style={{ flex: 1 }} />
        <Button title="Save Order" onPress={handleSave} color={accentColor} loading={saving} size="md" style={{ flex: 1 }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  heading: { ...typography.title2, color: colors.label, marginBottom: spacing.xl },
  addedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.fillSecondary,
    borderRadius: radius.md,
  },
  addedLabel: { ...typography.footnote, color: colors.labelTertiary },
  addedValue: { ...typography.subhead, color: colors.label },
  sectionLabel: { ...typography.subhead, color: colors.labelSecondary, marginBottom: spacing.sm },
  statusRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl },
  statusChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    borderWidth: 1.5, borderColor: colors.separator, borderRadius: radius.md,
    paddingVertical: spacing.md, paddingHorizontal: spacing.sm,
    backgroundColor: colors.fillSecondary,
  },
  statusChipText: { fontSize: 12, fontWeight: '500', color: colors.labelSecondary },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  dueDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
    backgroundColor: colors.fillSecondary,
  },
  dueDateText: { ...typography.body, flex: 1 },
  calendarBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  calendarBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 360,
  },
  calendarTitle: { ...typography.subhead, color: colors.label, marginBottom: spacing.md, textAlign: 'center' },
});

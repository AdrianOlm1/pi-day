import React, { useState } from 'react';
import { View, Pressable, ScrollView, StyleSheet } from 'react-native';
import { ScaledText as Text } from '@/components/ui/ScaledText';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import type { ParsedShift } from '@/types';
import { Button } from '@/components/ui/Button';
import { spacing, typography, colors, radius, shadows } from '@/theme';

interface ShiftConfirmListProps {
  shifts: ParsedShift[];
  onConfirm: (selected: ParsedShift[]) => void;
  onCancel: () => void;
  accentColor?: string;
  loading?: boolean;
}

export function ShiftConfirmList({ shifts, onConfirm, onCancel, accentColor = '#3B82F6', loading = false }: ShiftConfirmListProps) {
  const [selected, setSelected] = useState<Set<number>>(new Set(shifts.map((_, i) => i)));

  function toggle(idx: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === shifts.length) setSelected(new Set());
    else setSelected(new Set(shifts.map((_, i) => i)));
  }

  function fmt24(t: string) {
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.heading}>Review shifts</Text>
          <Text style={styles.sub}>{selected.size} of {shifts.length} selected</Text>
        </View>
        <Pressable onPress={toggleAll} style={styles.selectAllBtn}>
          <Text style={[styles.selectAllText, { color: accentColor }]}>
            {selected.size === shifts.length ? 'Deselect all' : 'Select all'}
          </Text>
        </Pressable>
      </View>

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {shifts.map((shift, idx) => {
          const isSelected = selected.has(idx);
          let dateLabel = shift.date;
          try { dateLabel = format(parseISO(shift.date), 'EEE, MMM d, yyyy'); } catch (_) {}

          return (
            <Pressable
              key={idx}
              onPress={() => toggle(idx)}
              style={[
                styles.shiftRow,
                isSelected && { borderColor: accentColor, backgroundColor: accentColor + '08' },
              ]}
            >
              {/* Selection indicator */}
              <View style={[
                styles.selectCircle,
                isSelected && { backgroundColor: accentColor, borderColor: accentColor },
              ]}>
                {isSelected && <Ionicons name="checkmark" size={13} color="#fff" />}
              </View>

              {/* Info */}
              <View style={styles.shiftInfo}>
                <Text style={styles.shiftTitle}>{shift.title || 'Shift'}</Text>
                <Text style={styles.shiftDate}>{dateLabel}</Text>
                <Text style={styles.shiftTime}>{fmt24(shift.start_time)} – {fmt24(shift.end_time)}</Text>
              </View>

              {/* Duration */}
              <View style={styles.durationBadge}>
                <Text style={styles.durationText}>
                  {(() => {
                    const [sh, sm] = shift.start_time.split(':').map(Number);
                    const [eh, em] = shift.end_time.split(':').map(Number);
                    const mins = (eh * 60 + em) - (sh * 60 + sm);
                    const h = Math.floor(Math.abs(mins) / 60);
                    const m = Math.abs(mins) % 60;
                    return m === 0 ? `${h}h` : `${h}h ${m}m`;
                  })()}
                </Text>
              </View>
            </Pressable>
          );
        })}
        <View style={{ height: 16 }} />
      </ScrollView>

      <View style={styles.actions}>
        <Button title="Cancel" onPress={onCancel} variant="ghost" color={colors.labelSecondary} size="md" style={{ flex: 1 }} />
        <Button
          title={selected.size > 0 ? `Import ${selected.size} shift${selected.size === 1 ? '' : 's'}` : 'Select shifts'}
          onPress={() => onConfirm(shifts.filter((_, i) => selected.has(i)))}
          color={accentColor}
          loading={loading}
          disabled={selected.size === 0}
          size="md"
          style={{ flex: 1.8 }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingBottom: spacing.md },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  heading: { ...typography.title2, color: colors.label },
  sub: { ...typography.body, color: colors.labelSecondary, marginTop: 2 },
  selectAllBtn: { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm },
  selectAllText: { ...typography.subhead },
  list: { flex: 1 },
  shiftRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.fillSecondary,
    borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm,
    borderWidth: 1.5, borderColor: colors.separator,
  },
  selectCircle: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 1.5, borderColor: colors.labelTertiary,
    alignItems: 'center', justifyContent: 'center',
  },
  shiftInfo: { flex: 1 },
  shiftTitle: { ...typography.bodyEmphasis, color: colors.label },
  shiftDate: { ...typography.subhead, color: colors.labelSecondary, fontWeight: '400', marginTop: 2 },
  shiftTime: { ...typography.footnote, color: colors.labelTertiary, marginTop: 1 },
  durationBadge: {
    backgroundColor: colors.fill, borderRadius: radius.sm,
    paddingHorizontal: spacing.sm, paddingVertical: 4,
  },
  durationText: { fontSize: 12, fontWeight: '600', color: colors.labelSecondary },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
});

import React, { useRef } from 'react';
import { View, Pressable, StyleSheet, Alert, Animated } from 'react-native';
import { ScaledText as Text } from '@/components/ui/ScaledText';
import { Ionicons } from '@expo/vector-icons';
import type { Order, OrderStatus } from '@/types';
import { format, parseISO } from 'date-fns';
import { spacing, typography, colors, radius, shadows } from '@/theme';
import { hapticLight, hapticMedium } from '@/utils/haptics';

const STATUS_CONFIG: Record<OrderStatus, { color: string; icon: string }> = {
  Pending:       { color: '#F59E0B', icon: 'time-outline' },
  'In Progress': { color: '#3B82F6', icon: 'hammer-outline' },
  Complete:      { color: '#22C55E', icon: 'checkmark-circle-outline' },
};

interface OrderCardProps {
  order: Order;
  onSelect?: (order: Order) => void;
  onChangeStatus: (id: string, status: OrderStatus) => void;
  onDelete: (id: string) => void;
  onEdit: (order: Order) => void;
  onArchive?: (id: string) => void;
  isArchived?: boolean;
}

export function OrderCard({ order, onSelect, onDelete, onEdit, onArchive, isArchived = false }: OrderCardProps) {
  const cfg = STATUS_CONFIG[order.status];
  const scale = useRef(new Animated.Value(1)).current;
  const isActiveInProgress = !order.archived && (order.status === 'In Progress' || order.status === 'Pending');

  const onPressIn = () => Animated.spring(scale, { toValue: 0.98, useNativeDriver: true, damping: 20, stiffness: 350 }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 18, stiffness: 280 }).start();

  const showMeta = order.total != null || order.due_date || order.created_at || (isArchived && order.updated_at);

  return (
    <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
      {/* Status accent bar */}
      <View style={[styles.accentBar, { backgroundColor: cfg.color }]} />

      <View style={styles.body}>
        <Pressable
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          onPress={() => {
            hapticLight();
            onSelect?.(order);
          }}
          style={styles.contentArea}
        >
          {/* Top row */}
          <View style={styles.topRow}>
            <Text style={styles.customer} numberOfLines={1}>{order.customer_name}</Text>
            <View style={[styles.statusPill, { backgroundColor: cfg.color + '18', borderColor: cfg.color + '50' }]}>
              <Ionicons name={cfg.icon as any} size={11} color={cfg.color} />
              <Text style={[styles.statusText, { color: cfg.color }]}>{order.status}</Text>
            </View>
          </View>

          {/* Description */}
          <Text style={styles.description} numberOfLines={2}>{order.description}</Text>

          {/* Design notes */}
          {order.design_notes ? (
            <View style={styles.notesRow}>
              <Ionicons name="document-text-outline" size={13} color={colors.labelTertiary} />
              <Text style={styles.notes} numberOfLines={1}>{order.design_notes}</Text>
            </View>
          ) : null}

          {/* Meta: Added, Due, Total; Archived: also show Completed date */}
          {showMeta ? (
            <View style={styles.metaRow}>
              {isArchived && order.updated_at ? (
                <View style={styles.metaItem}>
                  <Ionicons name="checkmark-circle-outline" size={12} color={colors.labelTertiary} />
                  <Text style={styles.metaLabel}>Completed {format(parseISO(order.updated_at), 'MMM d, yyyy')}</Text>
                </View>
              ) : null}
              {order.created_at ? (
                <View style={styles.metaItem}>
                  <Ionicons name="add-circle-outline" size={12} color={colors.labelTertiary} />
                  <Text style={styles.metaLabel}>Added {format(parseISO(order.created_at), 'MMM d')}</Text>
                </View>
              ) : null}
              {order.due_date ? (
                <View style={styles.metaItem}>
                  <Ionicons name="calendar-outline" size={12} color={colors.labelTertiary} />
                  <Text style={styles.metaLabel}>Due {format(parseISO(order.due_date), 'MMM d')}</Text>
                </View>
              ) : null}
              {order.total != null ? (
                <View style={styles.metaItem}>
                  <Text style={styles.metaValue}>${Number(order.total).toFixed(2)}</Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </Pressable>

        {/* Actions */}
        <View style={styles.actions}>
          {isActiveInProgress && onArchive && (
            <Pressable
              style={[styles.archiveBtn, { borderColor: '#22C55E', backgroundColor: '#22C55E14' }]}
              onPress={() => {
                hapticMedium();
                onArchive(order.id);
              }}
            >
              <Ionicons name="checkmark-done-outline" size={14} color="#22C55E" />
              <Text style={[styles.archiveBtnText, { color: '#22C55E', fontWeight: '700' }]}>Complete</Text>
            </Pressable>
          )}
          <View style={styles.actionRight}>
            <Pressable style={styles.iconBtn} onPress={() => onEdit(order)}>
              <Ionicons name="pencil-outline" size={17} color={colors.labelSecondary} />
            </Pressable>
            <Pressable
              style={styles.iconBtn}
              onPress={() =>
                Alert.alert('Delete Order', 'Remove this order permanently?', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => onDelete(order.id) },
                ])
              }
            >
              <Ionicons name="trash-outline" size={17} color={colors.destructive + 'BB'} />
            </Pressable>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...shadows.md,
  },
  accentBar: { width: 4 },
  body: { flex: 1, padding: spacing.lg },
  contentArea: { flex: 1 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs },
  customer: { ...typography.callout, color: colors.label, flex: 1, marginRight: spacing.sm },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 3,
    borderWidth: 1,
  },
  statusText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },
  description: { ...typography.body, color: colors.labelSecondary, marginBottom: spacing.xs },
  notesRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm },
  notes: { flex: 1, ...typography.footnote, color: colors.labelTertiary },
  metaRow: { flexDirection: 'row', gap: spacing.lg, marginBottom: spacing.md, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaValue: { ...typography.subhead, color: colors.label },
  metaLabel: { ...typography.footnote, color: colors.labelTertiary },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderRadius: radius.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
  },
  nextBtnText: { fontSize: 12, fontWeight: '700' },
  archiveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderRadius: radius.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
  },
  archiveBtnText: { ...typography.footnote, fontWeight: '600', color: colors.labelSecondary },
  actionRight: { flexDirection: 'row', gap: spacing.xs, marginLeft: 'auto' },
  iconBtn: {
    width: 34, height: 34, borderRadius: radius.sm,
    backgroundColor: colors.fillSecondary,
    alignItems: 'center', justifyContent: 'center',
  },
});

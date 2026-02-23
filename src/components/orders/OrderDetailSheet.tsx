import React from 'react';
import { View, StyleSheet, Pressable, Alert } from 'react-native';
import { ScaledText as Text } from '@/components/ui/ScaledText';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import type { Order, OrderStatus } from '@/types';
import { Sheet } from '@/components/ui/Sheet';
import { spacing, typography, colors, radius } from '@/theme';

const STATUS_CONFIG: Record<OrderStatus, { color: string; icon: string; next: string }> = {
  Pending:       { color: '#F59E0B', icon: 'time-outline',          next: 'In Progress' },
  'In Progress': { color: '#3B82F6', icon: 'hammer-outline',         next: 'Complete' },
  Complete:      { color: '#22C55E', icon: 'checkmark-circle-outline', next: 'Pending' },
};

interface OrderDetailSheetProps {
  order: Order;
  visible: boolean;
  onClose: () => void;
  onEdit: (order: Order) => void;
  onDelete: (id: string) => void;
  onChangeStatus: (id: string, status: OrderStatus) => void;
  onArchive?: (id: string) => void;
  isArchived?: boolean;
}

function DetailRow({ label, value, icon }: { label: string; value: string; icon?: string }) {
  if (!value.trim()) return null;
  return (
    <View style={styles.detailRow}>
      {icon ? (
        <Ionicons name={icon as any} size={18} color={colors.labelTertiary} style={styles.rowIcon} />
      ) : null}
      <View style={styles.detailTextWrap}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

export function OrderDetailSheet({
  order,
  visible,
  onClose,
  onEdit,
  onDelete,
  onChangeStatus,
  onArchive,
  isArchived = false,
}: OrderDetailSheetProps) {
  const cfg = STATUS_CONFIG[order.status];
  const nextStatus = cfg.next as OrderStatus;

  const addedDate = order.created_at ? format(parseISO(order.created_at), 'MMM d, yyyy') : '';
  const dueDate = order.due_date ? format(parseISO(order.due_date), 'MMM d, yyyy') : '';
  const completedDate = order.updated_at ? format(parseISO(order.updated_at), 'MMM d, yyyy') : '';

  function handleEdit() {
    onClose();
    onEdit(order);
  }

  function handleDelete() {
    Alert.alert('Delete Order', 'Remove this order permanently?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { onClose(); onDelete(order.id); } },
    ]);
  }

  return (
    <Sheet visible={visible} onClose={onClose} heightFraction={0.7}>
      <View style={[styles.accentBar, { backgroundColor: cfg.color }]} />
      <View style={styles.header}>
        <View style={[styles.statusPill, { backgroundColor: cfg.color + '18', borderColor: cfg.color + '50' }]}>
          <Ionicons name={cfg.icon as any} size={14} color={cfg.color} />
          <Text style={[styles.statusText, { color: cfg.color }]}>{order.status}</Text>
        </View>
        <Text style={styles.customer}>{order.customer_name}</Text>
      </View>

      <DetailRow label="Description" value={order.description} />
      {order.design_notes ? (
        <DetailRow label="Design Notes" value={order.design_notes} icon="document-text-outline" />
      ) : null}
      {order.total != null ? (
        <DetailRow label="Total" value={`$${Number(order.total).toFixed(2)}`} icon="cash-outline" />
      ) : null}

      <View style={styles.datesSection}>
        <Text style={styles.sectionLabel}>Dates</Text>
        {isArchived && completedDate ? (
          <View style={styles.dateRow}>
            <Ionicons name="checkmark-circle-outline" size={16} color={colors.labelTertiary} />
            <Text style={styles.dateLabel}>Completed</Text>
            <Text style={styles.dateValue}>{completedDate}</Text>
          </View>
        ) : null}
        {addedDate ? (
          <View style={styles.dateRow}>
            <Ionicons name="add-circle-outline" size={16} color={colors.labelTertiary} />
            <Text style={styles.dateLabel}>Added</Text>
            <Text style={styles.dateValue}>{addedDate}</Text>
          </View>
        ) : null}
        {dueDate ? (
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={16} color={colors.labelTertiary} />
            <Text style={styles.dateLabel}>Due</Text>
            <Text style={styles.dateValue}>{dueDate}</Text>
          </View>
        ) : null}
        {!addedDate && !dueDate && !(isArchived && completedDate) ? (
          <Text style={styles.noDates}>No dates</Text>
        ) : null}
      </View>

      <View style={styles.actions}>
        {!isArchived && order.status !== 'Complete' && (
          <Pressable
            style={[styles.primaryBtn, { backgroundColor: cfg.color + '18', borderColor: cfg.color + '50' }]}
            onPress={() => onChangeStatus(order.id, nextStatus)}
          >
            <Ionicons name="arrow-forward" size={16} color={cfg.color} />
            <Text style={[styles.primaryBtnText, { color: cfg.color }]}>{nextStatus}</Text>
          </Pressable>
        )}
        {!isArchived && order.status === 'Complete' && onArchive && (
          <Pressable
            style={[styles.secondaryBtn, { borderColor: colors.labelTertiary }]}
            onPress={() => { onClose(); onArchive(order.id); }}
          >
            <Ionicons name="archive-outline" size={16} color={colors.labelSecondary} />
            <Text style={styles.secondaryBtnText}>Archive</Text>
          </Pressable>
        )}
        <Pressable style={[styles.secondaryBtn, { borderColor: colors.labelTertiary }]} onPress={handleEdit}>
          <Ionicons name="pencil-outline" size={16} color={colors.labelSecondary} />
          <Text style={styles.secondaryBtnText}>Edit</Text>
        </Pressable>
        <Pressable
          style={[styles.secondaryBtn, { borderColor: colors.destructive + '60' }]}
          onPress={handleDelete}
        >
          <Ionicons name="trash-outline" size={16} color={colors.destructive} />
          <Text style={[styles.secondaryBtnText, { color: colors.destructive }]}>Delete</Text>
        </Pressable>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
  },
  header: {
    paddingTop: spacing.lg + 4,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  statusText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.2 },
  customer: { ...typography.title2, color: colors.label },

  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  rowIcon: { marginRight: spacing.sm, marginTop: 2 },
  detailTextWrap: { flex: 1 },
  detailLabel: { ...typography.footnote, color: colors.labelTertiary, marginBottom: 2 },
  detailValue: { ...typography.body, color: colors.label },

  datesSection: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  sectionLabel: { ...typography.subhead, color: colors.labelTertiary, marginBottom: spacing.sm },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  dateLabel: { ...typography.footnote, color: colors.labelTertiary, minWidth: 48 },
  dateValue: { ...typography.subhead, color: colors.label },
  noDates: { ...typography.footnote, color: colors.labelTertiary, fontStyle: 'italic' },

  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  primaryBtnText: { fontSize: 14, fontWeight: '700' },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  secondaryBtnText: { ...typography.subhead, fontWeight: '600', color: colors.labelSecondary },
});

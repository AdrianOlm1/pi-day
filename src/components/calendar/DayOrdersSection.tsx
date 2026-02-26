import React, { useState } from 'react';
import { View, StyleSheet, Pressable, Animated, LayoutAnimation, Platform } from 'react-native';
import { ScaledText as Text } from '@/components/ui/ScaledText';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { isSameDay } from '@/utils/date';
import type { Order, OrderStatus } from '@/types';
import { typography, radius, spacing } from '@/theme';
import { useAppColors } from '@/contexts/ThemeContext';
import { hapticLight } from '@/utils/haptics';

const STATUS_ICONS: Record<OrderStatus, string> = {
  Pending: 'time-outline',
  'In Progress': 'hammer-outline',
  Complete: 'checkmark-circle-outline',
};

interface DayOrdersSectionProps {
  orders: Order[];
  selectedDate: Date;
  accentColor: string;
  onOrderPress: (order: Order) => void;
  /** Optional entrance animation delay (ms) for stagger */
  entranceDelay?: number;
  /** When true, section starts collapsed (one-line header); tap to expand. Reduces scrolling. */
  defaultCollapsed?: boolean;
}

export function DayOrdersSection({
  orders,
  selectedDate,
  accentColor,
  onOrderPress,
  entranceDelay = 0,
  defaultCollapsed = true,
}: DayOrdersSectionProps) {
  const appColors = useAppColors();
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const today = new Date();
  const isToday = isSameDay(selectedDate, today);
  const fadeAnim = React.useRef(new Animated.Value(entranceDelay === 0 ? 1 : 0)).current;
  const translateY = React.useRef(new Animated.Value(entranceDelay === 0 ? 0 : 8)).current;

  React.useEffect(() => {
    if (entranceDelay > 0) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          delay: entranceDelay,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 220,
          delay: entranceDelay,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [entranceDelay, fadeAnim, translateY]);

  const toggleCollapsed = () => {
    hapticLight();
    if (Platform.OS === 'android') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    } else {
      LayoutAnimation.configureNext({ duration: 220, update: { type: LayoutAnimation.Types.easeInEaseOut } });
    }
    setCollapsed((c) => !c);
  };

  if (orders.length === 0) return null;

  const dueLabel = isToday ? 'Due today' : `Due ${format(selectedDate, 'MMM d')}`;

  return (
    <Animated.View style={[styles.wrap, { opacity: fadeAnim, transform: [{ translateY }] }]}>
      {/* Tappable header: shows count, chevron; tap to expand/collapse */}
      <Pressable
        onPress={toggleCollapsed}
        style={[styles.header, { borderLeftColor: accentColor }]}
        accessibilityLabel={collapsed ? 'Expand orders' : 'Collapse orders'}
      >
        <View style={[styles.iconWrap, { backgroundColor: accentColor + '18' }]}>
          <Ionicons name="cart-outline" size={16} color={accentColor} />
        </View>
        <Text style={[styles.headerLabel, { color: appColors.labelSecondary }]}>
          Orders due ({orders.length})
        </Text>
        <Text style={[styles.dueLabel, { color: appColors.labelTertiary }]}>{dueLabel}</Text>
        <Ionicons
          name={collapsed ? 'chevron-down' : 'chevron-up'}
          size={18}
          color={appColors.labelTertiary}
          style={styles.chevron}
        />
      </Pressable>

      {!collapsed && (
        <View style={[styles.card, { backgroundColor: appColors.fillSecondary }]}>
        {orders.map((order) => (
          <OrderRow
            key={order.id}
            order={order}
            appColors={appColors}
            onPress={() => {
              hapticLight();
              onOrderPress(order);
            }}
          />
        ))}
        </View>
      )}
    </Animated.View>
  );
}

function OrderRow({
  order,
  appColors,
  onPress,
}: {
  order: Order;
  appColors: ReturnType<typeof useAppColors>;
  onPress: () => void;
}) {
  const scale = React.useRef(new Animated.Value(1)).current;
  const statusColors: Record<OrderStatus, string> = {
    Pending: appColors.warning,
    'In Progress': appColors.info,
    Complete: appColors.success,
  };
  const cfg = { color: statusColors[order.status], icon: STATUS_ICONS[order.status] };

  return (
    <Pressable
      onPressIn={() => Animated.spring(scale, { toValue: 0.98, useNativeDriver: true, damping: 20, stiffness: 350 }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 18, stiffness: 280 }).start()}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.9 }]}
    >
      <Animated.View style={[styles.rowInner, { transform: [{ scale }] }]}>
        <Text style={[styles.customer, { color: appColors.label }]} numberOfLines={1}>
          {order.customer_name}
        </Text>
        <View style={[styles.statusPill, { backgroundColor: cfg.color + '18', borderColor: cfg.color + '50' }]}>
          <Ionicons name={cfg.icon as any} size={11} color={cfg.color} />
          <Text style={[styles.statusText, { color: cfg.color }]}>{order.status}</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    paddingLeft: spacing.sm,
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
    borderLeftWidth: 3,
    borderRadius: 1,
  },
  chevron: { marginLeft: 'auto' },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: radius.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLabel: { ...typography.caption, textTransform: 'uppercase', letterSpacing: 0.4 },
  dueLabel: { ...typography.caption },
  card: {
    borderRadius: radius.lg,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    overflow: 'hidden',
  },
  row: { paddingVertical: spacing.sm },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  customer: { flex: 1, ...typography.body },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderWidth: 1,
  },
  statusText: { fontSize: 11, fontWeight: '600' },
});

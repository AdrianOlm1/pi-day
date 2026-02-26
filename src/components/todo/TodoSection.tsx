import React, { useState, useRef, useEffect } from 'react';
import {
  View, Pressable, TextInput, StyleSheet, Alert, Animated,
} from 'react-native';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { ScaledText as Text } from '@/components/ui/ScaledText';
import { Ionicons } from '@expo/vector-icons';
import type { Todo, TodoOwner } from '@/types';
import { formatTime } from '@/utils/date';
import { playTrash, playCheck } from '@/utils/sounds';
import { useAppColors } from '@/contexts/ThemeContext';
import { spacing, typography, radius, shadows } from '@/theme';

function formatDueTime(todo: Todo): string | null {
  if (!todo.due_time || !todo.due_date) return null;
  const timePart = todo.due_time.length >= 5 ? todo.due_time.slice(0, 5) : todo.due_time;
  const iso = `${todo.due_date}T${timePart}:00`;
  try {
    return formatTime(iso);
  } catch {
    return todo.due_time;
  }
}

function formatDueTimeString(dueTime: string | null): string | null {
  if (!dueTime || !dueTime.trim()) return null;
  const part = dueTime.length >= 5 ? dueTime.slice(0, 5) : dueTime;
  try {
    return formatTime(`2000-01-01T${part}:00`);
  } catch {
    return dueTime;
  }
}

/** Unified item for Today: task (todo) or daily goal. */
export interface DailyItem {
  id: string;
  title: string;
  done: boolean;
  due_time: string | null;
  onToggle: () => void;
  onRemove: () => void;
}

interface TodoSectionProps {
  owner: TodoOwner;
  label: string;
  color: string;
  todos?: Todo[];
  /** When set, shows a unified list (daily goals) instead of todos. Takes precedence over todos. */
  items?: DailyItem[];
  onAdd: (title: string) => void;
  onToggle: (id: string, done: boolean) => void;
  onRemove: (id: string) => void;
  showAddInput?: boolean;
  hideSectionHeader?: boolean;
  /** When set with items, list becomes draggable; callback receives new order of DailyItems. */
  onReorder?: (orderedItems: DailyItem[]) => void;
}

export function TodoSection({ owner, label, color, todos = [], items: itemsProp, onAdd, onToggle, onRemove, showAddInput = true, hideSectionHeader = false, onReorder }: TodoSectionProps): React.JSX.Element {
  const appColors = useAppColors();
  const [inputText, setInputText] = useState('');
  const [inputFocused, setInputFocused] = useState(false);

  function handleAdd() {
    if (!inputText.trim()) return;
    hapticLight();
    onAdd(inputText.trim());
    setInputText('');
  }

  const items: DailyItem[] = itemsProp ?? todos.map((t) => ({
    id: t.id,
    title: t.title,
    done: t.done,
    due_time: t.due_time,
    onToggle: () => { playCheck(); onToggle(t.id, !t.done); },
    onRemove: () => {
      Alert.alert('Remove item', 'Delete this task?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => { playTrash(); onRemove(t.id); } },
      ]);
    },
  }));

  const isDraggable = items.length > 0 && itemsProp != null && onReorder != null;

  const remaining = items.filter((i) => !i.done).length;
  const done = items.filter((i) => i.done).length;

  const renderDraggableRow = ({ item, drag, isActive, getIndex }: RenderItemParams<DailyItem>) => {
    const idx = getIndex();
    const showDivider = idx != null && idx < items.length - 1;
    return (
      <ScaleDecorator activeScale={1.02}>
        <Pressable onLongPress={drag} delayLongPress={200} style={{ flex: 1 }}>
          <TodoRow
            todo={{ id: item.id, title: item.title, done: item.done, due_time: item.due_time, due_date: null } as Todo}
            color={color}
            appColors={appColors}
            showDivider={showDivider}
            onToggle={item.onToggle}
            onRemove={item.onRemove}
            dueTimeDisplay={item.due_time ? formatDueTimeString(item.due_time) : null}
            onLongPress={drag}
            isDragging={isActive}
          />
        </Pressable>
      </ScaleDecorator>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: appColors.surface }]}>
      {hideSectionHeader ? null : (
        <View style={styles.header}>
          <View style={[styles.colorBar, { backgroundColor: color }]} />
          <Text style={[styles.headerLabel, { color: appColors.label }]}>{label}</Text>
          <View style={styles.headerMeta}>
            {remaining > 0 && (
              <View style={[styles.badge, { backgroundColor: color + '18' }]}>
                <Text style={[styles.badgeText, { color }]}>{remaining}</Text>
              </View>
            )}
            {done > 0 && (
              <Text style={[styles.doneCount, { color: appColors.labelTertiary }]}>{done} done</Text>
            )}
          </View>
        </View>
      )}

      {/* List: draggable when onReorder + items provided, otherwise static */}
      {items.length > 0 ? (
        isDraggable ? (
          <DraggableFlatList<DailyItem>
            data={items}
            keyExtractor={(item) => item.id}
            onDragEnd={({ data }) => onReorder?.(data)}
            renderItem={renderDraggableRow}
            style={styles.draggableList}
            scrollEnabled={false}
            animationConfig={{
              damping: 22,
              mass: 0.2,
              stiffness: 90,
              overshootClamping: false,
            }}
          />
        ) : (
          <View style={styles.list}>
            {items.map((item, idx) => (
              <TodoRow
                key={item.id}
                todo={{ id: item.id, title: item.title, done: item.done, due_time: item.due_time, due_date: null } as Todo}
                color={color}
                appColors={appColors}
                showDivider={idx < items.length - 1}
                onToggle={item.onToggle}
                onRemove={item.onRemove}
                dueTimeDisplay={item.due_time ? formatDueTimeString(item.due_time) : null}
              />
            ))}
          </View>
        )
      ) : null}

      {/* Add input (optional, e.g. hidden when using FAB) */}
      {showAddInput && (
        <View style={[styles.addRow, { borderColor: inputFocused ? color : appColors.separator, backgroundColor: appColors.fillTertiary }]}>
          <TextInput
            style={[styles.addInput, { color: appColors.label }]}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Add a daily goal…"
            placeholderTextColor={appColors.labelTertiary}
            returnKeyType="done"
            onSubmitEditing={handleAdd}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
          />
          <Pressable
            onPress={handleAdd}
            style={[styles.addBtn, { backgroundColor: inputText.trim() ? color : appColors.fill }]}
            disabled={!inputText.trim()}
          >
            <Ionicons name="add" size={20} color={inputText.trim() ? '#fff' : appColors.labelTertiary} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

function TodoRow({
  todo, color, appColors, onToggle, onRemove, showDivider, onLongPress, isDragging, dueTimeDisplay,
}: {
  todo: Todo; color: string; appColors: ReturnType<typeof useAppColors>; onToggle: () => void; onRemove: () => void; showDivider: boolean;
  onLongPress?: () => void; isDragging?: boolean;
  /** When set, used instead of formatDueTime(todo) for display (e.g. for unified goal items that only have due_time). */
  dueTimeDisplay?: string | null;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const checkScale = useRef(new Animated.Value(todo.done ? 1 : 0)).current;
  const sparkle = useRef(new Animated.Value(0)).current;
  const [showSparkle, setShowSparkle] = useState(false);
  const dueTimeStr = dueTimeDisplay ?? formatDueTime(todo);

  useEffect(() => {
    if (!showSparkle) return;
    sparkle.setValue(0);
    Animated.sequence([
      Animated.timing(sparkle, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.timing(sparkle, { toValue: 0, duration: 0, useNativeDriver: true }),
    ]).start(() => setShowSparkle(false));
  }, [showSparkle, sparkle]);

  function handleToggle() {
    const completing = !todo.done;
    Animated.sequence([
      Animated.spring(scale, { toValue: 0.95, useNativeDriver: true, damping: 20, stiffness: 400 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 16, stiffness: 300 }),
    ]).start();
    Animated.spring(checkScale, {
      toValue: completing ? 1 : 0,
      useNativeDriver: true,
      damping: 14,
      stiffness: 300,
    }).start();
    if (completing) setShowSparkle(true);
    onToggle();
  }

  const rowStyle = [
    styles.item,
    showDivider && [styles.itemDivider, { borderBottomColor: appColors.separator }],
    { transform: [{ scale }] },
    isDragging && {
      opacity: 0.95,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 6,
    },
  ];

  const rowContent = (
    <>
      <Pressable onPress={handleToggle} style={styles.checkboxWrap} hitSlop={10}>
        <View style={[styles.checkbox, { borderColor: appColors.labelTertiary }, todo.done && { backgroundColor: color, borderColor: color }]}>
          <Animated.View style={{ transform: [{ scale: checkScale }] }}>
            <Ionicons name="checkmark" size={13} color="#fff" />
          </Animated.View>
          {showSparkle && (
            <Animated.View
              style={[
                styles.checkboxSparkle,
                {
                  backgroundColor: color,
                  opacity: sparkle.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.5, 0] }),
                  transform: [{ scale: sparkle.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.9] }) }],
                },
              ]}
            />
          )}
        </View>
      </Pressable>

      <Text
        style={[styles.itemText, { color: appColors.label }, todo.done && [styles.itemDone, { color: appColors.labelTertiary }]]}
        numberOfLines={2}
        onPress={handleToggle}
      >
        {todo.title}
      </Text>

      {dueTimeStr ? (
        <Text style={[styles.dueTime, { color: appColors.labelTertiary }, todo.done && styles.itemDone]}>{dueTimeStr}</Text>
      ) : null}

      <Pressable onPress={onRemove} style={styles.deleteBtn} hitSlop={14}>
        <Ionicons name="close" size={16} color={appColors.labelTertiary} />
      </Pressable>
    </>
  );

  if (onLongPress) {
    return (
      <Pressable onLongPress={onLongPress} delayLongPress={400} style={{ flex: 1 }}>
        <Animated.View style={rowStyle}>
          {rowContent}
        </Animated.View>
      </Pressable>
    );
  }

  return <Animated.View style={rowStyle}>{rowContent}</Animated.View>;
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.lg,
    marginBottom: spacing.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  colorBar: { width: 3, height: 18, borderRadius: 2 },
  headerLabel: { ...typography.callout, flex: 1 },
  headerMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  badge: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: { fontSize: 12, fontWeight: '700' },
  doneCount: { ...typography.caption },
  list: { paddingHorizontal: spacing.lg },
  draggableList: { paddingHorizontal: spacing.lg, flexGrow: 0 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  itemDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  checkboxWrap: {},
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  checkboxSparkle: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    top: -11,
    left: -11,
  },
  itemText: { flex: 1, ...typography.body },
  itemDone: { textDecorationLine: 'line-through' },
  dueTime: { ...typography.footnote, marginRight: spacing.xs },
  deleteBtn: { padding: 2 },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    margin: spacing.md,
    marginTop: spacing.sm,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  addInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: spacing.sm,
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

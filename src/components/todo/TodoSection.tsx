import React, { useState, useRef } from 'react';
import {
  View, Pressable, TextInput, StyleSheet, Alert, Animated,
} from 'react-native';
import { ScaledText as Text } from '@/components/ui/ScaledText';
import { Ionicons } from '@expo/vector-icons';
import type { Todo, TodoOwner } from '@/types';
import { formatTime } from '@/utils/date';
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

interface TodoSectionProps {
  owner: TodoOwner;
  label: string;
  color: string;
  todos: Todo[];
  onAdd: (title: string) => void;
  onToggle: (id: string, done: boolean) => void;
  onRemove: (id: string) => void;
  showAddInput?: boolean;
  /** When true, omit the header (label + meta); no separator is shown. */
  hideSectionHeader?: boolean;
}

export function TodoSection({ owner, label, color, todos, onAdd, onToggle, onRemove, showAddInput = true, hideSectionHeader = false }: TodoSectionProps) {
  const appColors = useAppColors();
  const [inputText, setInputText] = useState('');
  const [inputFocused, setInputFocused] = useState(false);

  function handleAdd() {
    if (!inputText.trim()) return;
    onAdd(inputText.trim());
    setInputText('');
  }

  const remaining = todos.filter((t) => !t.done).length;
  const done = todos.filter((t) => t.done).length;

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

      {/* Todo items */}
      {todos.length > 0 ? (
        <View style={styles.list}>
          {todos.map((todo, idx) => (
            <TodoRow
              key={todo.id}
              todo={todo}
              color={color}
              appColors={appColors}
              showDivider={idx < todos.length - 1}
              onToggle={() => onToggle(todo.id, !todo.done)}
              onRemove={() =>
                Alert.alert('Remove item', 'Delete this task?', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => onRemove(todo.id) },
                ])
              }
            />
          ))}
        </View>
      ) : null}

      {/* Add input (optional, e.g. hidden when using FAB) */}
      {showAddInput && (
        <View style={[styles.addRow, { borderColor: inputFocused ? color : appColors.separator, backgroundColor: appColors.fillTertiary }]}>
          <TextInput
            style={[styles.addInput, { color: appColors.label }]}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Add a task…"
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
  todo, color, appColors, onToggle, onRemove, showDivider,
}: {
  todo: Todo; color: string; appColors: ReturnType<typeof useAppColors>; onToggle: () => void; onRemove: () => void; showDivider: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const checkScale = useRef(new Animated.Value(todo.done ? 1 : 0)).current;
  const dueTimeStr = formatDueTime(todo);

  function handleToggle() {
    Animated.sequence([
      Animated.spring(scale, { toValue: 0.95, useNativeDriver: true, damping: 20, stiffness: 400 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 16, stiffness: 300 }),
    ]).start();
    Animated.spring(checkScale, {
      toValue: todo.done ? 0 : 1,
      useNativeDriver: true,
      damping: 14,
      stiffness: 300,
    }).start();
    onToggle();
  }

  return (
    <Animated.View style={[styles.item, showDivider && [styles.itemDivider, { borderBottomColor: appColors.separator }], { transform: [{ scale }] }]}>
      <Pressable onPress={handleToggle} style={styles.checkboxWrap} hitSlop={10}>
        <View style={[styles.checkbox, { borderColor: appColors.labelTertiary }, todo.done && { backgroundColor: color, borderColor: color }]}>
          <Animated.View style={{ transform: [{ scale: checkScale }] }}>
            <Ionicons name="checkmark" size={13} color="#fff" />
          </Animated.View>
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
    </Animated.View>
  );
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

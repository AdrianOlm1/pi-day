import React, { useState, useRef } from 'react';
import {
  View, Pressable, TextInput, StyleSheet, Alert, Animated,
} from 'react-native';
import { ScaledText as Text } from '@/components/ui/ScaledText';
import { Ionicons } from '@expo/vector-icons';
import type { Todo, TodoOwner } from '@/types';
import { formatTime } from '@/utils/date';
import { spacing, typography, colors, radius, shadows } from '@/theme';

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
    <View style={styles.container}>
      {hideSectionHeader ? null : (
        <View style={styles.header}>
          <View style={[styles.colorBar, { backgroundColor: color }]} />
          <Text style={styles.headerLabel}>{label}</Text>
          <View style={styles.headerMeta}>
            {remaining > 0 && (
              <View style={[styles.badge, { backgroundColor: color + '18' }]}>
                <Text style={[styles.badgeText, { color }]}>{remaining}</Text>
              </View>
            )}
            {done > 0 && (
              <Text style={styles.doneCount}>{done} done</Text>
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
        <View style={[styles.addRow, (inputFocused) && { borderColor: color }]}>
          <TextInput
            style={styles.addInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Add a task…"
            placeholderTextColor={colors.labelTertiary}
            returnKeyType="done"
            onSubmitEditing={handleAdd}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
          />
          <Pressable
            onPress={handleAdd}
            style={[styles.addBtn, { backgroundColor: inputText.trim() ? color : colors.fill }]}
            disabled={!inputText.trim()}
          >
            <Ionicons name="add" size={20} color={inputText.trim() ? '#fff' : colors.labelTertiary} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

function TodoRow({
  todo, color, onToggle, onRemove, showDivider,
}: {
  todo: Todo; color: string; onToggle: () => void; onRemove: () => void; showDivider: boolean;
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
    <Animated.View style={[styles.item, showDivider && styles.itemDivider, { transform: [{ scale }] }]}>
      <Pressable onPress={handleToggle} style={styles.checkboxWrap} hitSlop={10}>
        <View style={[styles.checkbox, todo.done && { backgroundColor: color, borderColor: color }]}>
          <Animated.View style={{ transform: [{ scale: checkScale }] }}>
            <Ionicons name="checkmark" size={13} color="#fff" />
          </Animated.View>
        </View>
      </Pressable>

      <Text
        style={[styles.itemText, todo.done && styles.itemDone]}
        numberOfLines={2}
        onPress={handleToggle}
      >
        {todo.title}
      </Text>

      {dueTimeStr ? (
        <Text style={[styles.dueTime, todo.done && styles.itemDone]}>{dueTimeStr}</Text>
      ) : null}

      <Pressable onPress={onRemove} style={styles.deleteBtn} hitSlop={14}>
        <Ionicons name="close" size={16} color={colors.labelTertiary} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
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
  headerLabel: { ...typography.callout, color: colors.label, flex: 1 },
  headerMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  badge: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: { fontSize: 12, fontWeight: '700' },
  doneCount: { ...typography.caption, color: colors.labelTertiary },
  list: { paddingHorizontal: spacing.lg },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  itemDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  checkboxWrap: {},
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.labelTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: { flex: 1, ...typography.body, color: colors.label },
  itemDone: { textDecorationLine: 'line-through', color: colors.labelTertiary },
  dueTime: { ...typography.footnote, color: colors.labelTertiary, marginRight: spacing.xs },
  deleteBtn: { padding: 2 },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    margin: spacing.md,
    marginTop: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.separator,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.fillTertiary,
  },
  addInput: {
    flex: 1,
    fontSize: 15,
    color: colors.label,
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

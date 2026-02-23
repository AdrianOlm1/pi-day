import React, { useState } from 'react';
import { View, StyleSheet, Pressable, Modal, Alert, Switch, TextInput } from 'react-native';
import { ScaledText as Text } from '@/components/ui/ScaledText';
import { Ionicons } from '@expo/vector-icons';
import { spacing, typography, radius } from '@/theme';
import { useAppColors } from '@/contexts/ThemeContext';
import { useUserMode } from '@/contexts/UserModeContext';
import { useCategories } from '@/hooks/useCategories';
import { useProfile } from '@/hooks/useProfile';
import { playTrash } from '@/utils/sounds';
import { GlassCard } from '@/components/ui/GlassCard';
import type { EventCategory } from '@/types';

const CATEGORY_ICONS = [
  'briefcase-outline',
  'school-outline',
  'person-outline',
  'people-outline',
  'folder-outline',
  'star-outline',
  'heart-outline',
  'fitness-outline',
  'restaurant-outline',
  'car-outline',
  'medical-outline',
  'calendar-outline',
] as const;

const QUICK_COLORS = [
  '#F59E0B', '#10B981', '#6366F1', '#8B5CF6', '#EC4899',
  '#14B8A6', '#3B82F6', '#EF4444', '#84CC16', '#64748B',
];

function hexToRgba(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16) || 0;
  const g = parseInt(h.slice(2, 4), 16) || 0;
  const b = parseInt(h.slice(4, 6), 16) || 0;
  return `rgba(${r},${g},${b},${a})`;
}

// ─── Category notification toggles (which categories to get reminders for) ───
export function CategoryNotificationToggles() {
  const appColors = useAppColors();
  const { userId } = useUserMode();
  const { profile, setNotificationCategoryIds } = useProfile(userId);
  const { categories } = useCategories();

  const ids = profile?.notification_category_ids ?? [];

  function toggle(categoryId: string, on: boolean) {
    const next = on ? [...ids, categoryId] : ids.filter((id) => id !== categoryId);
    setNotificationCategoryIds(next);
  }

  if (categories.length === 0) return null;

  return (
    <View style={[catNotifStyles.wrap, { borderTopColor: appColors.separator }]}>
      <Text style={[catNotifStyles.heading, { color: appColors.labelSecondary }]}>Notify for event categories</Text>
      {categories.map((cat) => {
        const enabled = ids.includes(cat.id);
        return (
          <View key={cat.id} style={[catNotifStyles.row, { borderBottomColor: appColors.separator }]}>
            <View style={[catNotifStyles.iconWrap, { backgroundColor: cat.color + '22' }]}>
              <Ionicons name={cat.icon as any} size={18} color={cat.color} />
            </View>
            <Text style={[catNotifStyles.label, { color: appColors.label }]}>{cat.name}</Text>
            <Switch
              value={enabled}
              onValueChange={(v) => toggle(cat.id, v)}
              trackColor={{ true: cat.color }}
              thumbColor="#fff"
            />
          </View>
        );
      })}
    </View>
  );
}

const catNotifStyles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    marginTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  heading: { ...typography.footnote, marginBottom: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconWrap: { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  label: { ...typography.body, flex: 1 },
});

// ─── Categories list + add / edit / delete ───────────────────────────────────
export function CategoriesSection() {
  const appColors = useAppColors();
  const { userColor } = useUserMode();
  const { categories, addCategory, updateCategory, deleteCategory, loading, error, refresh } = useCategories();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<EventCategory | null>(null);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('folder-outline');
  const [color, setColor] = useState('#6366F1');
  const [saving, setSaving] = useState(false);

  function openAdd() {
    setEditingCategory(null);
    setName('');
    setIcon('folder-outline');
    setColor('#6366F1');
    setModalVisible(true);
  }

  function openEdit(cat: EventCategory) {
    setEditingCategory(cat);
    setName(cat.name);
    setIcon(cat.icon);
    setColor(cat.color);
    setModalVisible(true);
  }

  function closeModal() {
    setModalVisible(false);
    setEditingCategory(null);
  }

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, { name: trimmed, icon, color });
      } else {
        await addCategory({
          name: trimmed,
          icon,
          color,
          sort_order: categories.length,
        });
      }
      closeModal();
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(cat: EventCategory) {
    Alert.alert(
      'Delete category',
      `Delete "${cat.name}"? Events using it will keep the category but you can’t select it for new events.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => { playTrash(); deleteCategory(cat.id); } },
      ],
    );
  }

  return (
    <>
      <GlassCard style={catSectionStyles.card} accentColor={userColor}>
        <View style={catSectionStyles.header}>
          <Text style={[catSectionStyles.title, { color: appColors.label }]}>Event categories</Text>
          <Text style={[catSectionStyles.sub, { color: appColors.labelTertiary }]}>Used when creating calendar events</Text>
        </View>
        {error ? (
          <View style={catSectionStyles.errorWrap}>
            <Text style={[catSectionStyles.errorText, { color: appColors.labelSecondary }]}>{error}</Text>
            <Pressable onPress={() => refresh()} style={[catSectionStyles.retryBtn, { backgroundColor: userColor + '22', borderColor: userColor }]}>
              <Text style={[catSectionStyles.retryText, { color: userColor }]}>Retry</Text>
            </Pressable>
          </View>
        ) : loading ? (
          <Text style={[catSectionStyles.loading, { color: appColors.labelTertiary }]}>Loading…</Text>
        ) : (
          <>
            {categories.map((cat) => (
              <Pressable
                key={cat.id}
                onPress={() => openEdit(cat)}
                style={[catSectionStyles.row, { borderBottomColor: appColors.separator }]}
              >
                <View style={[catSectionStyles.iconWrap, { backgroundColor: hexToRgba(cat.color, 0.2) }]}>
                  <Ionicons name={cat.icon as any} size={18} color={cat.color} />
                </View>
                <Text style={[catSectionStyles.name, { color: appColors.label }]}>{cat.name}</Text>
                <Pressable
                  onPress={() => handleDelete(cat)}
                  hitSlop={8}
                  style={[catSectionStyles.deleteBtn, { backgroundColor: hexToRgba(appColors.destructive ?? '#DC2626', 0.12) }]}
                >
                  <Ionicons name="trash-outline" size={16} color={appColors.destructive ?? '#DC2626'} />
                </Pressable>
              </Pressable>
            ))}
            <Pressable onPress={openAdd} style={[catSectionStyles.addRow, { borderColor: appColors.separator }]}>
              <Ionicons name="add-circle-outline" size={20} color={userColor} />
              <Text style={[catSectionStyles.addText, { color: userColor }]}>Add category</Text>
            </Pressable>
          </>
        )}
      </GlassCard>

      <Modal visible={modalVisible} transparent animationType="fade">
        <Pressable style={modalStyles.backdrop} onPress={closeModal}>
          <Pressable style={[modalStyles.box, { backgroundColor: appColors.surface }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[modalStyles.title, { color: appColors.label }]}>{editingCategory ? 'Edit category' : 'New category'}</Text>
            <Text style={[modalStyles.label, { color: appColors.labelSecondary }]}>Name</Text>
            <View style={[modalStyles.inputWrap, { borderColor: appColors.separator, backgroundColor: appColors.fillSecondary }]}>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g. Work, Family"
                placeholderTextColor={appColors.labelTertiary}
                style={[modalStyles.input, { color: appColors.label }]}
                selectionColor={userColor}
              />
            </View>
            <Text style={[modalStyles.label, { color: appColors.labelSecondary }]}>Icon</Text>
            <View style={modalStyles.iconRow}>
              {CATEGORY_ICONS.slice(0, 8).map((i) => (
                <Pressable
                  key={i}
                  onPress={() => setIcon(i)}
                  style={[modalStyles.iconBtn, icon === i && { backgroundColor: color + '30', borderColor: color }]}
                >
                  <Ionicons name={i as any} size={20} color={icon === i ? color : appColors.labelTertiary} />
                </Pressable>
              ))}
            </View>
            <Text style={[modalStyles.label, { color: appColors.labelSecondary }]}>Color</Text>
            <View style={modalStyles.colorRow}>
              {QUICK_COLORS.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setColor(c)}
                  style={[modalStyles.colorSwatch, { backgroundColor: c }, color === c && modalStyles.colorSwatchSelected]}
                >
                  {color === c ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
                </Pressable>
              ))}
            </View>
            <View style={modalStyles.actions}>
              <Pressable onPress={closeModal} style={[modalStyles.btn, { backgroundColor: appColors.fillSecondary }]}>
                <Text style={[modalStyles.btnText, { color: appColors.label }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSave}
                style={[modalStyles.btn, { backgroundColor: color }]}
                disabled={saving || !name.trim()}
              >
                <Text style={modalStyles.btnTextPrimary}>{saving ? '…' : 'Save'}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  box: {
    width: '100%',
    maxWidth: 340,
    borderRadius: radius.xl,
    padding: spacing.xl,
    ...typography.body,
  },
  title: { ...typography.title3, marginBottom: spacing.lg },
  label: { ...typography.footnote, marginBottom: spacing.xs },
  inputWrap: { borderWidth: 1.5, borderRadius: radius.md, marginBottom: spacing.md },
  input: { ...typography.body, paddingHorizontal: spacing.md, paddingVertical: 12 },
  iconRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.lg },
  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSwatchSelected: { borderWidth: 2, borderColor: '#fff', borderRadius: 18 },
  actions: { flexDirection: 'row', gap: spacing.md },
  btn: { flex: 1, paddingVertical: 12, borderRadius: radius.md, alignItems: 'center' },
  btnText: { ...typography.bodyEmphasis },
  btnTextPrimary: { ...typography.bodyEmphasis, color: '#fff' },
});

const catSectionStyles = StyleSheet.create({
  card: { marginHorizontal: spacing.xl },
  header: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  title: { ...typography.bodyEmphasis },
  sub: { ...typography.footnote, marginTop: 2 },
  loading: { ...typography.footnote, paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
  errorWrap: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md, gap: spacing.sm },
  errorText: { ...typography.footnote },
  retryBtn: { alignSelf: 'flex-start', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1.5 },
  retryText: { ...typography.bodyEmphasis },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconWrap: { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  name: { ...typography.body, flex: 1 },
  deleteBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    marginHorizontal: spacing.xl,
    marginTop: spacing.xs,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: radius.md,
  },
  addText: { ...typography.bodyEmphasis },
});

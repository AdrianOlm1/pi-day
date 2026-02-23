import React, { useState } from 'react';
import { View, StyleSheet, Pressable, Alert, Switch } from 'react-native';
import { ScaledText as Text } from '@/components/ui/ScaledText';
import { Ionicons } from '@expo/vector-icons';
import { spacing, typography, radius } from '@/theme';
import { useAppColors } from '@/contexts/ThemeContext';
import { useUserMode } from '@/contexts/UserModeContext';
import { useAutoDeleteSettings, type AutoDeleteMode } from '@/hooks/useAutoDeleteSettings';
import { useCategories } from '@/hooks/useCategories';
import { GlassCard } from '@/components/ui/GlassCard';
import { SectionHeader } from './SectionHeader';
import { playTrash } from '@/utils/sounds';
import { deletePastEvents } from '@/services/events';

function hexToRgba(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16) || 0;
  const g = parseInt(h.slice(2, 4), 16) || 0;
  const b = parseInt(h.slice(4, 6), 16) || 0;
  return `rgba(${r},${g},${b},${a})`;
}

export function AutoDeleteSection() {
  const appColors = useAppColors();
  const { userColor } = useUserMode();
  const { settings, setEnabled, setMode, setCategoryIds } = useAutoDeleteSettings();
  const { categories } = useCategories();
  const [wiping, setWiping] = useState(false);

  const confirmWipeAll = () => {
    Alert.alert(
      'Wipe all past events',
      'Permanently delete all events that have already ended? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Wipe all',
          style: 'destructive',
          onPress: async () => {
            setWiping(true);
            try {
              const count = await deletePastEvents(new Date());
              if (count > 0) playTrash();
            } finally {
              setWiping(false);
            }
          },
        },
      ],
    );
  };

  const toggleCategory = (categoryId: string, on: boolean) => {
    const next = on
      ? [...settings.categoryIds, categoryId]
      : settings.categoryIds.filter((id) => id !== categoryId);
    setCategoryIds(next);
  };

  return (
    <>
      <SectionHeader
        title="Auto delete"
        emoji="🗑️"
        accentColors={[appColors.gradientFrom, appColors.gradientTo]}
      />
      <GlassCard style={s.card} accentColor={appColors.gradientFrom}>
        {/* One-time: Wipe all past events */}
        <Pressable
          onPress={confirmWipeAll}
          disabled={wiping}
          style={[s.wipeRow, { borderBottomColor: appColors.separator }]}
        >
          <View style={[s.iconWrap, { backgroundColor: hexToRgba(appColors.destructive ?? '#DC2626', 0.15) }]}>
            <Ionicons name="trash-outline" size={20} color={appColors.destructive ?? '#DC2626'} />
          </View>
          <View style={s.labelCol}>
            <Text style={[s.label, { color: appColors.label }]}>Wipe all past events</Text>
            <Text style={[s.sub, { color: appColors.labelTertiary }]}>
              Delete every event that has already ended
            </Text>
          </View>
          {wiping ? (
            <Text style={[s.sub, { color: appColors.labelTertiary }]}>…</Text>
          ) : (
            <Ionicons name="chevron-forward" size={16} color={appColors.labelTertiary} />
          )}
        </Pressable>

        {/* Toggle: Auto-delete after 24 hours */}
        <View style={[s.toggleRow, { borderBottomColor: appColors.separator }]}>
          <View style={[s.iconWrap, { backgroundColor: userColor + '22' }]}>
            <Ionicons name="time-outline" size={20} color={userColor} />
          </View>
          <View style={s.labelCol}>
            <Text style={[s.label, { color: appColors.label }]}>Auto-delete after 24 hours</Text>
            <Text style={[s.sub, { color: appColors.labelTertiary }]}>
              Automatically remove events 24h after they end
            </Text>
          </View>
          <Switch
            value={settings.enabled}
            onValueChange={setEnabled}
            trackColor={{ true: userColor }}
            thumbColor="#fff"
          />
        </View>

        {settings.enabled && (
          <>
            {/* Mode: All vs By category */}
            <View style={[s.modeRow, { borderBottomColor: appColors.separator }]}>
              <Text style={[s.modeLabel, { color: appColors.labelSecondary }]}>Delete</Text>
              <View style={s.modeOptions}>
                <Pressable
                  onPress={() => setMode('all')}
                  style={[
                    s.modeBtn,
                    { borderColor: appColors.separator },
                    settings.mode === 'all' && { backgroundColor: userColor + '22', borderColor: userColor },
                  ]}
                >
                  <Text
                    style={[
                      s.modeBtnText,
                      { color: settings.mode === 'all' ? userColor : appColors.label },
                    ]}
                  >
                    All events
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setMode('by_category')}
                  style={[
                    s.modeBtn,
                    { borderColor: appColors.separator },
                    settings.mode === 'by_category' && {
                      backgroundColor: userColor + '22',
                      borderColor: userColor,
                    },
                  ]}
                >
                  <Text
                    style={[
                      s.modeBtnText,
                      { color: settings.mode === 'by_category' ? userColor : appColors.label },
                    ]}
                  >
                    By category
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Category toggles when mode is by_category */}
            {settings.mode === 'by_category' && categories.length > 0 && (
              <View style={[s.catWrap, { borderTopColor: appColors.separator }]}>
                <Text style={[s.catHeading, { color: appColors.labelSecondary }]}>
                  Categories to auto-delete after 24h
                </Text>
                {categories.map((cat) => {
                  const enabled = settings.categoryIds.includes(cat.id);
                  return (
                    <View
                      key={cat.id}
                      style={[s.catRow, { borderBottomColor: appColors.separator }]}
                    >
                      <View style={[s.catIconWrap, { backgroundColor: cat.color + '22' }]}>
                        <Ionicons name={cat.icon as any} size={18} color={cat.color} />
                      </View>
                      <Text style={[s.catName, { color: appColors.label }]}>{cat.name}</Text>
                      <Switch
                        value={enabled}
                        onValueChange={(v) => toggleCategory(cat.id, v)}
                        trackColor={{ true: cat.color }}
                        thumbColor="#fff"
                      />
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}
      </GlassCard>
    </>
  );
}

const s = StyleSheet.create({
  card: { marginHorizontal: spacing.xl },
  wipeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modeRow: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelCol: { flex: 1 },
  label: { ...typography.bodyEmphasis },
  sub: { ...typography.footnote, marginTop: 2 },
  modeLabel: { ...typography.footnote, marginBottom: spacing.xs },
  modeOptions: { flexDirection: 'row', gap: spacing.sm },
  modeBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  modeBtnText: { ...typography.footnote },
  catWrap: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    marginTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  catHeading: { ...typography.footnote, marginBottom: spacing.sm },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  catIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catName: { ...typography.body, flex: 1 },
});

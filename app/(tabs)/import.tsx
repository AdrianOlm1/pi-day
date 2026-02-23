/**
 * Placeholder tab — the AI Import feature has moved to the camera icon
 * in the Calendar tab header. This slot is reserved for a future feature.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ScaledText as Text } from '@/components/ui/ScaledText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useUserMode } from '@/contexts/UserModeContext';
import { useAppColors } from '@/contexts/ThemeContext';
import { UserToggle } from '@/components/ui/UserToggle';
import { spacing, typography, colors, radius } from '@/theme';

export default function MoreScreen() {
  const { userColor } = useUserMode();
  const appColors = useAppColors();

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: appColors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: appColors.surface }]}>
        <View style={s.headerLeft}>
          <View style={[s.iconBadge, { backgroundColor: userColor + '14' }]}>
            <Ionicons name="ellipsis-horizontal" size={20} color={userColor} />
          </View>
          <Text style={s.title}>More</Text>
        </View>
        <UserToggle />
      </View>

      {/* Placeholder body */}
      <View style={s.body}>
        <View style={[s.placeholderIcon, { backgroundColor: userColor + '10' }]}>
          <Ionicons name="construct-outline" size={40} color={userColor} />
        </View>
        <Text style={s.placeholderTitle}>Coming soon</Text>
        <Text style={s.placeholderSub}>
          This space is reserved for a new feature.{'\n'}Stay tuned!
        </Text>
        <View style={[s.tip, { backgroundColor: userColor + '10', borderColor: userColor + '30' }]}>
          <Ionicons name="camera-outline" size={16} color={userColor} />
          <Text style={[s.tipText, { color: userColor }]}>
            AI Import has moved to the camera icon in the Calendar header
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconBadge: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  title: { ...typography.title3, color: colors.label },

  body: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: spacing.xxxl, gap: spacing.md,
  },
  placeholderIcon: {
    width: 88, height: 88, borderRadius: 44,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm,
  },
  placeholderTitle: { ...typography.title3, color: colors.label, textAlign: 'center' },
  placeholderSub: { ...typography.body, color: colors.labelSecondary, textAlign: 'center', lineHeight: 22 },
  tip: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    borderWidth: 1, borderRadius: radius.lg,
    padding: spacing.md, marginTop: spacing.lg,
  },
  tipText: { flex: 1, fontSize: 13, fontWeight: '500', lineHeight: 18 },
});

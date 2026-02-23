import React, { useState, useRef, useEffect } from 'react';
import {
  View, StyleSheet, ScrollView, Modal, Pressable,
  Animated, Platform, Easing,
} from 'react-native';
import { ScaledText as Text } from '@/components/ui/ScaledText';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { spacing, typography, radius, shadows } from '@/theme';
import { useTheme, useAppColors, type FontSizeScale } from '@/contexts/ThemeContext';
import { useUserMode } from '@/contexts/UserModeContext';
import { useProfile } from '@/hooks/useProfile';
import { SectionHeader } from './SectionHeader';
import { UserColorPicker } from './UserColorPicker';
import { ThemePicker } from './ThemePicker';
import { FontScalePicker } from './FontScalePicker';
import { CategoriesSection, CategoryNotificationToggles } from './CategoriesSection';
import { AutoDeleteSection } from './AutoDeleteSection';
import { ACBackgroundStatic } from '@/components/ui/ACBackground';
import { GlassCard } from '@/components/ui/GlassCard';
import type { UserId } from '@/types';
import type { ACThemeId } from '@/constants/acThemes';
import { TextInput as RNTextInput } from 'react-native';

// ─── hex → rgba helper ────────────────────────────────────────────────────────
function hexToRgba(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16) || 0;
  const g = parseInt(h.slice(2, 4), 16) || 0;
  const b = parseInt(h.slice(4, 6), 16) || 0;
  return `rgba(${r},${g},${b},${a})`;
}

// ─── Bouncy leaf entrance — staggers items with a spring pop ─────────────────
function useLeafEntrance(visible: boolean, delay = 0) {
  const scale   = useRef(new Animated.Value(0.7)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const transY  = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    if (visible) {
      setTimeout(() => {
        Animated.parallel([
          Animated.spring(scale,   { toValue: 1, useNativeDriver: true, damping: 14, stiffness: 200, mass: 0.8 }),
          Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
          Animated.spring(transY,  { toValue: 0, useNativeDriver: true, damping: 16, stiffness: 220 }),
        ]).start();
      }, delay);
    } else {
      scale.setValue(0.7);
      opacity.setValue(0);
      transY.setValue(18);
    }
  }, [visible]);

  return { scale, opacity, transY };
}

// ─── Floating leaf decoration ─────────────────────────────────────────────────
function FloatingLeaf({ emoji, x, delay }: { emoji: string; x: number; delay: number }) {
  const transY  = useRef(new Animated.Value(0)).current;
  const rot     = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(transY, { toValue: -8, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(transY, { toValue: 0,  duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(rot, { toValue: 1,  duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(rot, { toValue: -1, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(rot, { toValue: 0,  duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      ])
    );
    const timer = setTimeout(() => loop.start(), delay);
    return () => { clearTimeout(timer); loop.stop(); };
  }, []);

  const rotate = rot.interpolate({ inputRange: [-1, 1], outputRange: ['-12deg', '12deg'] });

  return (
    <Animated.Text
      style={{
        position: 'absolute',
        left: x,
        top: 12,
        fontSize: 22,
        opacity: 0.45,
        transform: [{ translateY: transY }, { rotate }],
      }}
      pointerEvents="none"
    >
      {emoji}
    </Animated.Text>
  );
}

// ─── Name Input ────────────────────────────────────────────────────────────────
interface NameInputProps { userId: UserId; currentName: string; }
function NameInput({ userId, currentName }: NameInputProps) {
  const appColors = useAppColors();
  const { setUserName, getUserColor } = useTheme();
  const [val, setVal] = useState(currentName);
  const color = getUserColor(userId);
  useEffect(() => { setVal(currentName); }, [currentName]);

  return (
    <View style={[ni.wrap, { borderColor: hexToRgba(color, 0.3), backgroundColor: hexToRgba(color, 0.06) }]}>
      <RNTextInput
        value={val}
        onChangeText={setVal}
        onBlur={() => { if (val.trim()) setUserName(userId, val.trim()); }}
        style={[ni.input, { color: appColors.label }]}
        placeholderTextColor={appColors.labelTertiary}
        placeholder={userId === 'adrian' ? "Adrian's display name" : "Sarah's display name"}
        returnKeyType="done"
        selectionColor={color}
        maxLength={24}
      />
    </View>
  );
}
const ni = StyleSheet.create({
  wrap: { marginHorizontal: spacing.xl, marginBottom: spacing.sm, borderRadius: radius.md, borderWidth: 1.5, paddingHorizontal: spacing.md },
  input: { ...typography.body, paddingVertical: 10 },
});

// ─── Color Row ────────────────────────────────────────────────────────────────
interface ColorRowProps { userId: UserId; label: string; isLast?: boolean; }
function ColorRow({ userId, label, isLast }: ColorRowProps) {
  const appColors = useAppColors();
  const { getUserColor, setUserColor, getUserName, activeTheme } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const heightAnim = useRef(new Animated.Value(0)).current;
  const color = getUserColor(userId);
  useEffect(() => {
    Animated.spring(heightAnim, { toValue: expanded ? 1 : 0, useNativeDriver: false, damping: 20, stiffness: 180 }).start();
  }, [expanded]);
  const maxH = heightAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 420] });

  return (
    <View>
      <Pressable onPress={() => setExpanded(e => !e)}>
        <View style={cr.row}>
          {/* Avatar circle with gradient */}
          <View style={cr.avatarWrap}>
            <LinearGradient
              colors={[color, hexToRgba(color, 0.7)]}
              style={cr.avatarGrad}
            >
              <Text style={cr.avatarInitial}>{getUserName(userId)[0]}</Text>
            </LinearGradient>
          </View>
          <View style={cr.labelCol}>
            <Text style={[cr.label, { color: appColors.label }]}>{label}</Text>
            <Text style={[cr.sub, { color: appColors.labelTertiary }]}>
              {expanded ? 'Choose a color below' : 'Tap to customize'}
            </Text>
          </View>
          {/* Swatch preview pill */}
          <View style={[cr.swatchPill, { backgroundColor: color }]} />
          <Animated.View style={{
            transform: [{ rotate: heightAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) }]
          }}>
            <Ionicons name="chevron-down" size={16} color={appColors.labelTertiary} />
          </Animated.View>
        </View>
      </Pressable>

      <Animated.View style={{ maxHeight: maxH, overflow: 'hidden' }}>
        <UserColorPicker userId={userId} selectedColor={color} onSelectColor={hex => setUserColor(userId, hex)} />
        <NameInput userId={userId} currentName={getUserName(userId)} />
      </Animated.View>

      {!isLast && <View style={[cr.sep, { backgroundColor: appColors.separator }]} />}
    </View>
  );
}
const cr = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingVertical: spacing.md, gap: spacing.md },
  avatarWrap: { borderRadius: 22, overflow: 'hidden', ...shadows.sm },
  avatarGrad: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: '#fff', fontSize: 18, fontWeight: '700' },
  labelCol: { flex: 1 },
  label:  { ...typography.bodyEmphasis },
  sub:    { ...typography.footnote, marginTop: 2 },
  swatchPill: { width: 36, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  swatchEmoji: { fontSize: 12 },
  sep: { height: StyleSheet.hairlineWidth, marginHorizontal: spacing.xl },
});

// ─── Notification Row ─────────────────────────────────────────────────────────
function NotificationRow() {
  const appColors = useAppColors();
  const { userId } = useUserMode();
  const { profile, setNotificationTime } = useProfile(userId);
  const [show, setShow] = useState(false);

  const timeStr = profile?.notification_time ?? '09:00';
  const [hh, mm] = timeStr.split(':').map(Number);
  const date = new Date(); date.setHours(hh, mm, 0, 0);
  const displayTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <View>
      <Pressable onPress={() => setShow(s => !s)} style={nr.row}>
        <View style={nr.iconBadge}><Ionicons name="notifications-outline" size={20} color={appColors.labelSecondary} /></View>
        <View style={{ flex: 1 }}>
          <Text style={[nr.label, { color: appColors.label }]}>Daily Reminder</Text>
          <Text style={[nr.sub, { color: appColors.labelTertiary }]}>Goals & to-dos</Text>
        </View>
        <Text style={[nr.time, { color: appColors.labelSecondary }]}>{displayTime}</Text>
        <Animated.View>
          <Ionicons name={show ? 'chevron-up' : 'chevron-down'} size={16} color={appColors.labelTertiary} />
        </Animated.View>
      </Pressable>
      {show && (
        <DateTimePicker
          value={date}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_e, d) => {
            if (d) {
              setNotificationTime(`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`);
            }
          }}
          textColor={appColors.label}
          themeVariant="light"
        />
      )}
    </View>
  );
}
const nr = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingVertical: spacing.md, gap: spacing.md },
  iconBadge: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: 'rgba(59,130,246,0.12)', alignItems: 'center', justifyContent: 'center' },
  label: { ...typography.bodyEmphasis },
  sub:   { ...typography.footnote, marginTop: 2 },
  time:  { ...typography.bodyEmphasis },
});

// ─── Main SettingsSheet ───────────────────────────────────────────────────────
interface SettingsSheetProps { visible: boolean; onClose: () => void; }

export function SettingsSheet({ visible, onClose }: SettingsSheetProps) {
  const appColors = useAppColors();
  const insets = useSafeAreaInsets();
  const { activeTheme, setThemeId, fontSizeScale, setFontSizeScale } = useTheme();
  const { userColor } = useUserMode();
  const topInset = Platform.OS === 'ios' ? Math.max(insets.top, 12) : insets.top;

  // Slide-up spring
  const slideY = useRef(new Animated.Value(900)).current;
  // Staggered section entrances
  const prof   = useLeafEntrance(visible, 100);
  const cats   = useLeafEntrance(visible, 140);
  const autoDel = useLeafEntrance(visible, 180);
  const theme  = useLeafEntrance(visible, 200);
  const notif  = useLeafEntrance(visible, 280);
  const disp   = useLeafEntrance(visible, 340);

  useEffect(() => {
    if (visible) {
      Animated.spring(slideY, { toValue: 0, useNativeDriver: true, damping: 28, stiffness: 260, mass: 0.9 }).start();
    } else {
      Animated.spring(slideY, { toValue: 900, useNativeDriver: true, damping: 22, stiffness: 320 }).start();
    }
  }, [visible]);

  const patternEmoji = activeTheme.patternEmoji || '';

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose} />

      <Animated.View style={[s.sheet, { transform: [{ translateY: slideY }] }]}>
        {/* ── AC tiled background ──────────────────── */}
        <ACBackgroundStatic />

        <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
          {/* ── Glass header (extra top padding to clear Dynamic Island) ── */}
          <View style={[s.headerWrap, { paddingTop: topInset }]} pointerEvents="box-none">
            <LinearGradient
              colors={[hexToRgba(appColors.surface, 0.95), hexToRgba(appColors.surface, 0.88)]}
              style={StyleSheet.absoluteFill}
            />
            <View style={[s.headerBorder, { backgroundColor: appColors.separator }]} />

            {/* Floating decorative leaves */}
            {patternEmoji ? (
              <>
                <FloatingLeaf emoji={patternEmoji} x={60}  delay={0}    />
                <FloatingLeaf emoji={patternEmoji} x={200} delay={800}  />
                <FloatingLeaf emoji={patternEmoji} x={320} delay={400}  />
              </>
            ) : null}

            <View style={s.headerRow}>
              <View style={s.headerLeft}>
                <LinearGradient
                  colors={[appColors.gradientFrom, appColors.gradientTo]}
                  style={s.headerIconBadge}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="settings" size={18} color="#fff" />
                </LinearGradient>
                <Text style={[s.headerTitle, { color: appColors.label }]}>Settings</Text>
              </View>
              <Pressable onPress={onClose} style={[s.closeBtn, { backgroundColor: hexToRgba(userColor, 0.12) }]} hitSlop={8}>
                <Ionicons name="close" size={18} color={userColor} />
              </Pressable>
            </View>
          </View>

          <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

            {/* ── Your Profile ───────────────────────── */}
            <Animated.View style={{ opacity: prof.opacity, transform: [{ scale: prof.scale }, { translateY: prof.transY }] }}>
              <SectionHeader title="Your Profile" pattern={activeTheme.pattern} accentColors={[appColors.gradientFrom, appColors.gradientTo]} />
              <GlassCard style={s.cardMargin} accentColor={appColors.gradientFrom}>
                <ColorRow userId="adrian" label="Adrian" />
                <ColorRow userId="sarah"  label="Sarah" isLast />
              </GlassCard>
            </Animated.View>

            {/* ── Event categories (second so it’s visible without scrolling) ── */}
            <Animated.View style={{ opacity: cats.opacity, transform: [{ scale: cats.scale }, { translateY: cats.transY }] }}>
              <SectionHeader title="Event categories" emoji="📁" accentColors={[appColors.gradientFrom, appColors.gradientTo]} />
              <CategoriesSection />
            </Animated.View>

            {/* ── App Theme ──────────────────────────── */}
            <Animated.View style={{ opacity: theme.opacity, transform: [{ scale: theme.scale }, { translateY: theme.transY }] }}>
              <SectionHeader title="App Theme" accentColors={[appColors.gradientFrom, appColors.gradientTo]} />
              <ThemePicker selectedThemeId={activeTheme.id} onSelectTheme={id => setThemeId(id)} />
            </Animated.View>

            {/* ── Notifications ──────────────────────── */}
            <Animated.View style={{ opacity: notif.opacity, transform: [{ scale: notif.scale }, { translateY: notif.transY }] }}>
              <SectionHeader title="Notifications" accentColors={[appColors.gradientFrom, appColors.gradientTo]} />
              <GlassCard style={s.cardMargin} accentColor={appColors.gradientFrom}>
                <NotificationRow />
                <CategoryNotificationToggles />
              </GlassCard>
            </Animated.View>

            {/* ── Auto delete ────────────────────────── */}
            <Animated.View style={{ opacity: autoDel.opacity, transform: [{ scale: autoDel.scale }, { translateY: autoDel.transY }] }}>
              <AutoDeleteSection />
            </Animated.View>

            {/* ── Font size ───────────────────────────── */}
            <Animated.View style={{ opacity: disp.opacity, transform: [{ scale: disp.scale }, { translateY: disp.transY }] }}>
              <SectionHeader title="Display" accentColors={[appColors.gradientFrom, appColors.gradientTo]} />
              <GlassCard style={[s.cardMargin, { paddingVertical: spacing.md }]} accentColor={appColors.gradientFrom}>
                <Text style={[s.displayLabel, { color: appColors.labelSecondary }]}>Font Size</Text>
                <FontScalePicker value={fontSizeScale} onChange={v => setFontSizeScale(v)} />
              </GlassCard>
            </Animated.View>

            {/* ── About ──────────────────────────────── */}
            <Animated.View style={{ opacity: disp.opacity, transform: [{ scale: disp.scale }, { translateY: disp.transY }] }}>
              <SectionHeader title="About" accentColors={[appColors.gradientFrom, appColors.gradientTo]} />
              <GlassCard style={s.cardMargin}>
                <View style={s.aboutRow}>
                  <Text style={[s.aboutLabel, { color: appColors.label }]}>Pi Day</Text>
                  <Text style={[s.aboutVersion, { color: appColors.labelTertiary }]}>v1.0.0</Text>
                </View>
                <View style={[s.sep, { backgroundColor: appColors.separator }]} />
                <View style={s.aboutRow}>
                  <Text style={[s.aboutLabel, { color: appColors.label }]}>Made by Adrian & Sarah</Text>
                </View>
              </GlassCard>
            </Animated.View>

            <View style={{ height: spacing.xxxl * 3 }} />
          </ScrollView>
        </SafeAreaView>
      </Animated.View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.38)' },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    height: '88%',
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    overflow: 'hidden',
  },
  headerWrap: {
    position: 'relative',
    overflow: 'hidden',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.4)',
  },
  headerBorder: { position: 'absolute', bottom: 0, left: 0, right: 0, height: StyleSheet.hairlineWidth },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingTop: spacing.xs, paddingBottom: spacing.md,
    zIndex: 2,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerIconBadge: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...typography.title3 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingTop: spacing.sm, paddingBottom: spacing.xxxl },
  cardMargin: { marginHorizontal: spacing.xl },
  displayLabel: { ...typography.subhead, paddingHorizontal: spacing.xl, marginBottom: spacing.sm },
  aboutRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  aboutLabel: { ...typography.body },
  aboutVersion: { ...typography.body },
  sep: { height: StyleSheet.hairlineWidth, marginHorizontal: spacing.xl },
});

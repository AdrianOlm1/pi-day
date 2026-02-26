import React, { useState, useRef, useEffect } from 'react';
import {
  View, StyleSheet, ScrollView, Pressable,
  Platform, ActivityIndicator, Alert, LayoutAnimation,
  Animated, useWindowDimensions,
} from 'react-native';
import { ScaledText as Text } from '@/components/ui/ScaledText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { hapticLight } from '@/utils/haptics';
import { spacing, typography, radius, shadows, animation } from '@/theme';
import { useTheme, useAppColors } from '@/contexts/ThemeContext';
import { useUserMode } from '@/contexts/UserModeContext';
import { usePairing } from '@/contexts/PairingContext';
import { useProfile } from '@/hooks/useProfile';
import { SectionHeader } from './SectionHeader';
import { UserColorPicker } from './UserColorPicker';
import { ThemePicker } from './ThemePicker';
import { FontScalePicker } from './FontScalePicker';
import { CategoriesSection, CategoryNotificationToggles } from './CategoriesSection';
import { AutoDeleteSection } from './AutoDeleteSection';
import { ACBackgroundStatic } from '@/components/ui/ACBackground';
import { GlassCard } from '@/components/ui/GlassCard';
import { Sheet } from '@/components/ui/Sheet';
import type { UserId } from '@/types';
import { TextInput as RNTextInput } from 'react-native';

// ─── hex → rgba helper ────────────────────────────────────────────────────────
function hexToRgba(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16) || 0;
  const g = parseInt(h.slice(2, 4), 16) || 0;
  const b = parseInt(h.slice(4, 6), 16) || 0;
  return `rgba(${r},${g},${b},${a})`;
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
        placeholder="Display name"
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
  const { getUserColor, setUserColor, getUserName } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const color = getUserColor(userId);

  function toggleExpanded() {
    LayoutAnimation.configureNext(
      LayoutAnimation.create(260, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity)
    );
    hapticLight();
    setExpanded(e => !e);
  }

  return (
    <View>
      <Pressable onPress={toggleExpanded} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
        <View style={cr.row}>
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
          <View style={[cr.swatchPill, { backgroundColor: color }]} />
          <View style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}>
            <Ionicons name="chevron-down" size={16} color={appColors.labelTertiary} />
          </View>
        </View>
      </Pressable>

      {expanded && (
        <View>
          <UserColorPicker userId={userId} selectedColor={color} onSelectColor={hex => setUserColor(userId, hex)} />
          <NameInput userId={userId} currentName={getUserName(userId)} />
        </View>
      )}

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
      <Pressable
        onPress={() => {
          hapticLight();
          setShow(s => !s);
        }}
        style={({ pressed }) => [nr.row, { opacity: pressed ? 0.85 : 1 }]}
      >
        <View style={[nr.iconBadge, { backgroundColor: hexToRgba(appColors.gradientFrom, 0.12) }]}><Ionicons name="notifications-outline" size={20} color={appColors.labelSecondary} /></View>
        <View style={{ flex: 1 }}>
          <Text style={[nr.label, { color: appColors.label }]}>Daily Reminder</Text>
          <Text style={[nr.sub, { color: appColors.labelTertiary }]}>Goals & to-dos</Text>
        </View>
        <Text style={[nr.time, { color: appColors.labelSecondary }]}>{displayTime}</Text>
        <View style={{ transform: [{ rotate: show ? '180deg' : '0deg' }] }}>
          <Ionicons name="chevron-down" size={16} color={appColors.labelTertiary} />
        </View>
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
  iconBadge: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  label: { ...typography.bodyEmphasis },
  sub:   { ...typography.footnote, marginTop: 2 },
  time:  { ...typography.bodyEmphasis },
});

// ─── Settings screen content (shared by modal and tab) ─────────────────────────
export interface SettingsScreenContentProps {
  /** Show close button in header (e.g. when used in modal) */
  showCloseButton?: boolean;
  onClose?: () => void;
  /** Top padding for header (modal may use larger inset) */
  headerTopPadding?: number;
}

export function SettingsScreenContent({
  showCloseButton = false,
  onClose,
  headerTopPadding = spacing.md,
}: SettingsScreenContentProps) {
  const appColors = useAppColors();
  const { activeTheme, setThemeId, fontSizeScale, setFontSizeScale, getUserName } = useTheme();
  const { userColor, userId } = useUserMode();
  const { generateClaimCode, unpair } = usePairing();
  const [claimCode, setClaimCode] = useState<string | null>(null);
  const [claimLoading, setClaimLoading] = useState(false);

  function handleClose() {
    hapticLight();
    onClose?.();
  }

  async function handleGenerateClaim() {
    setClaimLoading(true);
    try {
      const code = await generateClaimCode();
      setClaimCode(code);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setClaimLoading(false);
    }
  }

  return (
    <>
      {/* 1px white cap so the top edge renders cleanly (no jagged seam with handle bar) */}
      <View style={s.headerTopCap} />
      {/* ── Header: no separate background so it reads as one strip with the sheet handle ── */}
      <View
        style={[
          s.headerWrap,
          {
            paddingTop: headerTopPadding,
            borderBottomColor: appColors.separator,
          },
        ]}
        pointerEvents="box-none"
      >
        <View style={[s.headerBorder, { backgroundColor: appColors.separator }]} />

        <View style={s.headerRow}>
          <View style={s.headerLeft}>
            <LinearGradient
              colors={[appColors.gradientFrom, appColors.gradientTo]}
              style={s.headerIconBadge}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="settings" size={18} color="#fff" />
            </LinearGradient>
            <View>
              <Text style={[s.headerTitle, { color: appColors.label }]}>Settings</Text>
              <Text style={[s.headerSubtitle, { color: appColors.labelTertiary }]}>
                Theme · {activeTheme.emoji ? `${activeTheme.emoji} ${activeTheme.name}` : activeTheme.name}
              </Text>
            </View>
          </View>
          {showCloseButton && (
            <Pressable
              onPress={handleClose}
              style={[s.closeBtn, { backgroundColor: hexToRgba(userColor, 0.14) }]}
              hitSlop={12}
            >
              <Ionicons name="close" size={18} color={userColor} />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
              {/* ── Look & feel (theme + font) ── */}
              <View>
                <SectionHeader
                  title="Look & feel"
                  accentColors={[appColors.gradientFrom, appColors.gradientTo]}
                />
                <GlassCard style={[s.cardMargin, { paddingVertical: spacing.md }]} accentColor={appColors.gradientFrom}>
                  <Text style={[s.displayLabel, { color: appColors.labelSecondary }]}>App theme</Text>
                  <ThemePicker selectedThemeId={activeTheme.id} onSelectTheme={id => setThemeId(id)} />
                  <View style={[s.sep, { backgroundColor: appColors.separator, marginTop: spacing.md }]} />
                  <Text style={[s.displayLabel, { color: appColors.labelSecondary }]}>Font size</Text>
                  <FontScalePicker value={fontSizeScale} onChange={v => setFontSizeScale(v)} />
                </GlassCard>
              </View>

              {/* ── Your Profile ───────────────────────── */}
              <View>
                <SectionHeader
                  title="Your profile"
                  pattern={activeTheme.pattern}
                  accentColors={[appColors.gradientFrom, appColors.gradientTo]}
                />
                <GlassCard style={s.cardMargin} accentColor={appColors.gradientFrom}>
                  <ColorRow userId="adrian" label={getUserName('adrian')} />
                  <ColorRow userId="sarah"  label={getUserName('sarah')} isLast />
                </GlassCard>
              </View>

              {/* ── Event categories ── */}
              <View>
                <SectionHeader
                  title="Event categories"
                  emoji="📁"
                  accentColors={[appColors.gradientFrom, appColors.gradientTo]}
                />
                <CategoriesSection />
              </View>

              {/* ── Notifications ──────────────────────── */}
              <View>
                <SectionHeader
                  title="Notifications"
                  accentColors={[appColors.gradientFrom, appColors.gradientTo]}
                />
                <GlassCard style={s.cardMargin} accentColor={appColors.gradientFrom}>
                  <NotificationRow />
                  <CategoryNotificationToggles />
                </GlassCard>
              </View>

              {/* ── Auto delete ────────────────────────── */}
              <View>
                <AutoDeleteSection />
              </View>

              {/* ── Device / Pairing ───────────────────── */}
              <View>
                <SectionHeader
                  title="Device"
                  accentColors={[appColors.gradientFrom, appColors.gradientTo]}
                />
                <GlassCard style={s.cardMargin}>
                  {/* Current role */}
                  <View style={s.aboutRow}>
                    <Text style={[s.aboutLabel, { color: appColors.label }]}>Your role</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: userColor }} />
                      <Text style={[s.aboutVersion, { color: appColors.label, fontWeight: '700' }]}>
                        {userId.charAt(0).toUpperCase() + userId.slice(1)}
                      </Text>
                    </View>
                  </View>
                  <View style={[s.sep, { backgroundColor: appColors.separator }]} />

                  {/* Replace this device */}
                  {claimCode ? (
                    <View style={{ gap: 6 }}>
                      <Text style={[s.aboutLabel, { color: appColors.label }]}>Claim code (10 min)</Text>
                      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, paddingVertical: 8 }}>
                        {claimCode.split('').map((ch, i) => (
                          <View
                            key={i}
                            style={{
                              width: 36,
                              height: 42,
                              borderRadius: 8,
                              backgroundColor: userColor + '18',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Text style={{ fontSize: 22, fontWeight: '900', color: userColor }}>{ch}</Text>
                          </View>
                        ))}
                      </View>
                      <Text style={[s.aboutVersion, { color: appColors.labelTertiary, textAlign: 'center' }]}>
                        Enter this on your new phone
                      </Text>
                      <Pressable onPress={() => setClaimCode(null)} style={{ alignSelf: 'center', marginTop: 4 }}>
                        <Text
                          style={{
                            fontSize: 13,
                            color: appColors.labelTertiary,
                            textDecorationLine: 'underline',
                          }}
                        >
                          Dismiss
                        </Text>
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable
                      onPress={handleGenerateClaim}
                      style={({ pressed }) => [s.aboutRow, s.replaceDeviceRow, { opacity: pressed ? 0.8 : 1 }]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <View
                          style={[
                            s.replaceDeviceIconWrap,
                            { backgroundColor: hexToRgba(appColors.gradientFrom, 0.12) },
                          ]}
                        >
                          <Ionicons name="phone-portrait-outline" size={18} color={appColors.gradientFrom} />
                        </View>
                        <Text style={[s.aboutLabel, { color: appColors.label }]}>Replace this device</Text>
                      </View>
                      {claimLoading ? (
                        <ActivityIndicator size="small" color={appColors.gradientFrom} />
                      ) : (
                        <Ionicons name="chevron-forward" size={16} color={appColors.labelTertiary} />
                      )}
                    </Pressable>
                  )}

                  <View style={[s.sep, { backgroundColor: appColors.separator }]} />
                  <Pressable
                    style={({ pressed }) => [s.aboutRow, s.replaceDeviceRow, { opacity: pressed ? 0.8 : 1 }]}
                    onPress={() => {
                      Alert.alert(
                        'Reset pairing?',
                        "You'll see the setup screen again. Tap \"I am the owner\" to get a new code for Sarah.",
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Reset',
                            style: 'destructive',
                            onPress: () => {
                              handleClose();
                              unpair();
                            },
                          },
                        ],
                      );
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View
                        style={[
                          s.replaceDeviceIconWrap,
                          { backgroundColor: hexToRgba('#EF4444', 0.12) },
                        ]}
                      >
                        <Ionicons name="link-outline" size={18} color="#EF4444" />
                      </View>
                      <Text style={[s.aboutLabel, { color: appColors.labelSecondary }]}>Reset pairing</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={appColors.labelTertiary} />
                  </Pressable>
                </GlassCard>
              </View>

              {/* ── About ──────────────────────────────── */}
              <View>
                <SectionHeader
                  title="About"
                  accentColors={[appColors.gradientFrom, appColors.gradientTo]}
                />
                <GlassCard style={s.cardMargin}>
                  <View style={s.aboutRow}>
                    <Text style={[s.aboutLabel, { color: appColors.label }]}>Sarian</Text>
                    <Text style={[s.aboutVersion, { color: appColors.labelTertiary }]}>v1.0.0</Text>
                  </View>
                  <View style={[s.sep, { backgroundColor: appColors.separator }]} />
                  <View style={s.aboutRow}>
                    <Text style={[s.aboutLabel, { color: appColors.label }]}>Made by Adrian & Sarah</Text>
                  </View>
                </GlassCard>
              </View>

              <View style={{ height: spacing.xxxl * 2 }} />
      </ScrollView>
    </>
  );
}

// ─── Sheet wrapper (same bottom sheet as calendar event form / AI flow) ────────
interface SettingsSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function SettingsSheet({ visible, onClose }: SettingsSheetProps) {
  const topInset = Platform.OS === 'ios' ? 14 : 10;

  function handleClose() {
    hapticLight();
    onClose();
  }

  return (
    <Sheet visible={visible} onClose={handleClose} heightFraction={0.88} scrollable={false} backgroundColor="#FFFFFF">
      <View style={s.sheetInner}>
        <SafeAreaView style={s.sheetSafe} edges={['bottom']}>
          <SettingsScreenContent
            showCloseButton
            onClose={handleClose}
            headerTopPadding={topInset}
          />
        </SafeAreaView>
      </View>
    </Sheet>
  );
}

const s = StyleSheet.create({
  sheetInner: { flex: 1, position: 'relative', backgroundColor: '#FFFFFF' },
  sheetSafe: { flex: 1 },
  sidebarPanel: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    ...shadows.lg,
  },
  headerTopCap: {
    height: 1,
    width: '100%',
    backgroundColor: '#FFFFFF',
  },
  headerWrap: {
    position: 'relative',
    borderBottomWidth: 1,
  },
  headerBorder: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 1 },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingTop: 8, paddingBottom: spacing.md,
    zIndex: 2,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  headerIconBadge: { width: 42, height: 42, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...typography.title3 },
  headerSubtitle: { ...typography.footnote, marginTop: 2 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingTop: spacing.md, paddingBottom: spacing.xxxl * 2 },
  cardMargin: { marginHorizontal: spacing.xl },
  displayLabel: { ...typography.subhead, paddingHorizontal: spacing.xl, marginBottom: spacing.sm },
  aboutRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  replaceDeviceRow: { paddingVertical: spacing.md },
  replaceDeviceIconWrap: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  aboutLabel: { ...typography.body },
  aboutVersion: { ...typography.body },
  sep: { height: StyleSheet.hairlineWidth, marginHorizontal: spacing.xl },
});

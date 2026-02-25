/**
 * AIImportScreen
 *
 * Self-contained AI import flow. Can be used:
 *  - Standalone (tab page): isModal=false (default)
 *  - Full-screen modal:     isModal=true, onClose={() => ...}
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Image, StyleSheet, ScrollView, ActivityIndicator, Animated, Pressable,
} from 'react-native';
import { ScaledText as Text } from '@/components/ui/ScaledText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useUserMode } from '@/contexts/UserModeContext';
import { useAppColors } from '@/contexts/ThemeContext';
import { useEvents } from '@/hooks/useEvents';
import { parseEventFile, isPdf } from '@/services/aiImport';
import { normalizeShiftDate } from '@/utils/date';
import { EditableEventList, toEditableEvents } from '@/components/ai-import/EditableEventList';
import type { EditableEvent } from '@/components/ai-import/EditableEventList';
import { UserToggle } from '@/components/ui/UserToggle';
import { Button } from '@/components/ui/Button';
import type { ImportSourceType } from '@/types';
import { EVENT_TYPE_COLORS } from '@/utils/colors';
import { spacing, typography, colors, radius, shadows } from '@/theme';

type Step = 'pick' | 'parsing' | 'confirm' | 'saving' | 'done';

// ─── Source type cards ────────────────────────────────────────────────────────

interface SourceOption {
  type: ImportSourceType;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
  accepts: string;
}

const SOURCE_OPTIONS: SourceOption[] = [
  {
    type: 'schedule',
    icon: 'calendar-outline',
    label: 'Work Schedule',
    description: 'Photo of a printed or digital shift schedule',
    accepts: 'photo',
  },
  {
    type: 'flyer',
    icon: 'document-text-outline',
    label: 'Flyer / PDF',
    description: 'Event poster, invite, or PDF with dates',
    accepts: 'photo or PDF',
  },
];

function SourceCard({
  option,
  selected,
  onSelect,
  accentColor,
}: {
  option: SourceOption;
  selected: boolean;
  onSelect: () => void;
  accentColor: string;
}) {
  return (
    <Pressable
      onPress={onSelect}
      style={[
        sc.card,
        selected && { borderColor: accentColor, borderWidth: 2, backgroundColor: accentColor + '08' },
      ]}
    >
      <View style={[sc.iconBadge, { backgroundColor: selected ? accentColor + '18' : colors.fillSecondary }]}>
        <Ionicons name={option.icon} size={22} color={selected ? accentColor : colors.labelSecondary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[sc.label, selected && { color: accentColor }]}>{option.label}</Text>
        <Text style={sc.desc}>{option.description}</Text>
        <Text style={[sc.accepts, { color: accentColor + 'AA' }]}>📎 {option.accepts}</Text>
      </View>
      {selected && (
        <View style={[sc.check, { backgroundColor: accentColor }]}>
          <Ionicons name="checkmark" size={12} color="#fff" />
        </View>
      )}
    </Pressable>
  );
}

const sc = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.separator,
    padding: spacing.md,
    ...shadows.xs,
  },
  iconBadge: {
    width: 44, height: 44, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  label: { ...typography.bodyEmphasis, color: colors.label },
  desc: { ...typography.footnote, color: colors.labelSecondary, marginTop: 2 },
  accepts: { ...typography.caption, marginTop: 4 },
  check: {
    width: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
});

// ─── StepDots ─────────────────────────────────────────────────────────────────

function StepDots({ current }: { current: Step }) {
  const { userColor } = useUserMode();
  const steps: Step[] = ['pick', 'parsing', 'confirm', 'done'];
  const currentIndex = steps.indexOf(current === 'saving' ? 'done' : current);
  return (
    <View style={dot.row}>
      {steps.map((s, i) => {
        const isActive = i <= currentIndex;
        return (
          <React.Fragment key={s}>
            {i > 0 && (
              <View style={[dot.line, isActive && { backgroundColor: userColor }]} />
            )}
            <View style={[dot.circle, isActive && { backgroundColor: userColor, borderColor: userColor }]}>
              {isActive && i < currentIndex && (
                <Ionicons name="checkmark" size={10} color="#fff" />
              )}
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
}

const dot = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: spacing.md, paddingHorizontal: spacing.xl,
    maxWidth: 280, alignSelf: 'center',
  },
  circle: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: colors.separator,
    backgroundColor: colors.fillSecondary,
    alignItems: 'center', justifyContent: 'center',
  },
  line: {
    flex: 1, maxWidth: 56, height: 2,
    backgroundColor: colors.separator, marginHorizontal: spacing.xs,
  },
});

// ─── PulsingRing ──────────────────────────────────────────────────────────────

function PulsingRing({ color }: { color: string }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale, { toValue: 1.35, duration: 900, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 900, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 1, duration: 0, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.6, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <View style={ring.wrap}>
      <Animated.View style={[ring.pulse, { backgroundColor: color + '30', transform: [{ scale }], opacity }]} />
      <View style={[ring.inner, { borderColor: color + '40' }]}>
        <ActivityIndicator size="large" color={color} />
      </View>
    </View>
  );
}

const ring = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', width: 100, height: 100 },
  pulse: { position: 'absolute', width: 100, height: 100, borderRadius: 50 },
  inner: {
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 1.5, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surface, ...shadows.sm,
  },
});

// ─── DoneState ────────────────────────────────────────────────────────────────

function DoneState({
  color,
  count,
  onReset,
  onClose,
}: { color: string; count: number; onReset: () => void; onClose?: () => void }) {
  const scale = useRef(new Animated.Value(0.6)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 14, stiffness: 200 }),
      Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[done.wrap, { opacity, transform: [{ scale }] }]}>
      <View style={[done.iconWrap, { backgroundColor: color + '16' }]}>
        <Ionicons name="checkmark-circle" size={56} color={color} />
      </View>
      <Text style={done.title}>
        {count === 1 ? '1 event imported!' : `${count} events imported!`}
      </Text>
      <Text style={done.sub}>
        Added to your calendar — they'll sync across both devices.
      </Text>
      {onClose ? (
        <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl }}>
          <Button title="Import more" onPress={onReset} color={color} variant="outline" size="md" style={{ flex: 1 }} />
          <Button title="Done" onPress={onClose} color={color} size="md" style={{ flex: 1 }} />
        </View>
      ) : (
        <Button
          title="Import more"
          onPress={onReset}
          color={color}
          size="lg"
          style={{ marginTop: spacing.xl, minWidth: 200 }}
        />
      )}
    </Animated.View>
  );
}

const done = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxxl, gap: spacing.md },
  iconWrap: { width: 104, height: 104, borderRadius: 52, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  title: { ...typography.title2, color: colors.label, textAlign: 'center' },
  sub: { ...typography.body, color: colors.labelSecondary, textAlign: 'center', lineHeight: 24 },
});

// ─── AIImportScreen ───────────────────────────────────────────────────────────

export interface AIImportScreenProps {
  /** When true: shows × close button in header */
  isModal?: boolean;
  /** Called when × is pressed (modal mode) */
  onClose?: () => void;
}

export function AIImportScreen({ isModal = false, onClose }: AIImportScreenProps) {
  const { userId, userColor } = useUserMode();
  const appColors = useAppColors();
  const { bulkInsertEvents, refresh: refreshEvents } = useEvents();

  const [step, setStep] = useState<Step>('pick');
  const [sourceType, setSourceType] = useState<ImportSourceType>('schedule');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isPdfFile, setIsPdfFile] = useState(false);
  const [events, setEvents] = useState<EditableEvent[]>([]);
  const [savedCount, setSavedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // ── Parse URI ───────────────────────────────────────────────────────────

  async function handleParseUri(uri: string) {
    setImageUri(uri);
    setError(null);
    setStep('parsing');
    try {
      const raw = await parseEventFile(uri, sourceType);
      if (raw.length === 0) {
        setError(
          sourceType === 'schedule'
            ? "Couldn't find any shifts. Try a clearer photo."
            : "Couldn't find any dates or events. Try a different image or PDF."
        );
        setStep('pick');
        return;
      }
      const normalized = raw.map(s => ({
        ...s,
        date: normalizeShiftDate(s.date),
        event_type: s.event_type ?? (sourceType === 'schedule' ? 'work' as const : 'personal' as const),
      }));
      setEvents(toEditableEvents(normalized));
      setStep('confirm');
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong');
      setStep('pick');
    }
  }

  async function pickCamera() {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.9,
      });
      if (result.canceled) return;
      setIsPdfFile(false);
      await handleParseUri(result.assets[0].uri);
    } catch (e: any) {
      setError(e.message ?? 'Camera error');
    }
  }

  async function pickLibraryImage() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.9,
      });
      if (result.canceled) return;
      setIsPdfFile(false);
      await handleParseUri(result.assets[0].uri);
    } catch (e: any) {
      setError(e.message ?? 'Library error');
    }
  }

  async function pickDocument() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      setIsPdfFile(isPdf(asset.uri));
      await handleParseUri(asset.uri);
    } catch (e: any) {
      setError(e.message ?? 'Document picker error');
    }
  }

  // ── Confirm ─────────────────────────────────────────────────────────────

  async function handleConfirm(selected: EditableEvent[]) {
    if (selected.length === 0) return;
    setStep('saving');
    try {
      const dbEvents = selected.map(s => {
        const all_day = s.all_day ?? false;
        const type = (s.event_type ?? (sourceType === 'schedule' ? 'work' : 'personal')) as any;
        const color = EVENT_TYPE_COLORS[type] ?? EVENT_TYPE_COLORS.personal;
        return {
          user_id: userId,
          title: s.title || (sourceType === 'schedule' ? 'Work Shift' : 'Event'),
          type,
          start_at: all_day
            ? new Date(`${s.date}T09:00:00`).toISOString()
            : new Date(`${s.date}T${s.start_time}:00`).toISOString(),
          end_at: all_day
            ? new Date(`${s.date}T10:00:00`).toISOString()
            : new Date(`${s.date}T${s.end_time}:00`).toISOString(),
          all_day,
          color,
          category_id: null as null,
          notes: s.notes ? `${s.notes}\n\nImported via AI` : 'Imported via AI',
          recurrence_id: null as null,
        };
      });
      await bulkInsertEvents(dbEvents);
      await refreshEvents();
      setSavedCount(selected.length);
      setStep('done');
    } catch (e: any) {
      setError(e.message ?? 'Failed to save events');
      setStep('confirm');
    }
  }

  function reset() {
    setStep('pick');
    setImageUri(null);
    setIsPdfFile(false);
    setEvents([]);
    setSavedCount(0);
    setError(null);
  }

  const analyzeLabel = sourceType === 'schedule' ? 'Analyzing schedule…' : 'Analyzing document…';
  const analyzeSub = sourceType === 'schedule' ? 'AI is reading your shift schedule' : 'AI is extracting dates and events';

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: appColors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: appColors.surface }]}>
        <View style={s.headerLeft}>
          <View style={[s.iconBadge, { backgroundColor: userColor + '14' }]}>
            <Ionicons name="sparkles" size={20} color={userColor} />
          </View>
          <Text style={s.title}>AI Import</Text>
        </View>
        {isModal ? (
          <Pressable
            onPress={onClose}
            hitSlop={12}
            style={[s.closeBtn, { backgroundColor: appColors.separator }]}
          >
            <Ionicons name="close" size={18} color={appColors.label} />
          </Pressable>
        ) : null}
      </View>

      {/* Step dots (not on confirm/done) */}
      {step !== 'confirm' && step !== 'done' && <StepDots current={step} />}

      {/* ── PICK ── */}
      {step === 'pick' && (
        <ScrollView contentContainerStyle={s.pickContent} showsVerticalScrollIndicator={false}>
          <View style={[s.introCard, { backgroundColor: appColors.surface }]}>
            <View style={[s.cardIconBadge, { backgroundColor: userColor + '14' }]}>
              <Ionicons name="sparkles" size={20} color={userColor} />
            </View>
            <Text style={s.pickHeading}>Smart event import</Text>
            <Text style={s.pickSub}>
              Photograph a work schedule or upload a flyer/PDF — AI extracts events, then you edit and confirm before anything is saved.
            </Text>
            {error ? (
              <View style={s.errorBox}>
                <Ionicons name="warning-outline" size={16} color="#92400E" />
                <Text style={s.errorText}>{error}</Text>
              </View>
            ) : null}
          </View>

          <Text style={s.sectionLabel}>What are you importing?</Text>
          <View style={s.sourceCards}>
            {SOURCE_OPTIONS.map(opt => (
              <SourceCard
                key={opt.type}
                option={opt}
                selected={sourceType === opt.type}
                onSelect={() => setSourceType(opt.type)}
                accentColor={userColor}
              />
            ))}
          </View>

          {imageUri && !isPdfFile ? (
            <View style={[s.previewCard, { backgroundColor: appColors.surface }]}>
              <Text style={s.sectionLabel}>Last image</Text>
              <Image source={{ uri: imageUri }} style={s.previewImage} resizeMode="contain" />
            </View>
          ) : null}

          <Text style={s.sectionLabel}>Choose source</Text>
          <View style={s.btnCol}>
            <Button title="Take a photo" onPress={pickCamera} color={userColor} size="lg" />
            <Button
              title="Choose image from library"
              onPress={pickLibraryImage}
              color={userColor}
              variant="outline"
              size="lg"
            />
            {sourceType === 'flyer' && (
              <Button
                title="Choose PDF or document"
                onPress={pickDocument}
                color={userColor}
                variant="tinted"
                size="lg"
              />
            )}
          </View>
          <View style={{ height: 60 }} />
        </ScrollView>
      )}

      {/* ── PARSING ── */}
      {step === 'parsing' && (
        <View style={s.centered}>
          {imageUri && !isPdfFile ? (
            <Image source={{ uri: imageUri }} style={s.thumbImage} resizeMode="cover" />
          ) : isPdfFile ? (
            <View style={[s.pdfThumb, { backgroundColor: userColor + '12' }]}>
              <Ionicons name="document-text" size={40} color={userColor} />
              <Text style={[s.pdfThumbLabel, { color: userColor }]}>PDF</Text>
            </View>
          ) : null}
          <PulsingRing color={userColor} />
          <Text style={s.statusTitle}>{analyzeLabel}</Text>
          <Text style={s.statusSub}>{analyzeSub}</Text>
        </View>
      )}

      {/* ── CONFIRM ── */}
      {step === 'confirm' && (
        <View style={s.confirmWrap}>
          <EditableEventList
            events={events}
            onEventsChange={setEvents}
            onConfirm={handleConfirm}
            onCancel={reset}
            accentColor={userColor}
          />
        </View>
      )}

      {/* ── SAVING ── */}
      {step === 'saving' && (
        <View style={s.centered}>
          <PulsingRing color={userColor} />
          <Text style={s.statusTitle}>Saving events…</Text>
          <Text style={s.statusSub}>Adding to your calendar</Text>
        </View>
      )}

      {/* ── DONE ── */}
      {step === 'done' && (
        <DoneState
          color={userColor}
          count={savedCount}
          onReset={reset}
          onClose={isModal ? onClose : undefined}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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
  closeBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },

  pickContent: { padding: spacing.lg, gap: spacing.md },
  introCard: { borderRadius: radius.xl, padding: spacing.xl, alignItems: 'center', gap: spacing.md, ...shadows.sm },
  cardIconBadge: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  pickHeading: { ...typography.title3, color: colors.label, textAlign: 'center' },
  pickSub: { ...typography.body, color: colors.labelSecondary, textAlign: 'center', lineHeight: 22 },

  errorBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    backgroundColor: '#FEF3C7', borderRadius: radius.sm, padding: spacing.md, width: '100%',
  },
  errorText: { flex: 1, color: '#92400E', fontSize: 13, lineHeight: 18 },

  sectionLabel: { ...typography.subhead, color: colors.labelSecondary },
  sourceCards: { gap: spacing.sm },

  previewCard: { borderRadius: radius.xl, padding: spacing.md, gap: spacing.sm, ...shadows.xs },
  previewImage: { width: '100%', height: 200, borderRadius: radius.lg, backgroundColor: colors.fillSecondary },

  btnCol: { gap: spacing.sm },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxxl, gap: spacing.lg },
  thumbImage: { width: 180, height: 120, borderRadius: radius.lg, backgroundColor: colors.fillSecondary },
  pdfThumb: { width: 90, height: 110, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  pdfThumbLabel: { ...typography.subhead },
  statusTitle: { ...typography.title3, color: colors.label, textAlign: 'center' },
  statusSub: { ...typography.body, color: colors.labelTertiary, textAlign: 'center' },

  confirmWrap: { flex: 1, padding: spacing.lg },
});

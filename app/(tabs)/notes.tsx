import React, { useCallback, useState, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  TextInput as RNTextInput,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  LayoutAnimation,
} from 'react-native';
import { ScaledText as Text } from '@/components/ui/ScaledText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUserMode } from '@/contexts/UserModeContext';
import { useAppColors } from '@/contexts/ThemeContext';
import { useNotes } from '@/hooks/useNotes';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import AnimatedReanimated, { FadeInDown } from 'react-native-reanimated';
import { EmptyState } from '@/components/ui/EmptyState';
import { EMPTY_NOTES } from '@/utils/emptyStateMessages';
import { getComfortLineForTab } from '@/utils/greetings';
import { hapticLight } from '@/utils/haptics';
import { spacing, typography, radius, colors } from '@/theme';
import type { Note } from '@/types';

function getStickyFontSizes(charCount: number) {
  const safeCount = Math.max(0, charCount);
  const steps = Math.min(4, Math.floor(safeCount / 80)); // 0–4
  const baseTitle = typography.bodyEmphasis.fontSize ?? 15;
  const baseBody = typography.footnote.fontSize ?? 12;
  const titleSize = Math.max(13, baseTitle - steps);
  const bodySize = Math.max(11, baseBody - steps);
  return { titleSize, bodySize };
}

function formatNoteDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const noteDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.floor((today.getTime() - noteDay.getTime()) / 86400000);
  if (diffDays === 0) {
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function NoteCard({
  note,
  onPress,
  accentColor,
  labelColor,
  secondaryColor,
}: {
  note: Note;
  onPress: () => void;
  accentColor: string;
  labelColor: string;
  secondaryColor: string;
}) {
  const bodyPreview = note.body?.trim().slice(0, 80);
  const showBody = bodyPreview && bodyPreview.length > 0;
  const title = note.title?.trim() || 'Untitled';
  const initialSource = title || note.body || '✦';
  const initial = initialSource.trim().charAt(0).toUpperCase() || '✦';
  const charCount = (title + ' ' + (note.body ?? '')).trim().length;
  const { titleSize, bodySize } = getStickyFontSizes(charCount);
  const stickyColor = '#FFF7C2';
  const foldColor = '#F2E39A';
  const hasFold = (note.id.length + initial.charCodeAt(0)) % 2 === 0;

  return (
    <Pressable
      onPress={() => {
        hapticLight();
        onPress();
      }}
      style={({ pressed }) => [cardStyles.wrap, pressed && { opacity: 0.88 }]}
    >
      <View style={[cardStyles.stickyOuter, { backgroundColor: stickyColor }]}>
        {hasFold && <View style={[cardStyles.cornerFold, { backgroundColor: foldColor }]} />}
        <View style={cardStyles.inner}>
          <View style={cardStyles.headerRow}>
            <View style={[cardStyles.avatar, { backgroundColor: accentColor + '26' }]}>
              <Text style={[cardStyles.avatarText, { color: accentColor }]}>{initial}</Text>
            </View>
            <Text style={[cardStyles.date, { color: secondaryColor }]}>
              {formatNoteDate(note.updated_at)}
            </Text>
          </View>
          <Text style={[cardStyles.title, { color: labelColor, fontSize: titleSize }]} numberOfLines={2}>
            {title}
          </Text>
          {showBody ? (
            <Text
              style={[
                cardStyles.body,
                {
                  color: secondaryColor,
                  fontSize: bodySize,
                  lineHeight: bodySize + 4,
                },
              ]}
              numberOfLines={4}
            >
              {bodyPreview}
              {note.body!.length > 80 ? '…' : ''}
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const cardStyles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  stickyOuter: {
    borderRadius: radius.lg,
    padding: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    position: 'relative',
    overflow: 'hidden',
  },
  cornerFold: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 22,
    height: 22,
    borderBottomLeftRadius: radius.sm,
    opacity: 0.9,
  },
  inner: { padding: spacing.lg },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  avatarText: {
    ...typography.caption,
    fontWeight: '700',
  },
  title: { ...typography.bodyEmphasis, marginBottom: spacing.xs },
  body: { ...typography.footnote, lineHeight: 18, marginTop: 2, opacity: 0.9 },
  date: { ...typography.caption, marginLeft: 'auto' },
});

interface EditNoteSheetProps {
  note: Note | null;
  visible: boolean;
  onClose: () => void;
  onSave: (id: string, title: string, body: string | null) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  accentColor: string;
  appColors: ReturnType<typeof useAppColors>;
}

function EditNoteSheet({ note, visible, onClose, onSave, onDelete, accentColor, appColors }: EditNoteSheetProps) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  React.useEffect(() => {
    if (note) {
      setTitle(note.title);
      setBody(note.body ?? '');
    }
  }, [note?.id, note?.title, note?.body]);

  const handleSave = async () => {
    if (!note) return;
    const t = title.trim() || 'Untitled';
    const b = body.trim() || null;
    setSaving(true);
    try {
      await onSave(note.id, t, b);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!note) return;
    setDeleting(true);
    try {
      await onDelete(note.id);
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  if (!note) return null;

  const charCount = (title + ' ' + body).trim().length;
  const { titleSize, bodySize } = getStickyFontSizes(charCount);

  return (
    <Sheet visible={visible} onClose={onClose} heightFraction={0.7}>
      <View style={sheetStyles.header}>
        <Text style={[sheetStyles.sheetTitle, { color: appColors.label }]}>Edit note</Text>
      </View>
      <View style={sheetStyles.stickyCard}>
        <View style={sheetStyles.stickyFold} />
        <RNTextInput
          style={[
            sheetStyles.input,
            sheetStyles.titleInput,
            {
              color: appColors.label,
              borderColor: 'transparent',
              backgroundColor: 'transparent',
              fontSize: titleSize,
            },
          ]}
          placeholder="Title"
          placeholderTextColor={appColors.labelTertiary}
          value={title}
          onChangeText={setTitle}
          selectionColor={accentColor}
        />
        <RNTextInput
          style={[
            sheetStyles.input,
            sheetStyles.bodyInput,
            {
              color: appColors.label,
              borderColor: 'transparent',
              backgroundColor: 'transparent',
              fontSize: bodySize,
            },
          ]}
          placeholder="Add more details…"
          placeholderTextColor={appColors.labelTertiary}
          value={body}
          onChangeText={setBody}
          multiline
          textAlignVertical="top"
          selectionColor={accentColor}
        />
      </View>
      <View style={sheetStyles.actions}>
        <Button
          title="Delete"
          onPress={handleDelete}
          disabled={deleting}
          variant="outline"
          color={appColors.destructive}
          style={[sheetStyles.deleteBtn, { borderColor: appColors.destructive }]}
          textStyle={{ color: appColors.destructive }}
        />
        <View style={sheetStyles.saveRow}>
          <Button title="Cancel" onPress={onClose} variant="ghost" color={appColors.labelSecondary} />
          <Button title={saving ? 'Saving…' : 'Save'} onPress={handleSave} disabled={saving} color={accentColor} />
        </View>
      </View>
    </Sheet>
  );
}

const sheetStyles = StyleSheet.create({
  header: { marginBottom: spacing.lg },
  sheetTitle: { ...typography.title3 },
  input: {
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 15,
    marginBottom: spacing.md,
  },
  titleInput: { minHeight: 44 },
  bodyInput: { minHeight: 120, paddingTop: spacing.md },
  actions: { marginTop: spacing.lg, gap: spacing.md },
  deleteBtn: { borderWidth: 1.5 },
  saveRow: { flexDirection: 'row', gap: spacing.md, justifyContent: 'flex-end' },
  stickyCard: {
    borderRadius: radius.lg,
    backgroundColor: '#FFF7C2',
    padding: spacing.lg,
    marginBottom: spacing.md,
    position: 'relative',
  },
  stickyFold: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 26,
    height: 26,
    backgroundColor: '#F2E39A',
    borderBottomLeftRadius: radius.sm,
  },
});

export default function NotesScreen() {
  const { userColor } = useUserMode();
  const appColors = useAppColors();
  const { notes, loading, error, refresh, addNote, editNote, removeNote } = useNotes();
  const [quickText, setQuickText] = useState('');
  const [adding, setAdding] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const [leftColumnNotes, rightColumnNotes] = React.useMemo(() => {
    const left: Note[] = [];
    const right: Note[] = [];
    notes.forEach((n, index) => {
      if (index % 2 === 0) {
        left.push(n);
      } else {
        right.push(n);
      }
    });
    return [left, right];
  }, [notes]);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const handleQuickSubmit = async () => {
    const t = quickText.trim();
    if (!t || adding) return;
    setAdding(true);
    try {
      await addNote(t, null);
      setQuickText('');
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    } finally {
      setAdding(false);
    }
  };

  const handleSaveEdit = useCallback(
    async (id: string, title: string, body: string | null) => {
      await editNote(id, { title, body });
    },
    [editNote],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await removeNote(id);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    },
    [removeNote],
  );

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: appColors.surface }]} edges={['top']}>
      <View style={[s.header, { borderBottomColor: appColors.separator }]}>
        <View style={[s.iconBadge, { backgroundColor: userColor + '18' }]}>
          <Ionicons name="document-text" size={20} color={userColor} />
        </View>
        <View>
          <Text style={[s.title, { color: appColors.label }]}>Notes</Text>
          <Text style={[s.headerComfort, { color: appColors.labelTertiary }]}>{getComfortLineForTab('notes', new Date().toISOString().slice(0, 10))}</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={[s.contentWrap, { backgroundColor: appColors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Sticky quick-add */}
        <View style={[s.quickAddWrap, { backgroundColor: appColors.surface, borderBottomColor: appColors.separator }]}>
          <View style={[s.quickAddInner, { backgroundColor: appColors.background, borderColor: appColors.separator }]}>
            <Ionicons name="add-circle-outline" size={22} color={appColors.labelTertiary} />
            <RNTextInput
              style={[s.quickAddInput, { color: appColors.label }]}
              placeholder="Add a note…"
              placeholderTextColor={appColors.labelTertiary}
              value={quickText}
              onChangeText={setQuickText}
              onSubmitEditing={handleQuickSubmit}
              returnKeyType="done"
              editable={!adding}
              selectionColor={userColor}
            />
            {quickText.trim().length > 0 && (
              <Pressable
                onPress={handleQuickSubmit}
                disabled={adding}
                style={[s.quickAddBtn, { backgroundColor: userColor }]}
              >
                <Text style={s.quickAddBtnText}>{adding ? '…' : 'Add'}</Text>
              </Pressable>
            )}
          </View>
        </View>

        {error ? (
          <View style={s.errorWrap}>
            <Text style={[s.errorText, { color: appColors.destructive }]}>{error}</Text>
          </View>
        ) : null}

        {loading ? (
          <View style={s.loadingBox}>
            <ActivityIndicator color={userColor} />
          </View>
        ) : notes.length === 0 ? (
          <EmptyState icon="document-text-outline" messages={EMPTY_NOTES} showComfortLine color={userColor} />
        ) : (
          <ScrollView
            ref={scrollRef}
            style={s.scroll}
            contentContainerStyle={s.list}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={false} onRefresh={refresh} tintColor={userColor} />
            }
          >
            <View style={s.listHeader}>
              <Text style={[s.listSummary, { color: appColors.labelSecondary }]}>
                {notes.length === 1
                  ? '1 note, neatly tucked.'
                  : `${notes.length} notes, beautifully stacked.`}
              </Text>
            </View>
            <View style={s.masonryColumns}>
              {[leftColumnNotes, rightColumnNotes].map((column, colIndex) => (
                <View key={colIndex} style={s.masonryColumn}>
                  {column.map((note, idx) => (
                    <AnimatedReanimated.View
                      key={note.id}
                      entering={FadeInDown.delay((idx + colIndex) * 60).duration(260)}
                    >
                      <NoteCard
                        note={note}
                        onPress={() => setSelectedNote(note)}
                        accentColor={userColor}
                        labelColor={appColors.label}
                        secondaryColor={appColors.labelSecondary}
                      />
                    </AnimatedReanimated.View>
                  ))}
                </View>
              ))}
            </View>
            <View style={{ height: 100 }} />
          </ScrollView>
        )}

        <EditNoteSheet
          note={selectedNote}
          visible={!!selectedNote}
          onClose={() => setSelectedNote(null)}
          onSave={handleSaveEdit}
          onDelete={handleDelete}
          accentColor={userColor}
          appColors={appColors}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  contentWrap: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  title: { ...typography.title3 },
  headerComfort: { ...typography.caption, fontStyle: 'italic', marginTop: 2 },
  quickAddWrap: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  quickAddInner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1.5,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  quickAddInput: {
    flex: 1,
    ...typography.body,
    paddingVertical: 6,
  },
  quickAddBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.md,
  },
  quickAddBtnText: { ...typography.subhead, color: '#fff', fontWeight: '700' },
  errorWrap: { padding: spacing.lg, alignItems: 'center' },
  errorText: { ...typography.footnote },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  list: { padding: spacing.lg },
  listHeader: {
    paddingBottom: spacing.md,
  },
  listSummary: {
    ...typography.footnote,
  },
  masonryColumns: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  masonryColumn: {
    flex: 1,
  },
});

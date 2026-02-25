/**
 * PairingScreen
 *
 * Shown on first launch (or after an unpair) when no pair is found.
 * Two flows:
 *   A) "This is my app" → creates a pair, shows a 5-char code for the partner
 *   B) "I have a code"  → enters the partner's 5-char code to join
 *   C) "New phone"      → enters the 6-char claim code from the old device
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View, StyleSheet, Pressable, TextInput, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ScaledText as Text } from '@/components/ui/ScaledText';
import { usePairing } from '@/contexts/PairingContext';
import { useAppColors } from '@/contexts/ThemeContext';
import { spacing, radius, typography, colors, shadows } from '@/theme';

type Screen = 'home' | 'create' | 'join' | 'claim';

export default function PairingScreen() {
  const appColors = useAppColors();
  const accent = appColors.gradientFrom;
  const { createPair, joinPair, claimDevice } = usePairing();
  const [screen, setScreen]     = useState<Screen>('home');
  const [pairCode, setPairCode] = useState('');     // shown after create
  const [input, setInput]       = useState('');     // user-typed code
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (screen !== 'home') {
      setInput('');
      setError(null);
      setTimeout(() => inputRef.current?.focus(), 350);
    }
  }, [screen]);

  // ── Create ─────────────────────────────────────────────────────────────────
  async function handleCreate() {
    setLoading(true);
    setError(null);
    try {
      const code = await createPair();
      setPairCode(code);
      setScreen('create');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // ── Join ───────────────────────────────────────────────────────────────────
  async function handleJoin() {
    if (input.trim().length < 5) return;
    setLoading(true);
    setError(null);
    try {
      await joinPair(input.trim());
      // PairingContext sets state='paired' — layout re-renders automatically
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  }

  // ── Claim (new phone) ──────────────────────────────────────────────────────
  async function handleClaim() {
    if (input.trim().length < 6) return;
    setLoading(true);
    setError(null);
    try {
      await claimDevice(input.trim());
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  }

  // ── Home screen ─────────────────────────────────────────────────────────────
  if (screen === 'home') {
    return (
      <SafeAreaView style={s.safe}>
        <ScrollView contentContainerStyle={s.center} showsVerticalScrollIndicator={false}>
          <View style={[s.logo, { backgroundColor: accent + '18' }]}>
            <Text style={s.logoEmoji}>π</Text>
          </View>
          <Text style={s.heading}>Welcome to Pi Day</Text>
          <Text style={s.sub}>
            This app is shared between two people.{'\n'}
            Set up your connection to get started.
          </Text>

          {error && <ErrorBox message={error} />}

          <Pressable
            onPress={loading ? undefined : handleCreate}
            style={[s.primaryBtn, { backgroundColor: accent }]}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Ionicons name="link-outline" size={20} color="#fff" />
                  <Text style={s.primaryBtnText}>This is my app</Text>
                </>
            }
          </Pressable>
          <Text style={s.btnHint}>Creates a code for your partner to scan</Text>

          <Pressable onPress={() => setScreen('join')} style={[s.secondaryBtn, { borderColor: accent }]}>
            <Ionicons name="enter-outline" size={18} color={accent} />
            <Text style={[s.secondaryBtnText, { color: accent }]}>I have a code</Text>
          </Pressable>

          <Pressable onPress={() => setScreen('claim')} style={s.ghostBtn}>
            <Text style={s.ghostBtnText}>New phone? Enter a claim code</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Create screen — show the generated code ─────────────────────────────────
  if (screen === 'create') {
    return (
      <SafeAreaView style={s.safe}>
        <ScrollView contentContainerStyle={s.center} showsVerticalScrollIndicator={false}>
          <View style={[s.logo, { backgroundColor: '#22C55E18' }]}>
            <Ionicons name="checkmark-circle" size={48} color="#22C55E" />
          </View>
          <Text style={s.heading}>You're set up!</Text>
          <Text style={s.sub}>
            Give this code to your partner.{'\n'}
            They'll enter it on their device.
          </Text>

          <View style={[s.codeBox, { borderColor: accent + '40', backgroundColor: accent + '08' }]}>
            {pairCode.split('').map((ch, i) => (
              <View key={i} style={[s.codeChar, { backgroundColor: accent + '18' }]}>
                <Text style={[s.codeCharText, { color: accent }]}>{ch}</Text>
              </View>
            ))}
          </View>

          <Text style={s.codeHint}>Code expires when your partner joins</Text>

          <View style={[s.infoBox, { backgroundColor: accent + '0C', borderColor: accent + '30' }]}>
            <Ionicons name="information-circle-outline" size={16} color={accent} />
            <Text style={[s.infoText, { color: accent }]}>
              Your role is <Text style={{ fontWeight: '800' }}>Adrian</Text>.{' '}
              Your partner will be <Text style={{ fontWeight: '800' }}>Sarah</Text>.
            </Text>
          </View>

          <Text style={s.waitingText}>Waiting for partner to join…</Text>
          <ActivityIndicator color={accent} style={{ marginTop: spacing.sm }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Join screen ─────────────────────────────────────────────────────────────
  if (screen === 'join') {
    return (
      <SafeAreaView style={s.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={s.center} keyboardShouldPersistTaps="handled">
            <Pressable onPress={() => setScreen('home')} style={s.backBtn}>
              <Ionicons name="chevron-back" size={20} color={colors.labelSecondary} />
              <Text style={s.backText}>Back</Text>
            </Pressable>

            <View style={[s.logo, { backgroundColor: accent + '18' }]}>
              <Ionicons name="enter-outline" size={40} color={accent} />
            </View>
            <Text style={s.heading}>Enter pair code</Text>
            <Text style={s.sub}>
              Ask your partner for their 5-character code.
            </Text>

            <TextInput
              ref={inputRef}
              style={[s.codeInput, { borderColor: input.length > 0 ? accent : colors.separator, color: colors.label }]}
              value={input}
              onChangeText={t => setInput(t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5))}
              placeholder="A3F9K"
              placeholderTextColor={colors.labelTertiary}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={5}
              returnKeyType="done"
              onSubmitEditing={handleJoin}
            />

            {error && <ErrorBox message={error} />}

            <Pressable
              onPress={handleJoin}
              disabled={input.trim().length < 5 || loading}
              style={[s.primaryBtn, { backgroundColor: accent, opacity: input.trim().length < 5 ? 0.4 : 1 }]}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <>
                    <Ionicons name="checkmark-outline" size={20} color="#fff" />
                    <Text style={s.primaryBtnText}>Join</Text>
                  </>
              }
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── Claim screen (new phone) ─────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.center} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => setScreen('home')} style={s.backBtn}>
            <Ionicons name="chevron-back" size={20} color={colors.labelSecondary} />
            <Text style={s.backText}>Back</Text>
          </Pressable>

          <View style={[s.logo, { backgroundColor: '#F59E0B18' }]}>
            <Ionicons name="phone-portrait-outline" size={40} color="#F59E0B" />
          </View>
          <Text style={s.heading}>New phone setup</Text>
          <Text style={s.sub}>
            On your old device, go to{'\n'}
            <Text style={{ fontWeight: '700' }}>Settings → Replace this device</Text>
            {'\n'}to get a 6-character claim code.
          </Text>

          <TextInput
            ref={inputRef}
            style={[s.codeInput, { borderColor: input.length > 0 ? '#F59E0B' : colors.separator, color: colors.label }]}
            value={input}
            onChangeText={t => setInput(t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
            placeholder="X7B2KP"
            placeholderTextColor={colors.labelTertiary}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={6}
            returnKeyType="done"
            onSubmitEditing={handleClaim}
          />

          {error && <ErrorBox message={error} />}

          <Pressable
            onPress={handleClaim}
            disabled={input.trim().length < 6 || loading}
            style={[s.primaryBtn, { backgroundColor: '#F59E0B', opacity: input.trim().length < 6 ? 0.4 : 1 }]}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Ionicons name="refresh-outline" size={20} color="#fff" />
                  <Text style={s.primaryBtnText}>Claim this device</Text>
                </>
            }
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <View style={s.errorBox}>
      <Ionicons name="alert-circle-outline" size={16} color="#EF4444" />
      <Text style={s.errorText}>{message}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: {
    flexGrow: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: spacing.xl, paddingVertical: spacing.xxxl, gap: spacing.sm,
  },
  logo: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  logoEmoji: { fontSize: 48, fontWeight: '900' },
  heading: { ...typography.title2, color: colors.label, textAlign: 'center' },
  sub: { ...typography.body, color: colors.labelSecondary, textAlign: 'center', lineHeight: 24, marginBottom: spacing.md },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, paddingVertical: spacing.md, paddingHorizontal: spacing.xl,
    borderRadius: radius.lg, width: '100%', marginTop: spacing.md,
    ...shadows.sm,
  },
  primaryBtnText: { ...typography.bodyEmphasis, color: '#fff' },
  btnHint: { ...typography.caption, color: colors.labelTertiary, marginTop: 4 },

  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, paddingVertical: spacing.md, paddingHorizontal: spacing.xl,
    borderRadius: radius.lg, borderWidth: 1.5, width: '100%', marginTop: spacing.sm,
  },
  secondaryBtnText: { ...typography.bodyEmphasis },

  ghostBtn: { marginTop: spacing.lg, paddingVertical: spacing.sm },
  ghostBtnText: { ...typography.subhead, color: colors.labelTertiary, textDecorationLine: 'underline' },

  codeBox: {
    flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.xl,
    borderWidth: 1, borderRadius: radius.xl, padding: spacing.lg,
  },
  codeChar: { width: 44, height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  codeCharText: { fontSize: 26, fontWeight: '900', letterSpacing: 1 },
  codeHint: { ...typography.caption, color: colors.labelTertiary },

  infoBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    borderWidth: 1, borderRadius: radius.lg, padding: spacing.md,
    marginTop: spacing.md, width: '100%',
  },
  infoText: { flex: 1, fontSize: 13, lineHeight: 20 },

  waitingText: { ...typography.subhead, color: colors.labelSecondary, marginTop: spacing.xl },

  codeInput: {
    width: '100%', borderWidth: 2, borderRadius: radius.lg,
    paddingVertical: spacing.md, paddingHorizontal: spacing.lg,
    fontSize: 32, fontWeight: '800', letterSpacing: 8,
    textAlign: 'center', backgroundColor: colors.fillSecondary,
    marginVertical: spacing.lg,
  },

  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginBottom: spacing.lg },
  backText: { ...typography.subhead, color: colors.labelSecondary },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: '#EF444412', borderRadius: radius.sm,
    padding: spacing.sm, width: '100%',
  },
  errorText: { flex: 1, fontSize: 13, color: '#EF4444' },
});

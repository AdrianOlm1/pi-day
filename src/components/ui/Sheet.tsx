import React, { useEffect, useRef, useMemo } from 'react';
import {
  Modal,
  View,
  Pressable,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  PanResponder,
} from 'react-native';
import { radius } from '@/theme';

const { height: SCREEN_H } = Dimensions.get('window');
const DRAG_CLOSE_THRESHOLD = 60;
const DRAG_VELOCITY_THRESHOLD = 0.25;

interface SheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  heightFraction?: number;
}

export function Sheet({ visible, onClose, children, heightFraction = 0.6 }: SheetProps) {
  const translateY = useRef(new Animated.Value(SCREEN_H)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const dragOffset = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      dragOffset.setValue(0);
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 1, duration: 320, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 28, stiffness: 160, mass: 1.1 }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: SCREEN_H, duration: 260, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 5,
        onPanResponderMove: (_, g) => {
          if (g.dy > 0) dragOffset.setValue(g.dy);
        },
        onPanResponderRelease: (_, g) => {
          const shouldClose = g.dy > DRAG_CLOSE_THRESHOLD || g.vy > DRAG_VELOCITY_THRESHOLD;
          if (shouldClose) {
            Animated.parallel([
              Animated.timing(translateY, { toValue: SCREEN_H, duration: 220, useNativeDriver: true }),
              Animated.timing(dragOffset, { toValue: 0, duration: 220, useNativeDriver: true }),
            ]).start(() => onClose());
          } else {
            Animated.spring(dragOffset, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 300 }).start();
          }
        },
      }),
    [onClose, translateY, dragOffset]
  );

  const sheetTransform = useMemo(
    () => [{ translateY: Animated.add(translateY, dragOffset) }],
    [translateY, dragOffset]
  );

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity.interpolate({ inputRange: [0,1], outputRange: [0,0.45] }) }]} />
      </Pressable>
      <Animated.View style={[styles.sheet, { height: SCREEN_H * heightFraction, transform: sheetTransform }]}>
        <View style={styles.handleBar} {...panResponder.panHandlers}>
          <View style={styles.handle} />
        </View>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12, shadowRadius: 24, elevation: 20,
  },
  handleBar: { alignItems: 'center', paddingTop: 12, paddingBottom: 6 },
  handle: { width: 32, height: 4, borderRadius: 2, backgroundColor: 'rgba(0,0,0,0.12)' },
  content: { padding: 24, paddingBottom: 52 },
});

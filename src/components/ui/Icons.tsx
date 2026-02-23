import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import type { StyleProp, TextStyle } from 'react-native';

type IconName = keyof typeof Ionicons.glyphMap;

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
}

export function Icon({ name, size = 24, color = '#1C1C1E', style }: IconProps) {
  return <Ionicons name={name} size={size} color={color} style={style} />;
}

export const TabIcons = {
  Today: { active: 'home' as IconName, inactive: 'home-outline' as IconName },
  Calendar: { active: 'calendar' as IconName, inactive: 'calendar-outline' as IconName },
  Todos: { active: 'checkmark-done-circle' as IconName, inactive: 'checkmark-done-circle-outline' as IconName },
  Orders: { active: 'reader' as IconName, inactive: 'reader-outline' as IconName },
  Import: { active: 'camera' as IconName, inactive: 'camera-outline' as IconName },
};

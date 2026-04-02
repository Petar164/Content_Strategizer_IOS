import React from 'react';
import { View, Text, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface BadgeProps {
  label: string;
  color?: string;
  textColor?: string;
  style?: ViewStyle;
}

export function Badge({ label, color, textColor, style }: BadgeProps) {
  const { colors, accent } = useTheme();
  const bg = color ?? `${accent}22`;
  const fg = textColor ?? accent;

  return (
    <View
      style={[
        {
          backgroundColor: bg,
          borderRadius: 6,
          paddingHorizontal: 8,
          paddingVertical: 3,
          alignSelf: 'flex-start',
        },
        style,
      ]}
    >
      <Text style={{ fontSize: 11, fontWeight: '600', color: fg, letterSpacing: 0.3 }}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

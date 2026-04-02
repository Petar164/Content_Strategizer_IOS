import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface ButtonProps {
  onPress: () => void;
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  onPress,
  label,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  textStyle,
}: ButtonProps) {
  const { colors, accent, darkMode } = useTheme();

  const bgColor = {
    primary: accent,
    secondary: colors.surface,
    ghost: 'transparent',
    danger: colors.danger,
  }[variant];

  const textColor = {
    primary: darkMode ? '#0F0F0D' : '#FAFAF9',
    secondary: colors.text,
    ghost: colors.text,
    danger: '#FFFFFF',
  }[variant];

  const borderColor = {
    primary: 'transparent',
    secondary: colors.border,
    ghost: 'transparent',
    danger: 'transparent',
  }[variant];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
      style={[
        {
          backgroundColor: bgColor,
          borderRadius: 12,
          paddingVertical: 14,
          paddingHorizontal: 20,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor,
          minHeight: 50,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text
          style={[
            { color: textColor, fontSize: 16, fontWeight: '600', letterSpacing: -0.3 },
            textStyle,
          ]}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

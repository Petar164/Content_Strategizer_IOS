import React from 'react';
import { TextInput, Text, View, TextInputProps, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

export function Input({ label, error, containerStyle, style, ...props }: InputProps) {
  const { colors } = useTheme();
  return (
    <View style={[{ marginBottom: 12 }, containerStyle]}>
      {label && (
        <Text
          style={{
            fontSize: 13,
            fontWeight: '600',
            color: colors.textSecondary,
            marginBottom: 6,
            letterSpacing: 0.2,
            textTransform: 'uppercase',
          }}
        >
          {label}
        </Text>
      )}
      <TextInput
        placeholderTextColor={colors.textTertiary}
        style={[
          {
            backgroundColor: colors.inputBg,
            borderRadius: 10,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontSize: 16,
            color: colors.text,
            borderWidth: 1,
            borderColor: error ? colors.danger : colors.border,
            minHeight: 48,
          },
          style,
        ]}
        {...props}
      />
      {error && (
        <Text style={{ fontSize: 12, color: colors.danger, marginTop: 4 }}>{error}</Text>
      )}
    </View>
  );
}

import React from 'react';
import { View, Text } from 'react-native';
import { Card } from './Card';
import { useTheme } from '@/hooks/useTheme';

interface MetricCardProps {
  label: string;
  value: string | number | null | undefined;
  sub?: string;
}

export function MetricCard({ label, value, sub }: MetricCardProps) {
  const { colors } = useTheme();
  const display = value == null ? '—' : String(value);

  return (
    <Card style={{ flex: 1, minWidth: 100 }}>
      <Text
        style={{
          fontSize: 11,
          fontWeight: '600',
          color: colors.textSecondary,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          marginBottom: 6,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontSize: 26,
          fontWeight: '700',
          color: colors.text,
          letterSpacing: -0.5,
        }}
      >
        {display}
      </Text>
      {sub && (
        <Text style={{ fontSize: 12, color: colors.textTertiary, marginTop: 2 }}>{sub}</Text>
      )}
    </Card>
  );
}

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/hooks/useTheme';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function LoginScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      Alert.alert('Login Failed', error.message);
    }
    // Navigation handled by root layout via auth state change
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, padding: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ flex: 1, justifyContent: 'center', maxWidth: 400, alignSelf: 'center', width: '100%' }}>
            {/* Logo / Brand */}
            <View style={{ marginBottom: 48 }}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '700',
                  letterSpacing: 4,
                  textTransform: 'uppercase',
                  color: colors.textSecondary,
                  marginBottom: 8,
                }}
              >
                FASHIONVOID
              </Text>
              <Text
                style={{
                  fontSize: 32,
                  fontWeight: '700',
                  color: colors.text,
                  letterSpacing: -1,
                }}
              >
                Strategizer
              </Text>
              <Text style={{ fontSize: 15, color: colors.textSecondary, marginTop: 6 }}>
                Your archive fashion strategy engine
              </Text>
            </View>

            <Input
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <Input
              label="Password"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
            />

            <Button
              onPress={handleLogin}
              label="Sign In"
              loading={loading}
              style={{ marginTop: 8 }}
            />

            <TouchableOpacity
              onPress={() => router.push('/(auth)/register')}
              style={{ marginTop: 20, alignItems: 'center', padding: 8 }}
            >
              <Text style={{ color: colors.textSecondary, fontSize: 15 }}>
                No account?{' '}
                <Text style={{ color: colors.text, fontWeight: '600' }}>Create one</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

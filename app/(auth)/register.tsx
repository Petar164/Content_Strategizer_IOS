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

export default function RegisterScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    setLoading(false);

    if (error) {
      Alert.alert('Registration Failed', error.message);
      return;
    }

    if (data.user) {
      // Create initial profile row
      await supabase.from('user_profile').insert({
        user_id: data.user.id,
        onboarding_complete: false,
        dark_mode: false,
        accent_color: 'mono',
      });
      // Navigation handled by root layout via auth state change → onboarding
    }
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
                Create Account
              </Text>
              <Text style={{ fontSize: 15, color: colors.textSecondary, marginTop: 6 }}>
                Get started with your strategy engine
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
              placeholder="At least 6 characters"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <Input
              label="Confirm Password"
              placeholder="Same as above"
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
            />

            <Button
              onPress={handleRegister}
              label="Create Account"
              loading={loading}
              style={{ marginTop: 8 }}
            />

            <TouchableOpacity
              onPress={() => router.back()}
              style={{ marginTop: 20, alignItems: 'center', padding: 8 }}
            >
              <Text style={{ color: colors.textSecondary, fontSize: 15 }}>
                Already have an account?{' '}
                <Text style={{ color: colors.text, fontWeight: '600' }}>Sign in</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

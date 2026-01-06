import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { colors } from '@/constants/colors';
import { signInWithEmail } from '@/lib/supabase';
import { useToast } from '@/context/ToastContext';
import { parseError, ErrorType } from '@/lib/errors';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showError } = useToast();

  const handleSignIn = async () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setError('Please enter your email');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: signInError } = await signInWithEmail(trimmedEmail);

      if (signInError) {
        const appError = parseError(signInError);

        // Handle rate limiting specifically
        if (appError.type === ErrorType.RATE_LIMIT) {
          setError('Too many attempts. Please wait a moment and try again.');
        } else if (appError.type === ErrorType.NETWORK) {
          setError("Can't connect. Please check your internet and try again.");
          showError(appError, handleSignIn);
        } else {
          setError(appError.message);
        }
      } else {
        setSent(true);
      }
    } catch (err) {
      const appError = parseError(err);
      setError(appError.message);
      if (appError.retryable) {
        showError(appError, handleSignIn);
      }
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.slime}>🫧</Text>
          <Text style={styles.title}>Check your email!</Text>
          <Text style={styles.subtitle}>
            We sent a magic link to{'\n'}
            <Text style={styles.email}>{email}</Text>
          </Text>
          <Text style={styles.hint}>
            Click the link in your email to sign in
          </Text>
          <Pressable
            style={styles.backButton}
            onPress={() => {
              setSent(false);
              setEmail('');
            }}
          >
            <Text style={styles.backButtonText}>Use different email</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text style={styles.slime}>🫧</Text>
        <Text style={styles.title}>Squish</Text>
        <Text style={styles.tagline}>Your AI coaching companion</Text>

        <View style={styles.form}>
          <TextInput
            style={[styles.input, error && styles.inputError]}
            placeholder="Enter your email"
            placeholderTextColor={colors.textLight}
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (error) setError(null);
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            editable={!loading}
            onSubmitEditing={handleSignIn}
            returnKeyType="go"
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignIn}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <Text style={styles.buttonText}>Send Magic Link</Text>
            )}
          </Pressable>
        </View>

        <Text style={styles.footer}>
          No password needed — we'll email you a sign-in link
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  slime: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 18,
    color: colors.textLight,
    marginBottom: 48,
  },
  form: {
    width: '100%',
    maxWidth: 320,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    color: colors.text,
    borderWidth: 2,
    borderColor: colors.mint,
  },
  inputError: {
    borderColor: '#E74C3C',
  },
  error: {
    color: '#E74C3C',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  button: {
    backgroundColor: colors.mint,
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  footer: {
    fontSize: 14,
    color: colors.textLight,
    marginTop: 24,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 26,
  },
  email: {
    fontWeight: '600',
    color: colors.text,
  },
  hint: {
    fontSize: 14,
    color: colors.textLight,
    marginTop: 24,
  },
  backButton: {
    marginTop: 32,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  backButtonText: {
    fontSize: 16,
    color: colors.mint,
    fontWeight: '600',
  },
});

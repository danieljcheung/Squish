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
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/fonts';
import { signInWithEmail } from '@/lib/supabase';
import { useToast } from '@/context/ToastContext';
import { parseError, ErrorType } from '@/lib/errors';
import { Slime } from '@/components/slime';

// Slime Mascot using unified component
const SlimeMascot = () => {
  return (
    <View style={styles.slimeContainer}>
      <Slime color="mint" type="base" size="large" animated />
    </View>
  );
};

// Water drop icon
const WaterDropIcon = () => (
  <Svg width={32} height={32} viewBox="0 0 24 24" fill={colors.primary}>
    <Path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0L12 2.69z" />
  </Svg>
);

// Mail icon
const MailIcon = ({ color = colors.textMuted }: { color?: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <Path d="m22 6-10 7L2 6" />
  </Svg>
);

// Arrow icon
const ArrowIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth={2.5}>
    <Path d="M5 12h14M12 5l7 7-7 7" />
  </Svg>
);

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const { showError } = useToast();

  const handleSignIn = async () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setError('Please enter your email');
      return;
    }

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
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.backgroundGradients}>
          <View style={[styles.gradientBlob, styles.topLeftBlob]} />
          <View style={[styles.gradientBlob, styles.bottomRightBlob]} />
        </View>
        <View style={styles.content}>
          <View style={styles.card}>
            <View style={[styles.cardBlob, styles.cardTopRightBlob]} />
            <View style={[styles.cardBlob, styles.cardBottomLeftBlob]} />
            <View style={styles.cardContent}>
              <SlimeMascot />
              <View style={styles.titleContainer}>
                <Text style={styles.title}>Check your email!</Text>
                <Text style={styles.subtitle}>
                  We sent a magic link to{'\n'}
                  <Text style={styles.emailHighlight}>{email}</Text>
                </Text>
              </View>
              <Text style={styles.hint}>
                Click the link in your email to sign in
              </Text>
              <Pressable
                style={styles.secondaryButton}
                onPress={() => {
                  setSent(false);
                  setEmail('');
                }}
              >
                <Text style={styles.secondaryButtonText}>Use different email</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Background gradient blobs */}
      <View style={styles.backgroundGradients}>
        <View style={[styles.gradientBlob, styles.topLeftBlob]} />
        <View style={[styles.gradientBlob, styles.bottomRightBlob]} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          {/* Main card */}
          <View style={styles.card}>
            {/* Card gradient decorations */}
            <View style={[styles.cardBlob, styles.cardTopRightBlob]} />
            <View style={[styles.cardBlob, styles.cardBottomLeftBlob]} />

            <View style={styles.cardContent}>
              {/* Slime mascot */}
              <SlimeMascot />

              {/* Title section */}
              <View style={styles.titleContainer}>
                <View style={styles.logoRow}>
                  <WaterDropIcon />
                  <Text style={styles.logoText}>Squish</Text>
                </View>
                <Text style={styles.welcomeText}>Welcome back to your Squad!</Text>
              </View>

              {/* Email input */}
              <View style={styles.inputContainer}>
                <View style={[
                  styles.inputWrapper,
                  isFocused && styles.inputWrapperFocused,
                  error && styles.inputWrapperError,
                ]}>
                  <View style={styles.inputIcon}>
                    <MailIcon color={isFocused ? colors.primary : `${colors.textMuted}80`} />
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your email"
                    placeholderTextColor={`${colors.textMuted}80`}
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
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                  />
                </View>
                {error && <Text style={styles.errorText}>{error}</Text>}
              </View>

              {/* Submit button */}
              <Pressable
                style={({ pressed }) => [
                  styles.submitButton,
                  loading && styles.submitButtonDisabled,
                  pressed && !loading && styles.submitButtonPressed,
                ]}
                onPress={handleSignIn}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.text} />
                ) : (
                  <>
                    <Text style={styles.submitButtonText}>Continue with Email</Text>
                    <ArrowIcon />
                  </>
                )}
              </Pressable>

            </View>
          </View>

          {/* Terms */}
          <Text style={styles.termsText}>
            By continuing, you agree to our{' '}
            <Text style={styles.termsLink}>Terms</Text> and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  backgroundGradients: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  gradientBlob: {
    position: 'absolute',
    borderRadius: 9999,
  },
  topLeftBlob: {
    top: '-10%',
    left: '-20%',
    width: '80%',
    height: '40%',
    backgroundColor: `${colors.primary}33`, // 20% opacity
    transform: [{ scale: 1.5 }],
  },
  bottomRightBlob: {
    bottom: '-10%',
    right: '-20%',
    width: '80%',
    height: '40%',
    backgroundColor: colors.blueAccent,
    transform: [{ scale: 1.5 }],
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 32,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
    overflow: 'hidden',
  },
  cardBlob: {
    position: 'absolute',
    borderRadius: 9999,
  },
  cardTopRightBlob: {
    top: -80,
    right: -80,
    width: 240,
    height: 240,
    backgroundColor: `${colors.primary}33`,
  },
  cardBottomLeftBlob: {
    bottom: -80,
    left: -80,
    width: 160,
    height: 160,
    backgroundColor: colors.blueAccent,
  },
  cardContent: {
    alignItems: 'center',
    zIndex: 10,
  },
  // Slime mascot
  slimeContainer: {
    marginBottom: 40,
    position: 'relative',
  },
  // Title section
  titleContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  logoText: {
    fontSize: 30,
    fontFamily: fonts.extraBold,
    color: colors.text,
    letterSpacing: -0.5,
  },
  welcomeText: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },
  title: {
    fontSize: 30,
    fontFamily: fonts.extraBold,
    color: colors.text,
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 24,
  },
  emailHighlight: {
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
  hint: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    marginTop: 24,
    marginBottom: 32,
  },
  // Input
  inputContainer: {
    width: '100%',
    marginBottom: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  inputWrapperFocused: {
    borderColor: colors.primary,
  },
  inputWrapperError: {
    borderColor: '#E74C3C',
  },
  inputIcon: {
    paddingLeft: 20,
    paddingRight: 4,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    paddingRight: 16,
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.text,
  },
  errorText: {
    color: '#E74C3C',
    fontSize: 13,
    fontFamily: fonts.medium,
    marginTop: 8,
    marginLeft: 4,
  },
  // Submit button
  submitButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonPressed: {
    backgroundColor: colors.primaryDark,
    transform: [{ scale: 0.98 }],
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
  // Secondary button
  secondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: colors.primary,
  },
  // Terms
  termsText: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 24,
    paddingHorizontal: 32,
  },
  termsLink: {
    fontFamily: fonts.medium,
    color: colors.textMuted,
    textDecorationLine: 'underline',
  },
});

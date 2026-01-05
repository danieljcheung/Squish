import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Link } from 'expo-router';
import { colors } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';

export default function HomeScreen() {
  const { user, signOut } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.slime}>🫧</Text>
      <Text style={styles.title}>Welcome to Squish!</Text>
      <Text style={styles.subtitle}>Your AI coaching companion</Text>

      {user && (
        <Text style={styles.email}>Signed in as {user.email}</Text>
      )}

      <View style={styles.actions}>
        <Link href="/create" asChild>
          <Pressable style={styles.button}>
            <Text style={styles.buttonText}>+ Create Agent</Text>
          </Pressable>
        </Link>

        <Link href="/chat/test-agent" asChild>
          <Pressable style={[styles.button, styles.secondaryButton]}>
            <Text style={styles.secondaryButtonText}>Test Chat</Text>
          </Pressable>
        </Link>
      </View>

      <Pressable style={styles.signOutButton} onPress={signOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 20,
  },
  slime: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textLight,
    marginTop: 8,
  },
  email: {
    fontSize: 14,
    color: colors.textLight,
    marginTop: 16,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  actions: {
    marginTop: 32,
    gap: 12,
  },
  button: {
    backgroundColor: colors.mint,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.mint,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  signOutButton: {
    position: 'absolute',
    bottom: 48,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  signOutText: {
    fontSize: 16,
    color: colors.textLight,
  },
});

import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Link } from 'expo-router';
import { colors } from '@/constants/colors';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hello World - Home</Text>
      <Text style={styles.subtitle}>Agent Hub</Text>

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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textLight,
    marginTop: 8,
  },
  actions: {
    marginTop: 32,
    gap: 12,
  },
  button: {
    backgroundColor: colors.mint,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.mint,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
});

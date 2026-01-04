import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, Link } from 'expo-router';
import { Pressable } from 'react-native';
import { colors } from '@/constants/colors';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hello World - Chat</Text>
      <Text style={styles.subtitle}>Agent ID: {id}</Text>

      <Link href={`/settings/${id}`} asChild>
        <Pressable style={styles.button}>
          <Text style={styles.buttonText}>Agent Settings</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
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
  button: {
    marginTop: 24,
    backgroundColor: colors.lavender,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
});

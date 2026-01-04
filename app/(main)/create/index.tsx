import { View, Text, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/colors';

export default function CreateAgentScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hello World - Create Agent</Text>
      <Text style={styles.subtitle}>Onboarding Interview</Text>

      <Pressable
        style={styles.button}
        onPress={() => router.back()}
      >
        <Text style={styles.buttonText}>Close</Text>
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
    backgroundColor: colors.peach,
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

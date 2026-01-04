import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/constants/colors';

export default function LoginScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hello World - Login</Text>
      <Text style={styles.subtitle}>Sign in to Squish</Text>
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
});

import { Stack } from 'expo-router';
import { colors } from '@/constants/colors';
import { animation } from '@/constants/theme';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'fade',
        animationDuration: animation.normal,
      }}
    />
  );
}

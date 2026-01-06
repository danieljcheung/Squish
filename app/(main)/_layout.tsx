import { Stack } from 'expo-router';
import { colors } from '@/constants/colors';

export default function MainLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="chat/[id]"
        options={{
          title: 'Chat',
        }}
      />
      <Stack.Screen
        name="create/index"
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="settings/[id]"
        options={{
          title: 'Settings',
        }}
      />
    </Stack>
  );
}

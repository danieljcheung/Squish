import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { savePushToken, deletePushToken } from './supabase';

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Register for push notifications and save token to Supabase
 */
export async function registerForPushNotificationsAsync(
  userId: string
): Promise<string | null> {
  let token: string | null = null;

  // Set up Android notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#B8E8D0',
    });

    await Notifications.setNotificationChannelAsync('morning-checkin', {
      name: 'Morning Check-ins',
      description: 'Daily morning motivation from your fitness coach',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#B8E8D0',
    });
  }

  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Failed to get push token for push notification');
    return null;
  }

  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;

    // Check if projectId is valid (not placeholder)
    const isValidProjectId = projectId &&
      projectId !== 'your-project-id' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId);

    if (!isValidProjectId) {
      console.warn(
        'EAS projectId not configured. Run "npx eas init" to set up push notifications.\n' +
        'Push notifications will not work until projectId is configured in app.json'
      );
      return null;
    }

    token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;

    // Save token to Supabase
    const platform = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
    const { error } = await savePushToken(userId, token, platform);

    if (error) {
      console.error('Failed to save push token:', error);
    } else {
      console.log('Push token saved successfully:', token);
    }
  } catch (error) {
    console.error('Error getting push token:', error);
    return null;
  }

  return token;
}

/**
 * Unregister push token (e.g., on logout)
 */
export async function unregisterPushToken(): Promise<void> {
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;

    await deletePushToken(token);
    console.log('Push token removed');
  } catch (error) {
    console.error('Error unregistering push token:', error);
  }
}

/**
 * Get the user's timezone
 */
export function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Default notification settings for a new fitness agent
 */
export function getDefaultNotificationSettings() {
  return {
    notifications_enabled: true,
    morning_checkin: {
      enabled: true,
      time: { hour: 8, minute: 0 },
    },
    meal_reminders: false,
    workout_reminders: {
      enabled: false,
      days: [1, 3, 5], // Mon, Wed, Fri
      time: { hour: 18, minute: 0 },
    },
    timezone: getUserTimezone(),
  };
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Add listeners for notification events
 */
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
) {
  return Notifications.addNotificationReceivedListener(callback);
}

export function addNotificationResponseReceivedListener(
  callback: (response: Notifications.NotificationResponse) => void
) {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import {
  registerForPushNotificationsAsync,
  unregisterPushToken,
  addNotificationReceivedListener,
  addNotificationResponseReceivedListener,
} from '@/lib/notifications';

interface NotificationData {
  agentId?: string;
  type?: string;
}

export function useNotifications(userId: string | undefined) {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<string | null>(null);

  const notificationListener = useRef<Notifications.EventSubscription>();
  const responseListener = useRef<Notifications.EventSubscription>();

  // Register for push notifications
  const registerForNotifications = useCallback(async () => {
    if (!userId) return null;

    const token = await registerForPushNotificationsAsync(userId);
    setExpoPushToken(token);

    // Check permission status
    const { status } = await Notifications.getPermissionsAsync();
    setPermissionStatus(status);

    return token;
  }, [userId]);

  // Unregister on logout
  const unregisterNotifications = useCallback(async () => {
    await unregisterPushToken();
    setExpoPushToken(null);
  }, []);

  // Set up notification listeners
  useEffect(() => {
    // Listen for notifications received while app is foregrounded
    notificationListener.current = addNotificationReceivedListener((notification) => {
      setNotification(notification);
      console.log('Notification received:', notification);
    });

    // Listen for user interactions with notifications
    responseListener.current = addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as NotificationData;
      console.log('Notification tapped:', data);

      // Navigate based on notification type
      if (data?.type === 'combined_weekly_summary') {
        router.push('/combined-summary');
      } else if (data?.agentId) {
        router.push(`/chat/${data.agentId}`);
      }
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  // Auto-register when userId becomes available
  useEffect(() => {
    if (userId && !expoPushToken) {
      registerForNotifications();
    }
  }, [userId, expoPushToken, registerForNotifications]);

  return {
    expoPushToken,
    notification,
    permissionStatus,
    registerForNotifications,
    unregisterNotifications,
    isRegistered: !!expoPushToken,
    isSupported: Platform.OS !== 'web',
  };
}

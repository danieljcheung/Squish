import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { fonts } from '@/constants/fonts';
import { spacing, radius } from '@/constants/theme';
import { deleteUserAccountData } from '@/lib/supabase';
import { triggerHaptic } from '@/lib/haptics';
import Constants from 'expo-constants';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const { isDarkMode, toggleTheme, colors } = useTheme();
  const { showSuccess, showError } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const appVersion = Constants.expoConfig?.version || '1.0.0';

  // Format member since date
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      })
    : 'Unknown';

  const handleLogout = () => {
    triggerHaptic('light');
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        onPress: async () => {
          setIsLoggingOut(true);
          try {
            await signOut();
            showSuccess('Logged out successfully');
          } catch (error) {
            showError('Failed to log out');
          } finally {
            setIsLoggingOut(false);
          }
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    triggerHaptic('warning');
    Alert.alert(
      'Delete Account?',
      'This will permanently delete your account and all data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // Second confirmation
            Alert.alert(
              'Are you absolutely sure?',
              'All your agents, messages, and progress will be permanently deleted.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, Delete Everything',
                  style: 'destructive',
                  onPress: async () => {
                    setIsDeleting(true);
                    try {
                      const { error } = await deleteUserAccountData();
                      if (error) {
                        showError('Failed to delete account');
                        console.error('Delete account error:', error);
                      } else {
                        await signOut();
                        showSuccess('Account deleted successfully');
                      }
                    } catch (error) {
                      showError('Failed to delete account');
                      console.error('Delete account error:', error);
                    } finally {
                      setIsDeleting(false);
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const handleToggleTheme = () => {
    triggerHaptic('light');
    toggleTheme();
  };

  const handleNotifyMe = () => {
    triggerHaptic('light');
    showSuccess('We\'ll notify you when Premium launches!');
  };

  const handleOpenLink = (url: string) => {
    triggerHaptic('light');
    Linking.openURL(url);
  };

  const styles = createStyles(colors);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable
          onPress={() => {
            triggerHaptic('light');
            router.back();
          }}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Profile</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        {/* User Info Card */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.userInfo}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarText}>
                {user?.email?.charAt(0).toUpperCase() || '?'}
              </Text>
            </View>
            <Text style={[styles.userEmail, { color: colors.text }]}>
              {user?.email || 'No email'}
            </Text>
            <Text style={[styles.memberSince, { color: colors.textMuted }]}>
              Member since {memberSince}
            </Text>
          </View>
        </View>

        {/* Appearance Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>APPEARANCE</Text>
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Ionicons name="moon-outline" size={22} color={colors.text} />
                <Text style={[styles.settingLabel, { color: colors.text }]}>Dark Mode</Text>
              </View>
              <Switch
                value={isDarkMode}
                onValueChange={handleToggleTheme}
                trackColor={{ false: '#d1d5db', true: colors.primary }}
                thumbColor="#ffffff"
              />
            </View>
          </View>
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>NOTIFICATIONS</Text>
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Ionicons name="notifications-outline" size={22} color={colors.text} />
                <Text style={[styles.settingLabel, { color: colors.text }]}>Push Notifications</Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: '#d1d5db', true: colors.primary }}
                thumbColor="#ffffff"
              />
            </View>
            <View style={styles.settingNote}>
              <Text style={[styles.noteText, { color: colors.textMuted }]}>
                More notification settings coming soon
              </Text>
            </View>
          </View>
        </View>

        {/* Subscription Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>SUBSCRIPTION</Text>
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <View style={styles.subscriptionInfo}>
              <View style={styles.planRow}>
                <View style={[styles.planBadge, { backgroundColor: `${colors.primary}30` }]}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                  <Text style={[styles.planText, { color: colors.text }]}>Free Plan</Text>
                </View>
              </View>

              <View style={styles.premiumTeaser}>
                <Text style={[styles.premiumTitle, { color: colors.text }]}>
                  Premium Coming Soon
                </Text>
                <Text style={[styles.premiumDescription, { color: colors.textMuted }]}>
                  Unlock advanced insights, unlimited agents, and more
                </Text>
                <Pressable
                  style={[styles.notifyButton, { backgroundColor: colors.primary }]}
                  onPress={handleNotifyMe}
                >
                  <Ionicons name="notifications" size={18} color="#101914" />
                  <Text style={styles.notifyButtonText}>Notify Me</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>ACCOUNT</Text>
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Pressable
              style={styles.actionRow}
              onPress={handleLogout}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? (
                <ActivityIndicator size="small" color={colors.text} />
              ) : (
                <>
                  <Ionicons name="log-out-outline" size={22} color={colors.text} />
                  <Text style={[styles.actionLabel, { color: colors.text }]}>Log Out</Text>
                </>
              )}
            </Pressable>
            <View style={[styles.separator, { backgroundColor: colors.background }]} />
            <Pressable
              style={styles.actionRow}
              onPress={handleDeleteAccount}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#ef4444" />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={22} color="#ef4444" />
                  <Text style={[styles.actionLabel, { color: '#ef4444' }]}>Delete Account</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>ABOUT</Text>
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <View style={styles.aboutRow}>
              <Text style={[styles.aboutLabel, { color: colors.text }]}>App Version</Text>
              <Text style={[styles.aboutValue, { color: colors.textMuted }]}>{appVersion}</Text>
            </View>
            <View style={[styles.separator, { backgroundColor: colors.background }]} />
            <Pressable
              style={styles.aboutRow}
              onPress={() => handleOpenLink('https://squish.app/terms')}
            >
              <Text style={[styles.aboutLabel, { color: colors.text }]}>Terms of Service</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </Pressable>
            <View style={[styles.separator, { backgroundColor: colors.background }]} />
            <Pressable
              style={styles.aboutRow}
              onPress={() => handleOpenLink('https://squish.app/privacy')}
            >
              <Text style={[styles.aboutLabel, { color: colors.text }]}>Privacy Policy</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </Pressable>
            <View style={[styles.separator, { backgroundColor: colors.background }]} />
            <Pressable
              style={styles.aboutRow}
              onPress={() => handleOpenLink('mailto:support@squish.app')}
            >
              <Text style={[styles.aboutLabel, { color: colors.text }]}>Contact Support</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
    },
    backButton: {
      width: 44,
      height: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 18,
      fontFamily: fonts.bold,
    },
    headerRight: {
      width: 44,
    },
    content: {
      flex: 1,
    },
    contentContainer: {
      paddingHorizontal: spacing.lg,
      gap: spacing.lg,
    },
    card: {
      borderRadius: radius.lg,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 1,
    },
    section: {
      gap: spacing.sm,
    },
    sectionTitle: {
      fontSize: 12,
      fontFamily: fonts.semiBold,
      letterSpacing: 0.5,
      marginLeft: spacing.sm,
    },
    // User Info
    userInfo: {
      alignItems: 'center',
      paddingVertical: spacing.xl,
      paddingHorizontal: spacing.lg,
    },
    avatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    avatarText: {
      fontSize: 32,
      fontFamily: fonts.bold,
      color: '#101914',
    },
    userEmail: {
      fontSize: 16,
      fontFamily: fonts.semiBold,
      marginBottom: spacing.xs,
    },
    memberSince: {
      fontSize: 13,
      fontFamily: fonts.regular,
    },
    // Settings Row
    settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    settingLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    settingLabel: {
      fontSize: 16,
      fontFamily: fonts.medium,
    },
    settingNote: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
    },
    noteText: {
      fontSize: 13,
      fontFamily: fonts.regular,
      fontStyle: 'italic',
    },
    // Subscription
    subscriptionInfo: {
      padding: spacing.lg,
    },
    planRow: {
      marginBottom: spacing.lg,
    },
    planBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      alignSelf: 'flex-start',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.md,
    },
    planText: {
      fontSize: 14,
      fontFamily: fonts.semiBold,
    },
    premiumTeaser: {
      alignItems: 'center',
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.background,
    },
    premiumTitle: {
      fontSize: 16,
      fontFamily: fonts.bold,
      marginBottom: spacing.xs,
    },
    premiumDescription: {
      fontSize: 13,
      fontFamily: fonts.regular,
      textAlign: 'center',
      marginBottom: spacing.lg,
    },
    notifyButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      borderRadius: radius.md,
    },
    notifyButtonText: {
      fontSize: 14,
      fontFamily: fonts.bold,
      color: '#101914',
    },
    // Action Row
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    actionLabel: {
      fontSize: 16,
      fontFamily: fonts.medium,
    },
    separator: {
      height: 1,
      marginHorizontal: spacing.lg,
    },
    // About
    aboutRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    aboutLabel: {
      fontSize: 16,
      fontFamily: fonts.medium,
    },
    aboutValue: {
      fontSize: 14,
      fontFamily: fonts.regular,
    },
  });

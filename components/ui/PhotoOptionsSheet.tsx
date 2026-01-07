import { View, Text, Pressable, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/fonts';
import { spacing } from '@/constants/theme';

interface PhotoOptionsSheetProps {
  visible: boolean;
  onCamera: () => void | Promise<void>;
  onLibrary: () => void | Promise<void>;
  onClose: () => void;
}

export function PhotoOptionsSheet({
  visible,
  onCamera,
  onLibrary,
  onClose,
}: PhotoOptionsSheetProps) {
  const insets = useSafeAreaInsets();

  const handleCameraPress = async () => {
    console.log('PhotoOptionsSheet: Camera button pressed, calling onCamera...');
    try {
      await onCamera();
      console.log('PhotoOptionsSheet: onCamera completed');
    } catch (err) {
      console.error('PhotoOptionsSheet: onCamera error:', err);
    }
  };

  const handleLibraryPress = async () => {
    console.log('PhotoOptionsSheet: Library button pressed, calling onLibrary...');
    try {
      await onLibrary();
      console.log('PhotoOptionsSheet: onLibrary completed');
    } catch (err) {
      console.error('PhotoOptionsSheet: onLibrary error:', err);
    }
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.handle} />

          <Text style={styles.title}>Log a Meal</Text>
          <Text style={styles.subtitle}>
            Take a photo of your meal for nutrition analysis
          </Text>

          <View style={styles.optionsContainer}>
            <Pressable
              style={({ pressed }) => [
                styles.option,
                pressed && styles.optionPressed,
              ]}
              onPress={handleCameraPress}
            >
              <View style={styles.optionIcon}>
                <Ionicons name="camera" size={28} color={colors.text} />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Take Photo</Text>
                <Text style={styles.optionDescription}>
                  Use your camera to capture the meal
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.option,
                pressed && styles.optionPressed,
              ]}
              onPress={handleLibraryPress}
            >
              <View style={styles.optionIcon}>
                <Ionicons name="images" size={28} color={colors.text} />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Choose from Library</Text>
                <Text style={styles.optionDescription}>
                  Select an existing photo
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </Pressable>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.cancelButton,
              pressed && styles.cancelButtonPressed,
            ]}
            onPress={onClose}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.textMuted,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.xl,
    opacity: 0.3,
  },
  title: {
    fontSize: 22,
    fontFamily: fonts.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  optionsContainer: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: 20,
    gap: spacing.lg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  optionPressed: {
    backgroundColor: colors.primary,
    transform: [{ scale: 0.98 }],
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${colors.primary}40`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
  optionDescription: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    marginTop: 2,
  },
  cancelButton: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.lg,
    borderRadius: 16,
    alignItems: 'center',
  },
  cancelButtonPressed: {
    backgroundColor: `${colors.textMuted}20`,
  },
  cancelText: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: colors.textMuted,
  },
});

import { View, Text, Pressable, StyleSheet, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/fonts';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';

interface PhotoOptionsSheetProps {
  visible: boolean;
  onCamera: () => void | Promise<void>;
  onLibrary: () => void | Promise<void>;
  onClose: () => void;
  notes: string;
  onNotesChange: (notes: string) => void;
}

export function PhotoOptionsSheet({
  visible,
  onCamera,
  onLibrary,
  onClose,
  notes,
  onNotesChange,
}: PhotoOptionsSheetProps) {
  const insets = useSafeAreaInsets();
  const { colors: themeColors } = useTheme();

  const handleCameraPress = async () => {
    console.log('PhotoOptionsSheet: Camera pressed');
    try {
      await onCamera();
      console.log('PhotoOptionsSheet: onCamera completed');
    } catch (err) {
      console.error('PhotoOptionsSheet: onCamera error:', err);
    }
  };

  const handleLibraryPress = async () => {
    console.log('PhotoOptionsSheet: Library pressed');
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
          style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg, backgroundColor: themeColors.background }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[styles.handle, { backgroundColor: themeColors.textMuted }]} />

          <Text style={[styles.title, { color: themeColors.text }]}>Log a Meal</Text>
          <Text style={[styles.subtitle, { color: themeColors.textMuted }]}>
            Take a photo of your meal for nutrition analysis
          </Text>

          {/* Notes Input */}
          <View style={[styles.notesContainer, { backgroundColor: themeColors.surface }]}>
            <TextInput
              style={[styles.notesInput, { color: themeColors.text }]}
              placeholder="Add notes (optional): 'ate half', '200g chicken', 'no dressing'..."
              placeholderTextColor={themeColors.textMuted}
              value={notes}
              onChangeText={onNotesChange}
              multiline
              numberOfLines={2}
            />
          </View>

          <View style={styles.optionsContainer}>
            <Pressable
              style={({ pressed }) => [
                styles.option,
                { backgroundColor: themeColors.surface },
                pressed && { backgroundColor: themeColors.primary, transform: [{ scale: 0.98 }] },
              ]}
              onPress={handleCameraPress}
            >
              <View style={[styles.optionIcon, { backgroundColor: `${themeColors.primary}40` }]}>
                <Ionicons name="camera" size={28} color={themeColors.text} />
              </View>
              <View style={styles.optionContent}>
                <Text style={[styles.optionTitle, { color: themeColors.text }]}>Take Photo</Text>
                <Text style={[styles.optionDescription, { color: themeColors.textMuted }]}>
                  Use your camera to capture the meal
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={themeColors.textMuted} />
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.option,
                { backgroundColor: themeColors.surface },
                pressed && { backgroundColor: themeColors.primary, transform: [{ scale: 0.98 }] },
              ]}
              onPress={handleLibraryPress}
            >
              <View style={[styles.optionIcon, { backgroundColor: `${themeColors.primary}40` }]}>
                <Ionicons name="images" size={28} color={themeColors.text} />
              </View>
              <View style={styles.optionContent}>
                <Text style={[styles.optionTitle, { color: themeColors.text }]}>Choose from Library</Text>
                <Text style={[styles.optionDescription, { color: themeColors.textMuted }]}>
                  Select an existing photo
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={themeColors.textMuted} />
            </Pressable>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.cancelButton,
              { backgroundColor: themeColors.surface },
              pressed && { backgroundColor: `${themeColors.textMuted}20` },
            ]}
            onPress={onClose}
          >
            <Text style={[styles.cancelText, { color: themeColors.textMuted }]}>Cancel</Text>
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
    marginBottom: spacing.lg,
  },
  notesContainer: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  notesInput: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.text,
    minHeight: 50,
    textAlignVertical: 'top',
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

import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/fonts';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';

interface PhotoOptionsSheetProps {
  visible: boolean;
  onCamera: (notes?: string) => void | Promise<void>;
  onLibrary: (notes?: string) => void | Promise<void>;
  onClose: () => void;
}

export function PhotoOptionsSheet({
  visible,
  onCamera,
  onLibrary,
  onClose,
}: PhotoOptionsSheetProps) {
  const insets = useSafeAreaInsets();
  const { colors: themeColors } = useTheme();
  const [notes, setNotes] = useState('');

  const handleCameraPress = async () => {
    console.log('PhotoOptionsSheet: Camera button pressed, calling onCamera...');
    try {
      await onCamera(notes.trim() || undefined);
      setNotes(''); // Clear notes after use
      console.log('PhotoOptionsSheet: onCamera completed');
    } catch (err) {
      console.error('PhotoOptionsSheet: onCamera error:', err);
    }
  };

  const handleLibraryPress = async () => {
    console.log('PhotoOptionsSheet: Library button pressed, calling onLibrary...');
    try {
      await onLibrary(notes.trim() || undefined);
      setNotes(''); // Clear notes after use
      console.log('PhotoOptionsSheet: onLibrary completed');
    } catch (err) {
      console.error('PhotoOptionsSheet: onLibrary error:', err);
    }
  };

  const handleClose = () => {
    setNotes(''); // Clear notes on close
    onClose();
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.overlay} onPress={handleClose}>
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
              onChangeText={setNotes}
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
            onPress={handleClose}
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

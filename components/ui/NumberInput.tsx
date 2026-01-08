import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/fonts';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';

interface NumberInputProps {
  value: string;
  onChangeValue: (value: string) => void;
  placeholder?: string;
  label?: string;
  prefix?: string;
  unit?: {
    options: string[];
    selected: string;
    onSelect: (unit: string) => void;
  };
  validation?: {
    min?: number;
    max?: number;
  };
}

export function NumberInput({
  value,
  onChangeValue,
  placeholder,
  label,
  prefix,
  unit,
  validation,
}: NumberInputProps) {
  const { colors: themeColors } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChangeText = (text: string) => {
    // Only allow numbers and decimal point
    const sanitized = text.replace(/[^0-9.]/g, '');
    onChangeValue(sanitized);

    // Validate
    if (validation && sanitized) {
      const num = parseFloat(sanitized);
      if (validation.min !== undefined && num < validation.min) {
        setError(`Minimum is ${validation.min}`);
      } else if (validation.max !== undefined && num > validation.max) {
        setError(`Maximum is ${validation.max}`);
      } else {
        setError(null);
      }
    } else {
      setError(null);
    }
  };

  return (
    <View style={styles.container}>
      {label && <Text style={[styles.label, { color: themeColors.textMuted }]}>{label}</Text>}

      <View style={styles.inputRow}>
        <View
          style={[
            styles.inputWrapper,
            { backgroundColor: themeColors.surface },
            isFocused && { borderColor: themeColors.primary },
            error && styles.inputWrapperError,
          ]}
        >
          <View style={styles.inputInner}>
            {prefix && (
              <Text style={[styles.prefix, { color: themeColors.textMuted }]}>{prefix}</Text>
            )}
            <TextInput
              style={[styles.input, { color: themeColors.text }, prefix && styles.inputWithPrefix]}
              value={value}
              onChangeText={handleChangeText}
              placeholder={placeholder}
              placeholderTextColor={themeColors.textMuted}
              keyboardType="numeric"
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
            />
          </View>
        </View>

        {unit && (
          <View style={[styles.unitToggle, { backgroundColor: themeColors.surface }]}>
            {unit.options.map((option) => (
              <Pressable
                key={option}
                style={[
                  styles.unitButton,
                  unit.selected === option && { backgroundColor: themeColors.primary },
                ]}
                onPress={() => unit.onSelect(option)}
              >
                <Text
                  style={[
                    styles.unitButtonText,
                    { color: themeColors.textMuted },
                    unit.selected === option && { color: '#101914', fontFamily: fonts.bold },
                  ]}
                >
                  {option}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  inputWrapperFocused: {
    borderColor: colors.primary,
  },
  inputWrapperError: {
    borderColor: '#FF6B6B',
  },
  inputInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  prefix: {
    fontSize: 18,
    fontFamily: fonts.medium,
    paddingLeft: spacing.xl,
  },
  input: {
    fontSize: 18,
    fontFamily: fonts.medium,
    color: colors.text,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    textAlign: 'center',
    flex: 1,
  },
  inputWithPrefix: {
    paddingLeft: spacing.sm,
  },
  unitToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 4,
  },
  unitButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 10,
  },
  unitButtonSelected: {
    backgroundColor: colors.primary,
  },
  unitButtonText: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },
  unitButtonTextSelected: {
    color: colors.text,
    fontFamily: fonts.bold,
  },
  errorText: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: '#FF6B6B',
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});

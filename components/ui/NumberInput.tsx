import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/fonts';
import { spacing } from '@/constants/theme';

interface NumberInputProps {
  value: string;
  onChangeValue: (value: string) => void;
  placeholder?: string;
  label?: string;
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
  unit,
  validation,
}: NumberInputProps) {
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
      {label && <Text style={styles.label}>{label}</Text>}

      <View style={styles.inputRow}>
        <View
          style={[
            styles.inputWrapper,
            isFocused && styles.inputWrapperFocused,
            error && styles.inputWrapperError,
          ]}
        >
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={handleChangeText}
            placeholder={placeholder}
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
        </View>

        {unit && (
          <View style={styles.unitToggle}>
            {unit.options.map((option) => (
              <Pressable
                key={option}
                style={[
                  styles.unitButton,
                  unit.selected === option && styles.unitButtonSelected,
                ]}
                onPress={() => unit.onSelect(option)}
              >
                <Text
                  style={[
                    styles.unitButtonText,
                    unit.selected === option && styles.unitButtonTextSelected,
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
    width: '100%',
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
  input: {
    fontSize: 18,
    fontFamily: fonts.medium,
    color: colors.text,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    textAlign: 'center',
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

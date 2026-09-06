import { useState } from 'react';
import { StyleSheet, Text, TextInput, View, type KeyboardTypeOptions } from 'react-native';

import { colors, radii, spacing, typography } from '@/theme';

interface AuthInputProps {
  readonly label: string;
  readonly value: string;
  readonly onChangeText: (text: string) => void;
  readonly placeholder?: string;
  readonly secureTextEntry?: boolean;
  readonly keyboardType?: KeyboardTypeOptions;
  readonly autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  readonly error?: string | null;
}

export function AuthInput({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  error,
}: AuthInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const borderColor = error ? colors.danger : isFocused ? colors.cyan : colors.line;

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={[styles.input, { borderColor }]}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { color: colors.silver, fontSize: typography.label, fontWeight: '800', letterSpacing: 0.6 },
  input: {
    color: colors.white,
    fontSize: typography.body,
    borderRadius: radii.sm,
    borderWidth: 1,
    backgroundColor: 'rgba(6, 35, 38, 0.6)',
    paddingHorizontal: spacing.md,
    minHeight: 50,
  },
  error: { color: colors.danger, fontSize: typography.caption },
});

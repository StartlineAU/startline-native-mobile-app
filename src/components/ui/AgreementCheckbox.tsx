import { Check } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/theme/tokens';

export function AgreementCheckbox({
  checked,
  onChange,
  children,
  testID,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: React.ReactNode;
  testID?: string;
}) {
  return (
    <View style={styles.row}>
      <Pressable
        testID={testID}
        accessibilityRole="checkbox"
        accessibilityLabel="Agree to the terms"
        accessibilityState={{ checked }}
        hitSlop={8}
        onPress={() => onChange(!checked)}
        style={styles.target}>
        <View style={[styles.checkbox, checked ? styles.checkboxActive : null]}>
          {checked ? <Check size={14} color={colors.primaryInk} strokeWidth={3} /> : null}
        </View>
      </Pressable>
      <View style={styles.copy}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  target: {
    width: 44,
    height: 44,
    marginTop: -10,
    marginLeft: -10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: colors.raised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  copy: {
    flex: 1,
    paddingTop: 1,
  },
});

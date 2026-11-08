import { Check, Plus } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Input, Field } from '@/components/ui/Input';
import { colors, radius, spacing } from '@/theme/tokens';
import type { RegistrationParticipant } from '@/lib/registration';
import type { PublicWave } from '@/types/api';

export function StepRail({
  current,
  labels,
}: {
  current: number;
  labels: string[];
}) {
  return (
    <View style={styles.rail}>
      {labels.map((label, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <View key={label} style={styles.step}>
            <View style={[styles.stepDot, done || active ? styles.stepDotActive : null]}>
              {done ? (
                <Check size={12} color={colors.primaryInk} strokeWidth={3} />
              ) : (
                <AppText variant="meta" style={active ? styles.stepNumberActive : styles.stepNumber}>
                  {index + 1}
                </AppText>
              )}
            </View>
            <AppText variant="meta" style={[styles.stepLabel, active ? styles.stepLabelActive : null]}>
              {label}
            </AppText>
            {index < labels.length - 1 ? <View style={styles.stepLine} /> : null}
          </View>
        );
      })}
    </View>
  );
}

export function TicketSelector({
  waves,
  quantities,
  availability,
  onChange,
}: {
  waves: PublicWave[];
  quantities: Record<string, number>;
  availability?: Record<string, { qty: number | null; confirmed: number }>;
  onChange: (label: string, quantity: number) => void;
}) {
  return (
    <View style={styles.ticketList}>
      {waves.map((wave) => {
        const quantity = quantities[wave.label] ?? 0;
        const availabilityRow = availability?.[wave.label];
        const remaining =
          availabilityRow?.qty != null
            ? Math.max(0, availabilityRow.qty - availabilityRow.confirmed)
            : null;
        const soldOut = remaining === 0;
        return (
          <View key={wave.label} style={[styles.ticket, soldOut ? styles.ticketDisabled : null]}>
            <View style={styles.flex}>
              <AppText variant="heading">{wave.label}</AppText>
              <AppText variant="bodySmall">
                {Number(wave.price ?? 0) === 0 ? 'Free' : `$${wave.price}`}
                {remaining != null ? ` · ${remaining} remaining` : ''}
              </AppText>
            </View>
            <View style={styles.stepper}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove ${wave.label}`}
                disabled={quantity === 0}
                onPress={() => onChange(wave.label, Math.max(0, quantity - 1))}
                style={[styles.stepButton, quantity === 0 ? styles.stepDisabled : null]}>
                <View style={styles.minus} />
              </Pressable>
              <AppText variant="heading" style={styles.quantity}>
                {quantity}
              </AppText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Add ${wave.label}`}
                disabled={soldOut}
                onPress={() => onChange(wave.label, quantity + 1)}
                style={[styles.stepButton, soldOut ? styles.stepDisabled : null]}>
                <Plus size={16} color={colors.primary} strokeWidth={2.5} />
              </Pressable>
            </View>
          </View>
        );
      })}
    </View>
  );
}

export function ParticipantForm({
  index,
  total,
  participant,
  errors,
  onChange,
  showEmergencyFields,
}: {
  index: number;
  total: number;
  participant: RegistrationParticipant;
  errors: Record<string, string>;
  onChange: (field: keyof RegistrationParticipant, value: string | boolean) => void;
  showEmergencyFields: boolean;
}) {
  return (
    <View style={styles.formCard}>
      {total > 1 ? (
        <View style={styles.formHeader}>
          <AppText variant="eyebrow">Ticket {index + 1}</AppText>
          <AppText variant="meta" style={styles.muted}>
            {participant.waveLabel}
          </AppText>
        </View>
      ) : null}
      <View style={styles.twoColumn}>
        <View style={styles.flex}>
          <Field label="First name" error={errors.firstName}>
            <Input
              value={participant.firstName}
              onChangeText={(value) => onChange('firstName', value)}
              placeholder="First name"
              autoComplete="given-name"
              textContentType="givenName"
            />
          </Field>
        </View>
        <View style={styles.flex}>
          <Field label="Last name" error={errors.lastName}>
            <Input
              value={participant.lastName}
              onChangeText={(value) => onChange('lastName', value)}
              placeholder="Last name"
              autoComplete="family-name"
              textContentType="familyName"
            />
          </Field>
        </View>
      </View>

      <Field label="Email" error={errors.email}>
        <Input
          value={participant.email}
          onChangeText={(value) => onChange('email', value)}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
        />
      </Field>

      <View style={styles.twoColumn}>
        <View style={styles.flex}>
          <Field label="Date of birth" error={errors.dateOfBirth} hint="YYYY-MM-DD">
            <Input
              value={participant.dateOfBirth}
              onChangeText={(value) => onChange('dateOfBirth', value)}
              placeholder="1995-08-24"
              keyboardType="numbers-and-punctuation"
              maxLength={10}
              autoComplete="birthdate-full"
              textContentType="birthdate"
            />
          </Field>
        </View>
        <View style={styles.flex}>
          <Field label="Gender">
            <Input
              value={participant.gender}
              onChangeText={(value) => onChange('gender', value)}
              placeholder="Optional"
            />
          </Field>
        </View>
      </View>

      <Field label="Mobile" hint="Optional">
        <Input
          value={participant.mobile}
          onChangeText={(value) => onChange('mobile', value)}
          placeholder="04xx xxx xxx"
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
        />
      </Field>

      {showEmergencyFields ? (
        <>
          <Field label="Emergency contact name" error={errors.emergencyContactName}>
            <Input
              value={participant.emergencyContactName}
              onChangeText={(value) => onChange('emergencyContactName', value)}
              placeholder="Someone other than you"
            />
          </Field>
          <Field label="Emergency contact phone" error={errors.emergencyContactPhone}>
            <Input
              value={participant.emergencyContactPhone}
              onChangeText={(value) => onChange('emergencyContactPhone', value)}
              placeholder="Their mobile number"
              keyboardType="phone-pad"
            />
          </Field>
        </>
      ) : null}

      <Field label="Estimated finish" hint="Optional. h:mm or minutes.">
        <Input
          value={participant.estimatedFinish}
          onChangeText={(value) => onChange('estimatedFinish', value)}
          placeholder="1:30"
          keyboardType="numbers-and-punctuation"
        />
      </Field>

      <Field label="Medical notes" hint="Optional, max 200 characters." error={errors.medicalNotes}>
        <Input
          value={participant.medicalNotes}
          onChangeText={(value) => onChange('medicalNotes', value)}
          placeholder="Anything the organiser should know."
          multiline
          maxLength={200}
        />
      </Field>
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 1,
  },
  stepDot: {
    width: 25,
    height: 25,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.raised,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  stepNumber: { color: colors.mutedDark, fontSize: 9 },
  stepNumberActive: { color: colors.primaryInk, fontSize: 9 },
  stepLabel: { color: colors.mutedDark, fontSize: 9 },
  stepLabelActive: { color: colors.primary },
  stepLine: {
    width: 18,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.raised,
    marginHorizontal: 3,
  },
  ticketList: { gap: spacing.sm },
  ticket: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  ticketDisabled: { opacity: 0.5 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDisabled: { opacity: 0.35 },
  minus: { width: 12, height: 2, backgroundColor: colors.primary },
  quantity: { minWidth: 18, textAlign: 'center' },
  formCard: {
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  twoColumn: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
  muted: { color: colors.mutedDark },
});

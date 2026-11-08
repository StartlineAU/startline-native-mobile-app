import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Input';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useAuth } from '@/context/AuthContext';
import { apiRequest, apiErrorMessage } from '@/lib/api';
import { colors, radius, spacing } from '@/theme/tokens';
import type { UserProfile } from '@/types/api';

const STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'] as const;
const GENDERS = ['Prefer not to say', 'Female', 'Male', 'Non-binary', 'Other'] as const;

export default function EditProfileScreen() {
  const auth = useAuth();
  const profile = auth.profile;
  const [name, setName] = useState(profile?.name ?? '');
  const [username, setUsername] = useState(profile?.username ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [city, setCity] = useState(profile?.city ?? '');
  const [state, setState] = useState(profile?.state?.toUpperCase() ?? '');
  const [mobile, setMobile] = useState(profile?.mobile ?? '');
  const [dateOfBirth, setDateOfBirth] = useState(profile?.dateOfBirth ?? '');
  const [gender, setGender] = useState(profile?.gender ?? '');
  const [emergencyContactName, setEmergencyContactName] = useState(
    profile?.emergencyContactName ?? '',
  );
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(
    profile?.emergencyContactPhone ?? '',
  );
  const [isPublic, setIsPublic] = useState(profile?.isPublic ?? true);
  const [notifyFollowedOrganiserEvents, setNotifyFollowedOrganiserEvents] = useState(
    profile?.notifyFollowedOrganiserEvents ?? true,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setError('');
    if (dateOfBirth && !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
      setError('Date of birth must use YYYY-MM-DD.');
      return;
    }
    setSaving(true);
    try {
      await apiRequest<UserProfile>('/api/user/profile', {
        method: 'PUT',
        auth: 'required',
        body: {
          name: name.trim() || null,
          username: username.trim().toLowerCase() || undefined,
          bio: bio.trim() || null,
          city: city.trim() || null,
          state: state || null,
          mobile: mobile.trim() || null,
          dateOfBirth: dateOfBirth || null,
          gender: gender || null,
          emergencyContactName: emergencyContactName.trim() || null,
          emergencyContactPhone: emergencyContactPhone.trim() || null,
          isPublic,
          notifyFollowedOrganiserEvents,
        },
      });
      await auth.refreshProfile();
      router.back();
    } catch (err) {
      Alert.alert('Could not save profile', apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (!profile) {
    return (
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <ScreenHeader title="Edit profile" />
        <View style={styles.empty}>
          <AppText variant="body">Sign in to edit your profile.</AppText>
          <Button label="Sign in" onPress={() => router.replace('/auth/sign-in')} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScreenHeader title="Edit profile" eyebrow="Athlete profile" />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <AppText variant="eyebrow">Public profile</AppText>
          <AppText variant="title">How athletes see you</AppText>
          <Field label="Display name">
            <Input value={name} onChangeText={setName} placeholder="Your full name" />
          </Field>
          <Field
            label="Username"
            hint="Lowercase letters, numbers and hyphens. 3–30 characters."
            error={error && !error.includes('Date') ? error : undefined}>
            <Input
              value={username}
              onChangeText={(value) => setUsername(value.toLowerCase())}
              placeholder="your-handle"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </Field>
          <Field label="Bio" hint="A short line about your racing.">
            <Input
              value={bio}
              onChangeText={setBio}
              placeholder="Chasing a new personal best."
              multiline
            />
          </Field>
          <ToggleRow
            title="Public profile"
            subtitle="Allow others to find your profile and published race results."
            value={isPublic}
            onChange={setIsPublic}
          />
        </View>

        <View style={styles.section}>
          <AppText variant="eyebrow">Registration prefill</AppText>
          <AppText variant="title">Personal details</AppText>
          <Field label="Mobile" hint="Used to prefill future event entries.">
            <Input
              value={mobile}
              onChangeText={setMobile}
              placeholder="04xx xxx xxx"
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
            />
          </Field>
          <Field label="Date of birth" hint="YYYY-MM-DD. You must be 18 or older.">
            <Input
              value={dateOfBirth}
              onChangeText={setDateOfBirth}
              placeholder="1995-08-24"
              keyboardType="numbers-and-punctuation"
              maxLength={10}
              autoComplete="birthdate-full"
              textContentType="birthdate"
            />
          </Field>
          <Field label="Gender">
            <ChipPicker options={GENDERS} value={gender} onChange={setGender} />
          </Field>
          <View style={styles.twoColumn}>
            <View style={styles.flex}>
              <Field label="City">
                <Input value={city} onChangeText={setCity} placeholder="Sydney" />
              </Field>
            </View>
            <View style={styles.stateColumn}>
              <Field label="State">
                <ChipPicker options={STATES} value={state} onChange={setState} compact />
              </Field>
            </View>
          </View>
          <Field label="Emergency contact name">
            <Input
              value={emergencyContactName}
              onChangeText={setEmergencyContactName}
              placeholder="Someone other than you"
            />
          </Field>
          <Field label="Emergency contact phone">
            <Input
              value={emergencyContactPhone}
              onChangeText={setEmergencyContactPhone}
              placeholder="Their mobile number"
              keyboardType="phone-pad"
            />
          </Field>
        </View>

        <View style={styles.section}>
          <AppText variant="eyebrow">Updates</AppText>
          <AppText variant="title">Notifications</AppText>
          <ToggleRow
            title="Organiser events"
            subtitle="Hear when an organiser you follow publishes a new event."
            value={notifyFollowedOrganiserEvents}
            onChange={setNotifyFollowedOrganiserEvents}
          />
          <AppText variant="bodySmall">
            Entry receipts and race-day updates are always sent and cannot be switched off.
          </AppText>
        </View>

        {error ? <AppText style={styles.error}>{error}</AppText> : null}
        <Button label="Save changes" onPress={() => void save()} loading={saving} />
      </ScrollView>
    </SafeAreaView>
  );
}

function ToggleRow({
  title,
  subtitle,
  value,
  onChange,
}: {
  title: string;
  subtitle: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.flex}>
        <AppText variant="bodyMedium">{title}</AppText>
        <AppText variant="bodySmall">{subtitle}</AppText>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.raised, true: colors.primaryBorder }}
        thumbColor={value ? colors.primary : colors.muted}
      />
    </View>
  );
}

function ChipPicker<T extends string>({
  options,
  value,
  onChange,
  compact,
}: {
  options: readonly T[];
  value: string;
  onChange: (value: T) => void;
  compact?: boolean;
}) {
  return (
    <View style={[styles.chips, compact ? styles.chipsCompact : null]}>
      {options.map((option) => {
        const active = value === option;
        return (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            style={[styles.chip, active ? styles.chipActive : null]}>
            <AppText variant="meta" style={active ? styles.chipTextActive : undefined}>
              {option}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.xxl, paddingBottom: spacing.xxl },
  section: { gap: spacing.lg },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  twoColumn: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  flex: { flex: 1 },
  stateColumn: { width: 130 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chipsCompact: { gap: 5 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.raised,
    backgroundColor: colors.surfaceAlt,
  },
  chipActive: { borderColor: colors.primaryBorder, backgroundColor: colors.primarySoft },
  chipTextActive: { color: colors.primary },
  error: { color: colors.danger },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.lg },
});

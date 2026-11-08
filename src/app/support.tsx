import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Send } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Input';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { config } from '@/config/env';
import { useAuth } from '@/context/AuthContext';
import { apiRequest, apiErrorMessage } from '@/lib/api';
import { withTurnstileRetry } from '@/lib/turnstile';
import { colors, radius, spacing } from '@/theme/tokens';

export default function SupportScreen() {
  const auth = useAuth();
  const params = useLocalSearchParams<{
    eventId?: string;
    eventName?: string;
    eventDate?: string;
  }>();
  const eventId = Array.isArray(params.eventId) ? params.eventId[0] : params.eventId;
  const eventName = Array.isArray(params.eventName) ? params.eventName[0] : params.eventName;
  const eventDate = Array.isArray(params.eventDate) ? params.eventDate[0] : params.eventDate;

  const [name, setName] = useState(auth.profile?.name ?? '');
  const [email, setEmail] = useState(auth.profile?.email ?? auth.identity?.email ?? '');
  const [requestType, setRequestType] = useState<'refund' | 'other'>(
    eventId ? 'refund' : 'other',
  );
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    if (!name.trim() || !email.includes('@') || !reason.trim()) {
      setError('Add your name, email and a reason for contacting us.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await withTurnstileRetry((turnstileToken) =>
        apiRequest<{ id: string }>('/api/support', {
          method: 'POST',
          auth: 'optional',
          body: {
            name: name.trim(),
            email: email.trim(),
            requestType,
            eventId,
            eventName,
            eventDate,
            reason: reason.trim(),
            turnstileToken,
          },
        }),
      );
      setTicketId(result.id);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScreenHeader title="Support" eyebrow="Open a ticket" close />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {ticketId ? (
          <View style={styles.successCard}>
            <AppText variant="eyebrow">Ticket opened</AppText>
            <AppText variant="title">We have it.</AppText>
            <AppText variant="body">
              Your reference is {ticketId.slice(0, 8)}. Startline will reply to {email}.
              A refund is not issued from this form.
            </AppText>
            <Button
              label="Close"
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            />
          </View>
        ) : (
          <>
            <View style={styles.intro}>
              <AppText variant="eyebrow">Help with an entry</AppText>
              <AppText variant="displayItalic" style={styles.title}>
                Let&apos;s sort it{'\n'}
                <AppText variant="displayItalic" style={styles.accent}>
                  out.
                </AppText>
              </AppText>
              <AppText variant="bodySmall">
                Refund requests are reviewed by the organiser and Startline. Submitting a ticket
                does not issue a refund automatically.
              </AppText>
            </View>

            {eventName ? (
              <View style={styles.eventCard}>
                <AppText variant="meta" style={styles.accent}>
                  About this event
                </AppText>
                <AppText variant="heading">{eventName}</AppText>
                {eventDate ? <AppText variant="bodySmall">{eventDate}</AppText> : null}
              </View>
            ) : null}

            <View style={styles.form}>
              <Field label="Name">
                <Input value={name} onChangeText={setName} placeholder="Your name" />
              </Field>
              <Field label="Email">
                <Input
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </Field>
              <Field label="What do you need?">
                <View style={styles.typeRow}>
                  <TypeButton
                    label="Refund"
                    active={requestType === 'refund'}
                    onPress={() => setRequestType('refund')}
                  />
                  <TypeButton
                    label="Something else"
                    active={requestType === 'other'}
                    onPress={() => setRequestType('other')}
                  />
                </View>
              </Field>
              <Field
                label="Reason"
                hint="Include what happened and what you want us to do.">
                <Input
                  value={reason}
                  onChangeText={setReason}
                  placeholder="Tell us what happened."
                  multiline
                />
              </Field>
              {error ? <AppText style={styles.error}>{error}</AppText> : null}
              <Button
                label="Open a ticket"
                onPress={() => void submit()}
                loading={submitting}
                icon={<Send size={17} color={colors.primaryInk} />}
              />
              <AppText variant="bodySmall" style={styles.note}>
                Change-of-mind refund requests are not available within 24 hours of an event
                start. Australian Consumer Law rights still apply if an event is cancelled or
                significantly changed. See the{' '}
                <AppText
                  variant="bodySmall"
                  style={styles.accent}
                  onPress={() => void WebBrowser.openBrowserAsync(config.termsUrl)}>
                  Terms of Service
                </AppText>
                .
              </AppText>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function TypeButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.typeButton, active ? styles.typeButtonActive : null]}>
      <AppText variant="meta" style={active ? styles.accent : undefined}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.xxl },
  intro: { gap: spacing.sm },
  title: { fontSize: 38, lineHeight: 37 },
  accent: { color: colors.primary },
  eventCard: {
    gap: 5,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    backgroundColor: colors.primarySoft,
  },
  form: { gap: spacing.lg },
  typeRow: { flexDirection: 'row', gap: spacing.sm },
  typeButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.raised,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeButtonActive: {
    borderColor: colors.primaryBorder,
    backgroundColor: colors.primarySoft,
  },
  error: { color: colors.danger },
  note: { color: colors.mutedDark },
  successCard: {
    marginTop: spacing.xxl,
    gap: spacing.md,
    padding: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    backgroundColor: colors.primarySoft,
  },
});

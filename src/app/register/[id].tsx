import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useStripe } from '@stripe/stripe-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import {
  ArrowLeft,
  Check,
  CreditCard,
  LogIn,
  ShieldCheck,
  Ticket,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  ParticipantForm,
  StepRail,
  TicketSelector,
} from '@/components/registration/FormParts';
import { AppText, EmptyState, LoadingView } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field, Input } from '@/components/ui/Input';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { config } from '@/config/env';
import { useAuth } from '@/context/AuthContext';
import { useEventAvailability, useEventDetail } from '@/hooks/useEvents';
import { apiRequest, apiErrorMessage } from '@/lib/api';
import { formatMoney, formatTime } from '@/lib/format';
import { withTurnstileRetry } from '@/lib/turnstile';
import {
  emptyParticipant,
  isWaveOpen,
  priceForTickets,
  splitFullName,
  ticketLabels,
  validateEmergencyContact,
  validateParticipant,
  type EmergencyContact,
  type RegistrationParticipant,
} from '@/lib/registration';
import { colors, radius, spacing } from '@/theme/tokens';
import type { CheckoutResponse, PublicEvent, PublicWave } from '@/types/api';

type Confirmation = {
  paid: boolean;
  reference: string;
  email: string;
  amountLabel: string;
  ticketSummary: string;
  count: number;
};

export default function RegisterScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const query = useEventDetail(id);
  const event = query.data?.event;

  if (query.isLoading) {
    return (
      <View style={styles.centered}>
        <LoadingView label="Preparing registration" />
      </View>
    );
  }

  if (query.isError || !event) {
    return (
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <ScreenHeader title="Registration" close />
        <EmptyState
          title="Event unavailable."
          body={query.isError ? apiErrorMessage(query.error) : 'This event could not be found.'}
          action={<Button label="Back to event" onPress={() => router.back()} />}
        />
      </SafeAreaView>
    );
  }

  const waves = (Array.isArray(event.waves) ? event.waves : []) as PublicWave[];
  const freeEvent =
    waves.length > 0 && waves.every((wave) => Number(wave.price ?? 0) === 0);

  if (freeEvent && event.registrationType === 'startline') {
    return <FreeRsvpFlow event={event} waves={waves} />;
  }

  return <StandardRegistrationFlow event={event} waves={waves} />;
}

function FreeRsvpFlow({ event, waves }: { event: PublicEvent; waves: PublicWave[] }) {
  const auth = useAuth();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const openWaves = waves.filter((wave) => isWaveOpen(wave));
  const [waveLabel, setWaveLabel] = useState(openWaves.length === 1 ? openWaves[0].label : '');
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);

  const duplicateQuery = useQuery({
    queryKey: ['rsvp-status', event.id, auth.status],
    enabled: auth.status === 'authenticated',
    queryFn: ({ signal }) =>
      apiRequest<{ alreadyRegistered: boolean }>(
        `/api/registrations/free/rsvp?eventId=${encodeURIComponent(event.id)}`,
        { signal, auth: 'required' },
      ),
  });

  const submit = async () => {
    setError('');
    if (!waveLabel) {
      setError('Choose a ticket tier.');
      return;
    }
    if (!accepted) {
      setError('Accept the terms and waiver to RSVP.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await withTurnstileRetry((turnstileToken) =>
        apiRequest<{
          registrationIds: string[];
          email: string;
          name: string;
        }>('/api/registrations/free/rsvp', {
          method: 'POST',
          auth: 'required',
          body: {
            eventId: event.id,
            waveLabel,
            acceptedTerms: true,
            turnstileToken,
          },
        }),
      );
      setConfirmation({
        paid: false,
        reference: `SL-${result.registrationIds[0].replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase()}`,
        email: result.email,
        amountLabel: 'Free',
        ticketSummary: waveLabel,
        count: 1,
      });
      await queryClient.invalidateQueries({ queryKey: ['user-registrations'] });
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmation) {
    return <ConfirmationView event={event} confirmation={confirmation} />;
  }

  if (auth.status === 'loading') {
    return (
      <View style={styles.centered}>
        <LoadingView label="Checking your account" />
      </View>
    );
  }

  if (auth.status === 'unauthenticated') {
    return (
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <ScreenHeader title="RSVP" close />
        <EmptyState
          icon={<LogIn size={24} color={colors.primary} />}
          title="Sign in to RSVP."
          body="This event is free. Your account is the entry, so there are no extra details to fill in."
          action={
            <Button
              label="Sign in"
              onPress={() =>
                router.push({
                  pathname: '/auth/sign-in',
                  params: { returnTo: `/register/${event.id}` },
                })
              }
            />
          }
        />
      </SafeAreaView>
    );
  }

  if (duplicateQuery.data?.alreadyRegistered) {
    return (
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <ScreenHeader title="RSVP" close />
        <EmptyState
          title="You're already going."
          body="This account already has an entry for this event."
          action={<Button label="View my activity" onPress={() => router.replace('/activity')} />}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScreenHeader title="RSVP" eyebrow={event.title} close />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 130 + insets.bottom }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.heading}>
          <AppText variant="eyebrow">Free event</AppText>
          <AppText variant="displayItalic" style={styles.title}>
            Save your{'\n'}
            <AppText variant="displayItalic" style={styles.accent}>
              spot.
            </AppText>
          </AppText>
          <AppText variant="bodySmall">
            {event.title} · {formatTime(event.startTime)} · {event.venue}, {event.city}
          </AppText>
        </View>

        <Card style={styles.formCard}>
          <AppText variant="label" style={styles.muted}>
            Choose your ticket
          </AppText>
          {openWaves.map((wave) => {
            const active = waveLabel === wave.label;
            return (
              <Pressable
                key={wave.label}
                onPress={() => setWaveLabel(wave.label)}
                style={[styles.radioOption, active ? styles.radioOptionActive : null]}>
                <View style={[styles.radio, active ? styles.radioActive : null]}>
                  {active ? <Check size={12} color={colors.primaryInk} strokeWidth={3} /> : null}
                </View>
                <View style={styles.flex}>
                  <AppText variant="heading">{wave.label}</AppText>
                  <AppText variant="bodySmall">One place · your account</AppText>
                </View>
                <AppText variant="title" style={styles.accent}>
                  Free
                </AppText>
              </Pressable>
            );
          })}
        </Card>

        <TermsBlock accepted={accepted} onChange={setAccepted} />

        {error ? <AppText style={styles.error}>{error}</AppText> : null}
      </ScrollView>

      <View style={[styles.stickyBar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <Button
          label="Confirm RSVP"
          onPress={() => void submit()}
          loading={submitting}
          icon={<Ticket size={18} color={colors.primaryInk} />}
        />
      </View>
    </SafeAreaView>
  );
}

function StandardRegistrationFlow({
  event,
  waves,
}: {
  event: PublicEvent;
  waves: PublicWave[];
}) {
  const auth = useAuth();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const availabilityQuery = useEventAvailability(event.id);
  const availability = availabilityQuery.data;
  const openWaves = waves.filter((wave) => isWaveOpen(wave));
  const [step, setStep] = useState(0);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [participants, setParticipants] = useState<RegistrationParticipant[]>([]);
  const [errors, setErrors] = useState<Record<number, Record<string, string>>>({});
  const [sharedContact, setSharedContact] = useState<EmergencyContact>({ name: '', phone: '' });
  const [sharedErrors, setSharedErrors] = useState<Record<string, string>>({});
  const [useSharedContact, setUseSharedContact] = useState(true);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);

  const availabilityByWave = useMemo(() => {
    const map: Record<string, { qty: number | null; confirmed: number }> = {};
    for (const wave of availability?.waves ?? []) map[wave.label] = wave;
    return map;
  }, [availability]);

  const pricing = useMemo(
    () => priceForTickets(waves, quantities, event.feeStructure),
    [event.feeStructure, quantities, waves],
  );
  const isGroup = pricing.ticketCount > 1;
  const freeOrder = pricing.ticketCount > 0 && pricing.totalCents === 0;
  const tierSummary = useMemo(() => {
    return openWaves
      .filter((wave) => (quantities[wave.label] ?? 0) > 0)
      .map((wave) => {
        const quantity = quantities[wave.label] ?? 0;
        return quantity > 1 ? `${quantity} × ${wave.label}` : wave.label;
      })
      .join(', ');
  }, [openWaves, quantities]);

  const profile = auth.profile;
  const prefillParticipant = (waveLabel: string, index: number): RegistrationParticipant => {
    if (index !== 0 || !profile) return { ...emptyParticipant(waveLabel), waveLabel };
    const name = splitFullName(profile.name);
    return {
      ...emptyParticipant(waveLabel),
      firstName: name.firstName,
      lastName: name.lastName,
      email: profile.email,
      mobile: profile.mobile ?? '',
      dateOfBirth: profile.dateOfBirth ?? '',
      gender: profile.gender ?? '',
      emergencyContactName: profile.emergencyContactName ?? '',
      emergencyContactPhone: profile.emergencyContactPhone ?? '',
      waiverAccepted: true,
      waveLabel,
    };
  };

  const changeQuantity = (label: string, nextQuantity: number) => {
    const availabilityRow = availabilityByWave[label];
    const tierRemaining = availabilityRow?.qty != null
      ? Math.max(0, availabilityRow.qty - availabilityRow.confirmed)
      : Infinity;
    const eventRemaining =
      availability?.cap != null
        ? Math.max(0, availability.cap - availability.confirmed)
        : Infinity;
    const otherTickets = Object.entries(quantities).reduce(
      (total, [tier, quantity]) => (tier === label ? total : total + quantity),
      0,
    );
    const clamped = Math.max(
      0,
      Math.min(nextQuantity, tierRemaining, eventRemaining - otherTickets, 10 - otherTickets),
    );
    setQuantities((current) => ({ ...current, [label]: clamped }));
    setError('');
  };

  const goToDetails = () => {
    if (pricing.ticketCount === 0) {
      setError('Choose at least one ticket.');
      return;
    }
    const labels = ticketLabels(openWaves, quantities);
    setParticipants((current) =>
      labels.map((label, index) => {
        const existing = current[index];
        return existing ? { ...existing, waveLabel: label } : prefillParticipant(label, index);
      }),
    );
    setErrors({});
    setUseSharedContact(labels.length > 1);
    setStep(1);
    setError('');
  };

  const updateParticipant = (
    index: number,
    field: keyof RegistrationParticipant,
    value: string | boolean,
  ) => {
    setParticipants((current) =>
      current.map((participant, itemIndex) =>
        itemIndex === index ? { ...participant, [field]: value } : participant,
      ),
    );
    setErrors((current) => {
      if (!current[index]) return current;
      const next = { ...current, [index]: { ...current[index] } };
      delete next[index][field];
      return next;
    });
  };

  const goToReview = () => {
    const nextErrors: Record<number, Record<string, string>> = {};
    participants.forEach((participant, index) => {
      const validation = validateParticipant(participant, {
        includeEmergencyContact: !isGroup || !useSharedContact,
      });
      if (Object.keys(validation).length > 0) nextErrors[index] = validation;
    });
    setErrors(nextErrors);

    if (isGroup && useSharedContact) {
      const contactErrors = validateEmergencyContact(sharedContact, participants);
      setSharedErrors(contactErrors);
      if (Object.keys(contactErrors).length > 0) {
        setError('Fix the shared emergency contact before continuing.');
        return;
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setError('Check the highlighted participant details.');
      return;
    }

    setError('');
    setStep(2);
  };

  const orderPayload = () => ({
    eventId: event.id,
    waveLabel: participants[0]?.waveLabel,
    ...(isGroup && useSharedContact
      ? { groupRegistration: true, emergencyContact: sharedContact }
      : {}),
    participants: participants.map((participant) => ({
      ...participant,
      waiverAccepted: true,
      emergencyContactName:
        isGroup && useSharedContact ? sharedContact.name : participant.emergencyContactName,
      emergencyContactPhone:
        isGroup && useSharedContact ? sharedContact.phone : participant.emergencyContactPhone,
    })),
  });

  const submitFree = async () => {
    const result = await withTurnstileRetry((turnstileToken) =>
      apiRequest<{ registrationIds: string[]; participantCount: number }>(
        '/api/registrations/free',
        {
          method: 'POST',
          auth: 'optional',
          body: { ...orderPayload(), turnstileToken },
        },
      ),
    );
    setConfirmation({
      paid: false,
      reference: `SL-${result.registrationIds[0].replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase()}`,
      email: participants[0]?.email ?? '',
      amountLabel: 'Free',
      ticketSummary: tierSummary,
      count: result.participantCount,
    });
    await queryClient.invalidateQueries({ queryKey: ['user-registrations'] });
  };

  const submitPaid = async () => {
    if (!config.stripePublishableKey) {
      setError('Card payments are not configured in this build.');
      return;
    }

    const checkout = await withTurnstileRetry((turnstileToken) =>
      apiRequest<CheckoutResponse>('/api/checkout', {
        method: 'POST',
        auth: 'optional',
        body: { ...orderPayload(), turnstileToken },
      }),
    );

    const init = await initPaymentSheet({
      merchantDisplayName: 'Startline',
      paymentIntentClientSecret: checkout.clientSecret,
      returnURL: 'com.startlineau.app://stripe-redirect',
      allowsDelayedPaymentMethods: false,
      applePay: { merchantCountryCode: 'AU' },
      googlePay: { merchantCountryCode: 'AU', testEnv: __DEV__ },
      style: 'alwaysDark',
    });
    if (init.error) throw new Error(init.error.message);

    const result = await presentPaymentSheet();
    if (result.error) {
      if (result.error.code !== 'Canceled') throw new Error(result.error.message);
      return;
    }

    setConfirmation({
      paid: true,
      reference: `SL-${checkout.paymentIntentId.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase()}`,
      email: participants[0]?.email ?? '',
      amountLabel: formatMoney(checkout.amount * 100),
      ticketSummary: tierSummary,
      count: checkout.participantCount,
    });
    await queryClient.invalidateQueries({ queryKey: ['user-registrations'] });
  };

  const confirm = async () => {
    setError('');
    if (!termsAccepted) {
      setError('Accept the terms and waiver to continue.');
      return;
    }
    setSubmitting(true);
    try {
      if (freeOrder) await submitFree();
      else await submitPaid();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmation) {
    return <ConfirmationView event={event} confirmation={confirmation} />;
  }

  if (auth.status === 'loading' && !profile) {
    return (
      <View style={styles.centered}>
        <LoadingView label="Checking your account" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScreenHeader title={step === 2 ? 'Review' : 'Register'} eyebrow={event.title} close />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 130 + insets.bottom },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.heading}>
          <AppText variant="eyebrow">Registration</AppText>
          <AppText variant="displayItalic" style={styles.title}>
            Secure your{'\n'}
            <AppText variant="displayItalic" style={styles.accent}>
              spot.
            </AppText>
          </AppText>
          <AppText variant="bodySmall">
            {event.title} · {event.venue}, {event.city}
          </AppText>
        </View>

        <StepRail current={step} labels={['Tickets', 'Details', 'Review']} />

        {step === 0 ? (
          <>
            <Card style={styles.formCard}>
              <AppText variant="label" style={styles.muted}>
                Choose your tickets
              </AppText>
              <TicketSelector
                waves={openWaves}
                quantities={quantities}
                availability={availabilityByWave}
                onChange={changeQuantity}
              />
              {pricing.ticketCount > 0 ? (
                <View style={styles.ticketSummary}>
                  <AppText variant="meta">
                    {pricing.ticketCount} ticket{pricing.ticketCount === 1 ? '' : 's'}
                  </AppText>
                  <AppText variant="title" style={styles.accent}>
                    {pricing.totalCents === 0 ? 'Free' : formatMoney(pricing.totalCents)}
                  </AppText>
                </View>
              ) : null}
            </Card>
            {error ? <AppText style={styles.error}>{error}</AppText> : null}
          </>
        ) : null}

        {step === 1 ? (
          <>
            {isGroup ? (
              <Card style={styles.formCard}>
                <View style={styles.sharedRow}>
                  <View style={styles.flex}>
                    <AppText variant="heading">One emergency contact</AppText>
                    <AppText variant="bodySmall">
                      Use the same emergency contact for every ticket in this order.
                    </AppText>
                  </View>
                  <Switch
                    value={useSharedContact}
                    onValueChange={(value) => {
                      setUseSharedContact(value);
                      setErrors({});
                    }}
                    trackColor={{ false: colors.raised, true: colors.primaryBorder }}
                    thumbColor={useSharedContact ? colors.primary : colors.muted}
                  />
                </View>
                {useSharedContact ? (
                  <>
                    <Field label="Emergency contact name" error={sharedErrors.name}>
                      <Input
                        value={sharedContact.name}
                        onChangeText={(value) =>
                          setSharedContact((current) => ({ ...current, name: value }))
                        }
                        placeholder="Someone other than a participant"
                      />
                    </Field>
                    <Field label="Emergency contact phone" error={sharedErrors.phone}>
                      <Input
                        value={sharedContact.phone}
                        onChangeText={(value) =>
                          setSharedContact((current) => ({ ...current, phone: value }))
                        }
                        placeholder="Their mobile number"
                        keyboardType="phone-pad"
                      />
                    </Field>
                  </>
                ) : null}
              </Card>
            ) : null}

            {participants.map((participant, index) => (
              <ParticipantForm
                key={`${participant.waveLabel}-${index}`}
                index={index}
                total={participants.length}
                participant={participant}
                errors={errors[index] ?? {}}
                onChange={(field, value) => updateParticipant(index, field, value)}
                showEmergencyFields={!isGroup || !useSharedContact}
              />
            ))}
            {error ? <AppText style={styles.error}>{error}</AppText> : null}
          </>
        ) : null}

        {step === 2 ? (
          <>
            <Card style={styles.formCard}>
              <AppText variant="label" style={styles.muted}>
                Review your registration
              </AppText>
              <SummaryRow label="Event" value={event.title} />
              <SummaryRow label="Tickets" value={tierSummary} />
              {participants.map((participant, index) => (
                <SummaryRow
                  key={`${participant.waveLabel}-${index}`}
                  label={participants.length > 1 ? `Ticket ${index + 1}` : 'Athlete'}
                  value={`${participant.firstName} ${participant.lastName} · ${participant.email}`}
                />
              ))}
              <SummaryRow
                label="Emergency contact"
                value={
                  isGroup && useSharedContact
                    ? `${sharedContact.name} · ${sharedContact.phone}`
                    : `${participants[0]?.emergencyContactName} · ${participants[0]?.emergencyContactPhone}`
                }
              />
              <View style={styles.divider} />
              {pricing.subtotalCents !== pricing.totalCents ? (
                <>
                  <SummaryRow label="Entry total" value={formatMoney(pricing.subtotalCents)} />
                  <SummaryRow label="Service fee" value={formatMoney(pricing.feeCents)} />
                </>
              ) : null}
              <View style={styles.totalRow}>
                <AppText variant="label">Total</AppText>
                <AppText variant="title" style={styles.accent}>
                  {pricing.totalCents === 0 ? 'Free' : formatMoney(pricing.totalCents)}
                </AppText>
              </View>
            </Card>

            {!freeOrder ? (
              <Card style={styles.paymentCard}>
                <CreditCard size={20} color={colors.primary} />
                <View style={styles.flex}>
                  <AppText variant="heading">Secure card payment</AppText>
                  <AppText variant="bodySmall">
                    You will review and confirm the card in the Stripe payment sheet. The server
                    confirms the entry after payment succeeds.
                  </AppText>
                </View>
              </Card>
            ) : (
              <Card style={styles.paymentCard}>
                <ShieldCheck size={20} color={colors.primary} />
                <View style={styles.flex}>
                  <AppText variant="heading">No payment required</AppText>
                  <AppText variant="bodySmall">
                    This order is free. Confirming registers every ticket immediately.
                  </AppText>
                </View>
              </Card>
            )}

            <TermsBlock accepted={termsAccepted} onChange={setTermsAccepted} />

            {event.refundPolicy ? (
              <Card>
                <AppText variant="label" style={styles.accent}>
                  Refund policy
                </AppText>
                <AppText variant="bodySmall">{event.refundPolicy}</AppText>
              </Card>
            ) : null}

            {error ? <AppText style={styles.error}>{error}</AppText> : null}
          </>
        ) : null}
      </ScrollView>

      <View style={[styles.stickyBar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <View style={styles.footerPrice}>
          <View>
            <AppText variant="meta" style={styles.mutedDark}>
              {step === 0 ? 'Selected' : 'Total'}
            </AppText>
            <AppText variant="title" style={styles.accent}>
              {pricing.ticketCount === 0 ? '—' : formatMoney(pricing.totalCents)}
            </AppText>
          </View>
        </View>
        {step > 0 ? (
          <Pressable
            onPress={() => {
              setStep((current) => Math.max(0, current - 1));
              setError('');
            }}
            style={styles.backButton}>
            <ArrowLeft size={18} color={colors.text} />
          </Pressable>
        ) : null}
        <Button
          label={
            step === 0
              ? 'Continue'
              : step === 1
                ? 'Review'
                : freeOrder
                  ? 'Confirm registration'
                  : 'Pay and register'
          }
          onPress={() => {
            if (step === 0) goToDetails();
            else if (step === 1) goToReview();
            else void confirm();
          }}
          loading={submitting}
          fullWidth={false}
          style={styles.continueButton}
          icon={
            step === 2 ? (
              freeOrder ? (
                <Check size={18} color={colors.primaryInk} />
              ) : (
                <CreditCard size={18} color={colors.primaryInk} />
              )
            ) : undefined
          }
        />
      </View>
    </SafeAreaView>
  );
}

function TermsBlock({
  accepted,
  onChange,
}: {
  accepted: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: accepted }}
      onPress={() => onChange(!accepted)}
      style={styles.termsRow}>
      <View style={[styles.checkbox, accepted ? styles.checkboxActive : null]}>
        {accepted ? <Check size={13} color={colors.primaryInk} strokeWidth={3} /> : null}
      </View>
      <AppText variant="bodySmall" style={styles.termsText}>
        I agree to the Startline{' '}
        <AppText
          variant="bodySmall"
          style={styles.accent}
          onPress={() => void WebBrowser.openBrowserAsync(config.termsUrl)}>
          Terms of Service
        </AppText>
        , this event&apos;s entry terms and waiver, and confirm my details are correct. My details,
        including medical and emergency information, are shared with the organiser.
      </AppText>
    </Pressable>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <AppText variant="bodySmall" style={styles.summaryLabel}>
        {label}
      </AppText>
      <AppText variant="bodyMedium" style={styles.summaryValue}>
        {value}
      </AppText>
    </View>
  );
}

function ConfirmationView({
  event,
  confirmation,
}: {
  event: PublicEvent;
  confirmation: Confirmation;
}) {
  const auth = useAuth();
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.confirmation}>
        <View style={styles.confirmationIcon}>
          <Check size={30} color={colors.primary} strokeWidth={2.5} />
        </View>
        <AppText variant="eyebrow">
          {confirmation.paid ? 'Payment received' : "You're in"}
        </AppText>
        <AppText variant="displayItalic" style={styles.confirmationTitle}>
          {confirmation.paid ? 'Entry being' : 'Registration'}
          {'\n'}
          <AppText variant="displayItalic" style={styles.accent}>
            {confirmation.paid ? 'confirmed.' : 'confirmed.'}
          </AppText>
        </AppText>
        <AppText variant="body" style={styles.confirmationCopy}>
          {confirmation.paid
            ? `Your ${confirmation.count > 1 ? `${confirmation.count} entries are` : 'entry is'} being confirmed for ${event.title}. Keep an eye on ${confirmation.email} for the receipt and final confirmation.`
            : confirmation.count === 1
              ? `Your spot in ${confirmation.ticketSummary} at ${event.title} is locked in.`
              : `Your ${confirmation.count} tickets to ${event.title} are locked in.`}
        </AppText>

        <Card style={styles.receipt}>
          <SummaryRow label="Reference" value={confirmation.reference} />
          <SummaryRow label="Event" value={event.title} />
          <SummaryRow label="Tickets" value={confirmation.ticketSummary} />
          <SummaryRow label={confirmation.paid ? 'Amount paid' : 'Cost'} value={confirmation.amountLabel} />
          <SummaryRow label="Sent to" value={confirmation.email} />
        </Card>

        <View style={styles.confirmationActions}>
          {auth.status === 'authenticated' ? (
            <Button label="View my activity" onPress={() => router.replace('/activity')} />
          ) : null}
          <Button
            label="Back to event"
            variant="outline"
            onPress={() => router.replace(`/events/${event.slug ?? event.id}` as never)}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1,backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg },
  heading: { gap: spacing.sm, marginBottom: spacing.md },
  title: { fontSize: 38, lineHeight: 37 },
  accent: { color: colors.primary },
  formCard: { gap: spacing.lg },
  muted: { color: colors.muted },
  mutedDark: { color: colors.mutedDark },
  ticketSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  error: { color: colors.danger },
  sharedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  flex: { flex: 1 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.lg,
    paddingVertical: 7,
  },
  summaryLabel: { color: colors.muted, flexShrink: 0 },
  summaryValue: { flex: 1, textAlign: 'right' },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  paymentCard: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: colors.raised,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  termsText: { flex: 1, lineHeight: 19 },
  stickyBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: 'rgba(20,20,20,0.97)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  footerPrice: { flex: 1 },
  continueButton: { flexShrink: 0, paddingHorizontal: 16 },
  backButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: colors.raised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.raised,
    backgroundColor: colors.surfaceAlt,
  },
  radioOptionActive: { borderColor: colors.primaryBorder, backgroundColor: colors.primarySoft },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.raised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  confirmation: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl,
    alignItems: 'center',
    gap: spacing.md,
  },
  confirmationIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: colors.primaryBorder,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  confirmationTitle: { fontSize: 40, lineHeight: 39, textAlign: 'center' },
  confirmationCopy: { textAlign: 'center', color: colors.muted, maxWidth: 340 },
  receipt: { alignSelf: 'stretch', marginTop: spacing.lg },
  confirmationActions: { alignSelf: 'stretch', gap: spacing.sm, marginTop: spacing.lg },
});

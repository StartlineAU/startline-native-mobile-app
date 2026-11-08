import type { PublicWave } from '@/types/api';

export const MAX_PARTICIPANTS = 10;
export const MIN_AGE = 18;
export const PLATFORM_FEE_RATE = 0.0395;
export const PLATFORM_FEE_FIXED = 1.45;

export type RegistrationParticipant = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  email: string;
  mobile: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  medicalNotes: string;
  estimatedFinish: string;
  waiverAccepted: boolean;
  waveLabel: string;
};

export type EmergencyContact = { name: string; phone: string };

export function emptyParticipant(waveLabel = ''): RegistrationParticipant {
  return {
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: '',
    email: '',
    mobile: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    medicalNotes: '',
    estimatedFinish: '',
    waiverAccepted: true,
    waveLabel,
  };
}

export function splitFullName(name: string | null | undefined): {
  firstName: string;
  lastName: string;
} {
  if (!name?.trim()) return { firstName: '', lastName: '' };
  const parts = name.trim().split(/\s+/);
  return { firstName: parts[0] ?? '', lastName: parts.slice(1).join(' ') };
}

export function isWaveOpen(wave: PublicWave, today = new Date().toISOString().slice(0, 10)): boolean {
  const closes = wave.closes || wave.date;
  return !closes || closes >= today;
}

export function priceForTickets(
  waves: PublicWave[],
  quantities: Record<string, number>,
  feeStructure: string,
): { subtotalCents: number; feeCents: number; totalCents: number; ticketCount: number } {
  let subtotalCents = 0;
  let ticketCount = 0;
  for (const [label, quantity] of Object.entries(quantities)) {
    if (quantity <= 0) continue;
    const wave = waves.find((item) => item.label === label);
    if (!wave) continue;
    const price = Number(wave.price ?? 0);
    subtotalCents += Math.round(price * 100) * quantity;
    ticketCount += quantity;
  }

  // Mirrors calculatePlatformFee in the web app: one percentage-plus-fixed
  // fee against the whole order, never a fixed charge per ticket.
  const feeCents =
    feeStructure === 'athlete' && subtotalCents > 0
      ? Math.round(subtotalCents * PLATFORM_FEE_RATE) + Math.round(PLATFORM_FEE_FIXED * 100)
      : 0;

  return { subtotalCents, feeCents, totalCents: subtotalCents + feeCents, ticketCount };
}

export function ticketLabels(
  waves: PublicWave[],
  quantities: Record<string, number>,
): string[] {
  const labels: string[] = [];
  for (const wave of waves) {
    for (let i = 0; i < (quantities[wave.label] ?? 0); i += 1) labels.push(wave.label);
  }
  return labels;
}

export function validateParticipant(
  participant: RegistrationParticipant,
  options: { includeEmergencyContact: boolean },
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!participant.firstName.trim()) errors.firstName = 'First name is required.';
  if (!participant.lastName.trim()) errors.lastName = 'Last name is required.';
  if (!participant.email.trim()) {
    errors.email = 'Email is required.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(participant.email.trim())) {
    errors.email = 'Enter a valid email address.';
  }
  if (!participant.dateOfBirth) {
    errors.dateOfBirth = 'Date of birth is required.';
  } else if (!isAtLeast(participant.dateOfBirth, MIN_AGE)) {
    errors.dateOfBirth = `Participants must be at least ${MIN_AGE}.`;
  }
  if (options.includeEmergencyContact) {
    if (!participant.emergencyContactName.trim()) {
      errors.emergencyContactName = 'Emergency contact is required.';
    }
    if (!participant.emergencyContactPhone.trim()) {
      errors.emergencyContactPhone = 'Emergency contact number is required.';
    }
  }
  if (participant.medicalNotes.length > 200) {
    errors.medicalNotes = 'Keep medical notes to 200 characters.';
  }
  return errors;
}

export function validateEmergencyContact(
  contact: EmergencyContact,
  participants: RegistrationParticipant[],
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!contact.name.trim()) errors.name = 'Emergency contact is required.';
  if (!contact.phone.trim()) errors.phone = 'Emergency contact number is required.';
  if (Object.keys(errors).length > 0) return errors;

  const normalize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');
  const name = normalize(contact.name);
  const phone = contact.phone.replace(/[\s\-()+]/g, '');
  for (const participant of participants) {
    const fullName = normalize(`${participant.firstName} ${participant.lastName}`);
    if (name === fullName || name === normalize(participant.email)) {
      errors.name = 'Emergency contact must be someone other than a participant.';
    }
    if (
      phone &&
      participant.mobile &&
      phone === participant.mobile.replace(/[\s\-()+]/g, '')
    ) {
      errors.phone = 'Emergency contact number must differ from participant mobiles.';
    }
  }
  return errors;
}

export function isAtLeast(iso: string, years: number): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const dob = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(dob.getTime())) return false;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const beforeBirthday =
    today.getMonth() < dob.getMonth() ||
    (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate());
  if (beforeBirthday) age -= 1;
  return age >= years;
}

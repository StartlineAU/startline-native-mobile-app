import {
  emptyParticipant,
  isAtLeast,
  isWaveOpen,
  priceForTickets,
  ticketLabels,
  validateEmergencyContact,
  validateParticipant,
} from '@/lib/registration';
import type { PublicWave } from '@/types/api';

const waves: PublicWave[] = [
  { label: 'Early bird', price: '75', qty: 100 },
  { label: 'General', price: '100', qty: 50 },
];

describe('registration pricing', () => {
  it('adds the platform fee per paid ticket for athlete-paid events', () => {
    const price = priceForTickets(waves, { General: 2 }, 'athlete');
    expect(price.subtotalCents).toBe(20_000);
    expect(price.feeCents).toBe(790 + 145);
    expect(price.totalCents).toBe(20_935);
    expect(price.ticketCount).toBe(2);
  });

  it('does not add a fee when the organiser pays it', () => {
    const price = priceForTickets(waves, { General: 2 }, 'organiser');
    expect(price.totalCents).toBe(20_000);
  });

  it('keeps free tickets free', () => {
    const price = priceForTickets(
      [{ label: 'Free entry', price: '0' }],
      { 'Free entry': 3 },
      'athlete',
    );
    expect(price).toEqual({
      subtotalCents: 0,
      feeCents: 0,
      totalCents: 0,
      ticketCount: 3,
    });
  });
});

describe('ticket selection', () => {
  it('repeats tier labels in display order', () => {
    expect(ticketLabels(waves, { General: 1, 'Early bird': 2 })).toEqual([
      'Early bird',
      'Early bird',
      'General',
    ]);
  });

  it('treats a tier with no close date as open', () => {
    expect(isWaveOpen({ label: 'Open', price: '10' }, '2026-11-08')).toBe(true);
  });

  it('closes a tier after its close date', () => {
    expect(isWaveOpen({ label: 'Closed', date: '2026-11-07' }, '2026-11-08')).toBe(false);
  });
});

describe('participant validation', () => {
  it('requires the core registration fields', () => {
    const errors = validateParticipant(emptyParticipant('General'), {
      includeEmergencyContact: true,
    });
    expect(errors.firstName).toBeDefined();
    expect(errors.lastName).toBeDefined();
    expect(errors.email).toBeDefined();
    expect(errors.dateOfBirth).toBeDefined();
    expect(errors.emergencyContactName).toBeDefined();
    expect(errors.emergencyContactPhone).toBeDefined();
  });

  it('enforces the server-side 18+ participant rule', () => {
    const participant = {
      ...emptyParticipant('General'),
      firstName: 'Test',
      lastName: 'Athlete',
      email: 'athlete@example.com',
      dateOfBirth: new Date().toISOString().slice(0, 10),
      emergencyContactName: 'Emergency',
      emergencyContactPhone: '0400000000',
    };
    expect(validateParticipant(participant, { includeEmergencyContact: true }).dateOfBirth).toMatch(
      /at least 18/i,
    );
  });

  it('accepts a complete adult participant', () => {
    const participant = {
      ...emptyParticipant('General'),
      firstName: 'Test',
      lastName: 'Athlete',
      email: 'athlete@example.com',
      dateOfBirth: '1990-01-01',
      emergencyContactName: 'Emergency',
      emergencyContactPhone: '0400000000',
    };
    expect(validateParticipant(participant, { includeEmergencyContact: true })).toEqual({});
  });

  it('rejects the participant as their own emergency contact', () => {
    const participant = {
      ...emptyParticipant('General'),
      firstName: 'Test',
      lastName: 'Athlete',
      email: 'athlete@example.com',
      dateOfBirth: '1990-01-01',
      mobile: '0400000000',
    };
    expect(
      validateEmergencyContact({ name: 'Test Athlete', phone: '0400000000' }, [participant]).name,
    ).toBeDefined();
  });
});

describe('age', () => {
  it('accepts someone born 18 years ago today', () => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 18);
    expect(isAtLeast(date.toISOString().slice(0, 10), 18)).toBe(true);
  });

  it('rejects a future birth date', () => {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    expect(isAtLeast(date.toISOString().slice(0, 10), 18)).toBe(false);
  });
});

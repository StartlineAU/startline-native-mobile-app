export interface PublicWave {
  label: string;
  date?: string;
  price?: string;
  qty?: number;
  closes?: string;
  startTime?: string;
}

export interface EventOrganiser {
  id: string;
  orgName: string | null;
  logoUrl: string | null;
  stripeAccountId?: string | null;
  stripeOnboardingComplete?: boolean;
  rating?: { average: number; count: number } | null;
}

export interface PublicEvent {
  id: string;
  slug: string | null;
  title: string;
  discipline: string;
  description: string | null;
  eventDate: string;
  endDate: string | null;
  startTime: string;
  endTime: string;
  status: string;
  timeZone: string;
  startsAtUtc: string | null;
  endsAtUtc: string | null;
  venue: string;
  address: string | null;
  city: string;
  state: string;
  latitude: number | null;
  longitude: number | null;
  format: string;
  level: string;
  categories: unknown;
  cap: number | null;
  minAge: number | null;
  waves: unknown;
  extras: string | null;
  refundPolicy: string | null;
  refundTiers: unknown;
  coverImageUrl: string | null;
  photos: string[];
  informationPdfs: { url: string; label: string | null; name: string | null }[];
  registrationType: string;
  registrationUrl: string | null;
  feeStructure: string;
  fromPrice: number | null;
  registrationCount: number;
  organiserId: string;
  organiser: EventOrganiser;
}

export interface EventListResponse {
  events: PublicEvent[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  suggestions: PublicEvent[];
  otherEvents: PublicEvent[];
}

export interface EventDetailResponse {
  event: PublicEvent;
  prizePool: { amount: number; details?: string | null } | null;
  organiserName: string;
  organiserRating: { average: number; count: number } | null;
  organiserReviews: PublicReview[];
}

export interface PublicReview {
  id: string;
  overallRating: number;
  atmosphereRating: number | null;
  organisationRating: number | null;
  experienceRating: number | null;
  title: string;
  body: string;
  reviewerName: string;
  eventTitle: string | null;
  createdAt: string;
}

export interface AvailabilityResponse {
  cap: number | null;
  confirmed: number;
  waves: { label: string; qty: number | null; confirmed: number }[];
}

export type RegistrationStatus = 'CONFIRMED' | 'REFUND_REQUESTED' | 'REFUNDED' | 'CANCELLED';

export interface UserRegistration {
  id: string;
  eventId: string;
  status: RegistrationStatus;
  athleteName: string;
  wave: string | null;
  bibNumber: string | null;
  checkedInAt: string | null;
  checkInState: string;
  checkInOpensAt: string | null;
  checkInClosesAt: string | null;
  timeZone: string;
  paidCents: number;
  refundAmountCents: number;
  refundPercent: number;
  outsidePolicy: boolean;
  ticketCents: number;
  feeCents: number;
  policyLines: string[];
  daysUntilEvent: number;
  resultTime?: string | null;
  resultPlacement?: string | null;
  event: {
    id: string;
    title: string;
    discipline: string;
    eventDate: string;
    endDate: string | null;
    startTime: string;
    endTime: string;
    timeZone: string;
    startsAtUtc: string | null;
    endsAtUtc: string | null;
    status: string;
    city: string;
    state: string;
    coverImageUrl: string | null;
  };
}

export interface UserNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  eventId: string | null;
  read: boolean;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  username: string | null;
  bio: string | null;
  profilePicUrl: string | null;
  isPublic: boolean;
  city: string | null;
  state: string | null;
  mobile: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  notifyFollowedOrganiserEvents: boolean;
  createdAt: string;
  organiser: {
    id: string;
    orgName: string | null;
    logoUrl: string | null;
    verified: boolean;
  } | null;
  history: {
    completed: number;
    registrations: UserRegistration[];
  };
}

export interface FollowingOrganiser {
  followId: string;
  followedAt: string;
  id: string;
  orgName: string | null;
  logoUrl: string | null;
  followers: number;
  eventsHosted: number;
  registrations: number;
}

export interface CheckoutResponse {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  platformFee: number;
  participantCount: number;
}

export interface ApiErrorBody {
  error?: string;
  code?: string;
  reason?: string;
  free?: boolean;
}

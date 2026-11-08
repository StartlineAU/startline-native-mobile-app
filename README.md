# Startline Mobile

Native iOS and Android app for Startline, built with Expo and React Native.

The app is an athlete-first client for the existing Startline web platform. It
talks to the Next.js API rather than embedding the website in a WebView.

## Requirements

- Node.js 20+
- pnpm
- Xcode and/or Android Studio for local native builds
- Startline web app running locally on port 3000, or a staging API URL

## Setup

```bash
pnpm install
cp .env.example .env.local
pnpm start
```

The app derives the local API host from the Expo development server, so a
physical device can reach the web app running on the development machine.
Override it with `EXPO_PUBLIC_API_URL` if needed.

Native modules such as Stripe require a development build:

```bash
npx expo run:ios
npx expo run:android
```

## Checks

```bash
pnpm lint
pnpm typecheck
pnpm test
npx expo-doctor
```

## Simulator smoke tests

The Maestro flows in `maestro/` cover event browsing, event detail, entry into
registration, sign-in and the athlete profile. They require the local API, Metro,
a seeded development database and an installed development build.

```bash
export PATH="$PATH:$HOME/.maestro/bin"
maestro --device <simulator-udid> test maestro/athlete-browse.yaml
maestro --device <simulator-udid> test maestro/athlete-auth.yaml
```

The auth flow defaults to the shared seed athlete
`sarah.mitchell@startline.test` / `Password123!`; override `SEED_EMAIL` and
`SEED_PASSWORD` with `-e` for another development account.

Unsigned Simulator builds cannot access the Keychain. In development only,
SecureStore falls back to in-memory token storage so sign-in can be tested; the
fallback is never used in a production build.

## Backend integration

The app calls the existing Next.js APIs. Signed-in requests send the Cognito
access token as `Authorization: Bearer …` and the ID token as `X-Id-Token`.
The matching backend change lives on the `feat/mobile-native-auth` branch of
`startline-web-app`; it verifies both tokens and preserves the existing web
cookie authentication.

Production bot protection uses the hosted challenge at
`/mobile/challenge`. When an API returns `BOT_CHECK_REQUIRED` or
`BOT_CHECK_FAILED`, the app opens that page in the system browser and retries
with the returned Turnstile token. Staging and local development intentionally
fail open on the server.

Stripe payments use PaymentSheet and the existing `/api/checkout` PaymentIntent.
Paid registrations are still created by the web Stripe webhook, so the app shows
“payment received / entry being confirmed” until the server confirms the entry.

## App identity

- Bundle/application ID: `com.startlineau.app`
- URL scheme: `com.startlineau.app://`
- OAuth callback: `com.startlineau.app://auth/callback`
- Universal links: `https://startlineau.com/events/*` and `/activity*`

Apple Team ID, Android signing fingerprints and store credentials are not
committed. They must be configured before an association file or store build is
published.

## Runtime configuration

Only public configuration belongs in Expo environment variables. Cognito client
secrets, Stripe secret keys and all other credentials stay on the server.

See `.env.example` for supported values.

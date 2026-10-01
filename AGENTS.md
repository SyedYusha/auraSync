# AuraSync+ Agent Instructions

## Project
AuraSync+ is a premium dark fitness/wellness intelligence prototype built with Expo SDK 57, Expo Router, React Native, TypeScript and Supabase.

## Product boundaries
- Member experience: personal health/activity/recovery, AI Coach, workouts, plans, history and reports.
- Gym owner experience: members, attendance, memberships/payments, trainers and churn intelligence.
- Future wearable: conceptual AuraSync+ band; do not claim hardware exists.
- This is fitness/wellness intelligence, not medical diagnosis or treatment.

## UX and brand
- English UI.
- Obsidian black / deep teal surfaces with electric cyan and violet accents.
- Inter-style typography, premium glass cards, high contrast.
- Responsive from 320px mobile through desktop web. Never introduce horizontal overflow.
- Preserve clear loading, empty, error and demo states.
- Never fabricate personal biometric data. Demo data must be visibly labeled.

## Data rules
- New real users start with empty health/activity history.
- Personal health values only appear after an actual connected/manual data source.
- Keep demo mode isolated from real-user mode.
- Derived recovery/readiness is a fitness prototype signal, not a medical measurement.
- Keep secrets server-side. Never place OpenAI, Gemini, DeepSeek, Supabase service-role or other private keys in client code.

## Workout rules
- Use the canonical 100-exercise library in src/domain/workout/exerciseLibrary.ts.
- Do not force a default Chest workout.
- Support custom workouts, 2–7 day plans, active workout controls, history and completed-workout persistence.

## Reports
- Reports must support 7/30 day summaries.
- Branded PDF generation uses Expo Print on native; web should use the browser print flow.
- PDF branding should use AuraSync+ wordmark, tagline, dark/cyan visual language and responsible-fitness disclaimer.
- Reports summarize wellness signals; they are not medical reports.

## AI
- AI providers are routed server-side through server/aiRouter.ts.
- Supported provider order: OpenAI, Gemini, DeepSeek.
- Use Vercel/server environment variables for API keys.
- AI Coach must only reason from supplied context and must not invent biometrics or diagnose.

## Verification
Before considering a feature complete:
1. npm run typecheck
2. npm run lint
3. npm test
4. npx expo export --platform web
5. Check narrow mobile widths and desktop web for overflow.
6. Review changed files before commit.

Read the exact Expo SDK 57 docs before making Expo-specific changes.

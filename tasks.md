# MyArisan MVP Tasks

This roadmap breaks the MVP into small milestones for a solo builder. Complete each milestone with focused commits before moving on.

## 1. Foundation Check

- Confirm the App Router structure under `app/` and keep the no-`src` layout.
- Read the relevant local Next.js docs in `node_modules/next/dist/docs/` before changing framework code.
- Add basic project conventions for routes, components, server utilities, and environment access.
- Decide where shared domain code will live, such as `lib/`, `db/`, and `components/`.
- Keep this milestone documentation-only or structure-only. Do not build product features here.

## 2. UI Base And Landing Page

- Set up shadcn/ui if it is not already configured.
- Create a clean mobile-first app shell and typography baseline.
- Build the MVP landing page sections: hero, problem, how it works, features, pricing, FAQ, and final CTA.
- Use the PRD copy as the source for headline, subheadline, and CTA text.
- Keep dashboard and auth work out of this milestone.

## 3. Database And ORM Setup

- Install and configure Drizzle ORM and Neon PostgreSQL only when implementation begins.
- Add typed schema definitions for users, arisan groups, memberships, periods, payments, plans, subscriptions, invoices, usage counters, message logs, notifications, and audit logs.
- Add migrations and seed data for MVP plans: Free, Basic, Pro, Premium.
- Add safe database client utilities.
- Verify migrations against a development database.

## 4. Auth Skeleton

- Build phone number + 4-digit PIN login.
- Hash PINs before saving.
- Add session handling.
- Add logout.
- Add reset-PIN instructions on the web login page: users must chat `reset pin` to MyArisan from their WhatsApp number.
- Do not add WhatsApp OTP.

## 5. Membership And Access Control

- Implement membership lookup for the current user.
- Add arisan switcher for users with multiple groups.
- Add route guards that validate `user_id + arisan_group_id + role`.
- Add admin/member role checks.
- Add owner access detection using `OWNER_PHONE`.
- Test that members cannot access admin routes or other members' payment proofs.

## 6. Arisan Core

- Build create-arisan flow for admin.
- Store name, amount per period, period type, due day, and bank account text.
- Add member creation by pasted names.
- Generate and display a join code.
- Build member claim-name flow using the join code.
- Create the first active period for an arisan group.

## 7. Dashboard MVP

- Build admin home with group name, active period, package status, member count, payment progress, total collected, pending proofs, unpaid members, and current turn.
- Build member home with payment status, amount, due date, admin bank account, current turn, and own payment history.
- Add navigation for Ringkasan, Pembayaran, Anggota, Giliran, Rekap, and Paket.
- Keep all layouts mobile-first with large readable text and easy tap targets.

## 8. Payment Proof Manual Flow

- Add payment proof upload from member dashboard.
- Create pending payment records.
- Build admin pending proof list and proof detail.
- Add admin actions: `Terima`, `Tolak`, and `Edit nominal`.
- Update payment status and totals after confirmation.
- Add manual payment entry for admins when automatic proof quota is exhausted.

## 9. OCR And AI Parsing

- Add image storage for uploaded proof files.
- Add image hashing for duplicate checks.
- Add OCR provider integration or placeholder behind a provider interface.
- Add DeepSeek parser integration that returns the PRD JSON shape.
- Store OCR text and AI result JSON on the payment.
- Keep all AI-parsed payments in `pending`; never auto-confirm.
- Apply monthly automatic-proof usage limits per package.

## 10. Recap And Collection Text

- Generate admin recap text for the active period.
- Generate collection text listing unpaid members.
- Add copy-to-clipboard actions in the dashboard.
- Add payment status counts: paid, unpaid, waiting review, rejected, partial/manual where needed.
- Include current turn/giliran in recap text.

## 11. Giliran Management

- Add manual turn ordering.
- Add randomize-order action.
- Add current-period draw member selection.
- Add draw history display.
- Ensure members can view the current turn but cannot edit it.

## 12. Package And Manual QRIS Flow

- Build package page with plan, active-until date, member limit, automatic-proof quota, and usage.
- Create invoice when admin chooses a plan.
- Show manual QRIS instructions and upload field.
- Move invoice through `pending`, `pending_verification`, `paid`, `rejected`, and `expired`.
- Allow proof re-upload after rejection.

## 13. Owner Dashboard

- List pending package invoices.
- Show admin, phone number, arisan name, package, amount, proof image, and upload time.
- Add owner actions: accept and reject.
- On accept, mark invoice paid and activate or extend subscription for 30 days.
- Show active subscriptions and basic usage.

## 14. Subscription Gates

- Enforce member limits by plan.
- Enforce monthly automatic-proof limits.
- Allow expired groups to log in and read old data.
- Block expired groups from new OCR/AI processing, new payment confirmation, new periods, and member additions above the Free limit.
- Show upgrade guidance using simple Indonesian copy.

## 15. WhatsApp Webhook Foundation

- Add webhook verification endpoint.
- Receive and log inbound WhatsApp messages.
- Update `last_inbound_at` and `service_window_until` for inbound users.
- Add a deterministic command router.
- Add the guarded WhatsApp send service before any outbound message is implemented.
- Log skipped outbound attempts and create dashboard notifications.

## 16. WhatsApp Bot MVP Commands

- Implement shared `menu`, `dashboard`, `bantuan`, and `reset pin` flows.
- Implement member commands: `join`, `bayar`, `status`, `rekening`, `giliran`, and `riwayat`.
- Implement admin commands: `buat arisan`, `rekap`, `belum bayar`, `tagih`, `konfirmasi`, `anggota`, `giliran`, and `paket`.
- Keep commands rule-based.
- Reuse dashboard/domain services rather than duplicating business logic inside the bot.

## 17. Hardening And Acceptance Pass

- Add tests for auth, access control, payment confirmation, subscription gates, and WhatsApp send guard.
- Verify no OTP WhatsApp flow exists.
- Verify no automatic reminder or group bot behavior exists.
- Verify no WhatsApp send bypasses the service-window guard.
- Check mobile layouts for login, admin dashboard, member dashboard, payment review, package page, and owner dashboard.
- Run lint/build and fix only issues related to the MVP work.

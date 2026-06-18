# MyArisan Project Context

MyArisan is a mobile-first SaaS for Indonesian arisan admins and members. The product combines a WhatsApp DM bot with a web dashboard so admins can track transfer proofs, confirm payments, manage turns, and copy clean recaps back into their existing WhatsApp groups.

## Current Project Shape

- Next.js App Router project with no `src` directory.
- App routes live under `app/`.
- Target stack: Next.js, TypeScript, Neon PostgreSQL, Drizzle ORM, shadcn/ui, Tailwind CSS.
- Product source of truth is `prd.md`; this file is the short implementation context for future Codex tasks.
- Work incrementally. Do not build the whole product in one pass.

## MVP Boundaries

Build only the MVP:

- Landing page.
- Phone number + 4-digit PIN auth, with hashed PINs.
- Admin and member mobile-first dashboards.
- Arisan group creation, member management, join code flow, and arisan switcher.
- Payment proof upload, OCR/AI parsing, pending payment review, and admin confirmation.
- Recap and collection text that admins can copy to WhatsApp groups.
- Manual QRIS subscription flow with owner approval.
- WhatsApp DM bot commands and webhook handling.
- Strict 24-hour WhatsApp service-window send guard.

Do not build these for MVP:

- WhatsApp group bot.
- WhatsApp OTP.
- Automatic personal reminders.
- Auto-recurring payments or dynamic QRIS gateway.
- Shared account, escrow, lending, investment, bank integration, or native mobile app.
- Any WhatsApp outbound message outside the service window by default.

## Product Rules That Affect Code

- Subscription applies per `arisan_group`, not per user.
- Admin remains responsible for arisan funds; MyArisan does not hold or process member funds.
- AI/OCR may parse transfer proofs but must never auto-confirm a payment.
- All parsed proofs enter an admin-review state first.
- Basic bot commands should be deterministic and rule-based. Use AI only for transfer-proof parsing and ambiguous proof captions.
- Every dashboard request must validate `user_id + arisan_group_id + role`; do not trust URL params alone.
- Members cannot view other members' proof images and cannot confirm payments.
- Owner dashboard is for QRIS proof review, subscription activation, usage, and basic system visibility.

## WhatsApp Cost Guard

Whenever a user sends an inbound WhatsApp message, store:

- `last_inbound_at = now`
- `service_window_until = now + 24 hours`

All WhatsApp sending must go through one guarded service:

- If the current time is inside `service_window_until`, send the service message and log `free_window`.
- If outside the window, do not send WhatsApp. Create a dashboard notification and log `skipped_outside_window`.

No OTP, reminders, broadcasts, or automatic personal notifications should bypass this guard.

## Key Data Model Draft

Core tables expected by the MVP:

- `users`: phone, name, PIN hash, WhatsApp service-window timestamps.
- `arisan_groups`: admin, name, amount, period type, due day, bank account text, status.
- `memberships`: group, user, role, display name, join status.
- `periods`: group period name, dates, draw member, status.
- `payments`: group, period, member, amount, status, proof image, OCR text, AI JSON, confirmation fields.
- `plans`: package limits and feature metadata.
- `subscriptions`: group-level plan status and active period.
- `invoices`: manual QRIS package payment proof and owner verification state.
- `usage_counters`: monthly automatic-proof usage per group.
- `message_logs`: WhatsApp inbound/outbound processing and cost logs.
- `dashboard_notifications`: fallback notifications when WhatsApp send is skipped.
- `audit_logs`: important admin, owner, and payment actions.

## User-Facing Language

Use simple Indonesian UI terms:

- `Rekap`
- `Sudah Bayar`
- `Belum Bayar`
- `Menunggu Dicek`
- `Kirim Bukti`
- `Terima`
- `Tolak`
- `Edit`
- `Tagih`
- `Giliran`
- `Salin ke Grup`
- `Paket`
- `Aktif Sampai`

Avoid exposing technical words such as subscription, tenant, OCR, parser, webhook, pending verification, authentication, and invoice in user-facing UI. Prefer `Paket`, `Tagihan Paket`, `Menunggu Dicek`, `Baca Bukti Otomatis`, and `Halaman Arisan`.

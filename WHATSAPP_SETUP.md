# WhatsApp Cloud API Setup

MyArisan supports direct-message text commands and payment-proof images through
the Meta WhatsApp Cloud API webhook.

## Required environment variables

Add these values to `.env.local` locally and to the production environment:

```env
NEXT_PUBLIC_APP_URL=https://your-domain.example
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_VERIFY_TOKEN=
WHATSAPP_API_VERSION=v20.0
```

- `WHATSAPP_ACCESS_TOKEN`: Meta Cloud API access token.
- `WHATSAPP_PHONE_NUMBER_ID`: phone number ID shown in WhatsApp API Setup.
- `WHATSAPP_VERIFY_TOKEN`: a private string you choose. Meta sends it back only
  during webhook verification.
- `WHATSAPP_API_VERSION`: Graph API version used for media and message requests.
- `NEXT_PUBLIC_APP_URL`: public MyArisan URL used in dashboard and join links.

Never commit real access tokens.

## Expose localhost with ngrok

Run MyArisan:

```powershell
npm run dev
```

In another terminal:

```powershell
ngrok http 3000
```

Use the HTTPS forwarding URL printed by ngrok, for example:

```text
https://example.ngrok-free.app
```

Set `NEXT_PUBLIC_APP_URL` to that URL while testing public links.

## Configure the Meta webhook

In Meta App Dashboard, open WhatsApp > Configuration and configure:

```text
Callback URL:
https://your-public-domain/api/whatsapp/webhook

Verify token:
the exact value of WHATSAPP_VERIFY_TOKEN
```

Subscribe the WhatsApp Business Account to the `messages` webhook field. The
same field delivers inbound messages and message status events. MyArisan
acknowledges status-only deliveries but does not process them in the MVP.

## Test verification locally

With the development server running:

```powershell
curl.exe "http://localhost:3000/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=12345"
```

A valid token returns plain text:

```text
12345
```

An invalid or missing token returns HTTP 403.

## Quick message tests

Before connecting Meta, the development simulators remain available:

```powershell
curl.exe -X POST "http://localhost:3000/api/dev/whatsapp-simulate" `
  -H "Content-Type: application/json" `
  -d "{\"from\":\"6283333333333\",\"text\":\"menu\"}"
```

```powershell
curl.exe -X POST "http://localhost:3000/api/dev/whatsapp-simulate-proof" `
  -F "from=6283333333333" `
  -F "caption=Transfer periode ini" `
  -F "file=@C:\path\to\bukti.png;type=image/png"
```

After Meta is connected, send `menu` or an image from a registered test number.
Check the terminal for development-only webhook summaries and verify image
proofs under the arisan's **Konfirmasi Bukti** page.

## MVP messaging guard

MyArisan sends only free-form service messages inside the user's active 24-hour
service window. Every outbound message goes through the guarded sender. Outside
the window, the Cloud API is not called.

Do not enable paid template messages, WhatsApp OTP, personal reminders, or
automatic broadcasts for the MVP.

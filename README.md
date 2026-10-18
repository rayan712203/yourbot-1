# YOURBOT — Trading Software Storefront

Premium trading software website with **Stripe** + **PayPal** payment integration, deployed on **Vercel**.

## 🚀 Deploy to Vercel

### Option 1: GitHub (Recommended)
1. Push this folder to a **GitHub repo**
2. Go to [vercel.com](https://vercel.com) → **New Project** → Import your repo
3. Add Environment Variables (see below)
4. Click **Deploy**

### Option 2: Vercel CLI
```bash
npm i -g vercel
cd yourbot
vercel
```

## 🔑 Environment Variables (Set in Vercel Dashboard)

Go to **Project Settings → Environment Variables** and add:

| Variable | Description | Required? |
|----------|-------------|-----------|
| `STRIPE_SECRET_KEY` | Your Stripe secret key (starts with `sk_live_` or `sk_test_`) | For real payments |
| `STRIPE_PUBLISHABLE_KEY` | Your Stripe publishable key (starts with `pk_live_` or `pk_test_`) | For real payments |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret (starts with `whsec_`) | For payment confirmation |
| `PAYPAL_CLIENT_ID` | PayPal app client ID | For PayPal payments |
| `PAYPAL_MODE` | `sandbox` or `live` | Optional (default: sandbox) |

> **Without these keys**, the site runs in **demo mode** — checkout works but generates simulated licence keys. No real money is charged.

## 📁 Project Structure

```
yourbot/
├── public/               # Static frontend files
│   ├── index.html        # Main website page
│   ├── styles.css        # Premium design system
│   ├── app.js            # Checkout, TradingView, UI logic
│   └── success.html      # Post-payment redirect page
├── api/                  # Vercel Serverless Functions
│   ├── _helpers.js       # Shared config & products
│   ├── config.js         # GET /api/config — public keys
│   ├── checkout.js       # POST /api/checkout — payment processing
│   └── webhook.js        # POST /api/webhook — Stripe webhooks
├── vercel.json           # Vercel deployment config
├── package.json
└── dev.js                # Local dev server (optional)
```

## 💳 Setting Up Stripe

1. Create a [Stripe account](https://dashboard.stripe.com/register)
2. Get your keys from **Developers → API Keys**
3. Set up a webhook endpoint: `https://your-domain.vercel.app/api/webhook`
4. Select event: `checkout.session.completed`
5. Copy the webhook signing secret

## 🅿️ Setting Up PayPal

1. Create a [PayPal Developer account](https://developer.paypal.com)
2. Create an app in **My Apps & Credentials**
3. Copy the **Client ID**
4. Use `sandbox` mode for testing, `live` for real payments

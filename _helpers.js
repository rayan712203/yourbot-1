// ═══════════════════════════════════════════════════════════
//  Shared helpers for all API routes
// ═══════════════════════════════════════════════════════════
const crypto = require('crypto');

const PRODUCTS = {
  mt5: {
    id: 'mt5',
    name: 'MT5 Forex Bot',
    description: 'Automated MetaTrader 5 Expert Advisor — 12-month licence',
    price: 10000,
    displayPrice: '$100.00',
    currency: 'usd',
    term: '12 months',
    features: [
      '1 device + 1 MT5 account',
      'Updates during licence term',
      'Installation guide included',
      'Demo-account testing recommended'
    ]
  },
  crypto: {
    id: 'crypto',
    name: 'Crypto Bot',
    description: 'Crypto spot exchange automation — 12-month licence',
    price: 15000,
    displayPrice: '$150.00',
    currency: 'usd',
    term: '12 months',
    features: [
      '1 device + 1 exchange account',
      'Paper mode / testnet supported',
      'Updates during licence term',
      'Withdraw-disabled API keys recommended'
    ]
  }
};

function generateLicenceKey() {
  const seg = () => crypto.randomBytes(4).toString('hex').toUpperCase();
  return `YB-${seg()}-${seg()}-${seg()}-${seg()}`;
}

function generateOrderId() {
  return 'ORD-' + Date.now().toString(36).toUpperCase() + '-' + crypto.randomBytes(3).toString('hex').toUpperCase();
}

// In-memory store (Vercel serverless is stateless per invocation,
// so for production you'd use a database like Vercel KV, Supabase, etc.)
// For demo purposes, orders are returned to the client directly.
const STRIPE_SECRET_KEY      = process.env.STRIPE_SECRET_KEY      || 'sk_test_REPLACE_ME';
const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_REPLACE_ME';
const STRIPE_WEBHOOK_SECRET  = process.env.STRIPE_WEBHOOK_SECRET  || 'whsec_REPLACE_ME';
const PAYPAL_CLIENT_ID       = process.env.PAYPAL_CLIENT_ID       || 'AZDxjDScFpQtjWTOUtWKbyN_bDt4OgqaF4eYXlewfBP4-8aqX3PiV8e1GWU6liB2CUXlkA59kJXE7M6R';
const PAYPAL_MODE            = process.env.PAYPAL_MODE            || 'sandbox';

module.exports = {
  PRODUCTS,
  generateLicenceKey,
  generateOrderId,
  STRIPE_SECRET_KEY,
  STRIPE_PUBLISHABLE_KEY,
  STRIPE_WEBHOOK_SECRET,
  PAYPAL_CLIENT_ID,
  PAYPAL_MODE
};

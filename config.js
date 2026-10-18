// GET /api/config — returns public keys & product info to frontend
const helpers = require('./_helpers');

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();

  res.status(200).json({
    stripePublishableKey: helpers.STRIPE_PUBLISHABLE_KEY,
    paypalClientId: helpers.PAYPAL_CLIENT_ID,
    paypalMode: helpers.PAYPAL_MODE,
    products: helpers.PRODUCTS
  });
};

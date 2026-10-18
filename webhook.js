// POST /api/webhook — Stripe webhook to confirm payments
const helpers = require('./_helpers');

// Vercel needs raw body for Stripe signature verification
module.exports.config = { api: { bodyParser: false } };

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(204).end();
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (helpers.STRIPE_WEBHOOK_SECRET === 'whsec_REPLACE_ME') {
    return res.status(200).json({ received: true, demo: true });
  }

  try {
    const stripe = require('stripe')(helpers.STRIPE_SECRET_KEY);

    // Read raw body
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const rawBody = Buffer.concat(chunks).toString('utf8');

    const sig = req.headers['stripe-signature'];
    const event = stripe.webhooks.constructEvent(rawBody, sig, helpers.STRIPE_WEBHOOK_SECRET);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      // In production, update your database here
      console.log(`✅ Payment confirmed for session ${session.id}, product: ${session.metadata?.productId}, email: ${session.metadata?.email}`);
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err.message);
    res.status(400).json({ error: 'Webhook verification failed' });
  }
};

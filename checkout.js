// POST /api/checkout — handles Stripe & PayPal checkout
const helpers = require('./_helpers');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = req.body;
  const method = body.method; // 'stripe' or 'paypal'
  const product = helpers.PRODUCTS[body.productId];

  if (!product) return res.status(400).json({ error: 'Invalid product selected' });

  const email = (body.email || '').trim();
  if (!email || !email.includes('@')) return res.status(400).json({ error: 'A valid email address is required' });

  // ── STRIPE ────────────────────────────────────────────
  if (method === 'stripe') {
    // Demo mode — Stripe not configured
    if (helpers.STRIPE_SECRET_KEY === 'sk_test_REPLACE_ME') {
      const order = {
        id: helpers.generateOrderId(),
        productName: product.name,
        email,
        amount: product.displayPrice,
        method: 'stripe',
        status: 'completed',
        licenceKey: helpers.generateLicenceKey(),
        createdAt: new Date().toISOString(),
        demo: true
      };
      return res.status(200).json({
        success: true,
        demo: true,
        order,
        message: 'Demo mode — Stripe keys not configured yet. This is a simulated successful payment.'
      });
    }

    // Real Stripe Checkout Session
    try {
      const stripe = require('stripe')(helpers.STRIPE_SECRET_KEY);
      const origin = body.origin || req.headers.origin || req.headers.referer?.replace(/\/+$/, '') || 'https://yourbot.vercel.app';

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        customer_email: email,
        line_items: [{
          price_data: {
            currency: product.currency,
            product_data: {
              name: product.name,
              description: product.description
            },
            unit_amount: product.price
          },
          quantity: 1
        }],
        mode: 'payment',
        success_url: `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}&product=${product.id}`,
        cancel_url: `${origin}/#checkout`,
        metadata: { productId: product.id, email }
      });

      return res.status(200).json({
        success: true,
        sessionId: session.id,
        url: session.url
      });
    } catch (err) {
      console.error('Stripe error:', err.message);
      return res.status(500).json({ error: 'Payment processing error: ' + err.message });
    }
  }

  // ── PAYPAL ────────────────────────────────────────────
  if (method === 'paypal') {
    const order = {
      id: helpers.generateOrderId(),
      productName: product.name,
      email,
      amount: product.displayPrice,
      method: 'paypal',
      status: body.paypalOrderId ? 'completed' : 'pending',
      licenceKey: helpers.generateLicenceKey(),
      createdAt: new Date().toISOString(),
      paypalOrderId: body.paypalOrderId || null,
      paypalPayerId: body.paypalPayerId || null
    };

    return res.status(200).json({
      success: true,
      order,
      message: order.status === 'completed'
        ? 'Payment received successfully! Your licence key is ready.'
        : 'Order created — awaiting PayPal confirmation.'
    });
  }

  return res.status(400).json({ error: 'Invalid payment method. Use "stripe" or "paypal".' });
};

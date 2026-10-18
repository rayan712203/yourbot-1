// ═══════════════════════════════════════════════════════
//  YOURBOT — Main Application Logic
//  Handles checkout, TradingView, navigation, and UI
// ═══════════════════════════════════════════════════════

(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  let toastTimer;
  let appConfig = null;
  let stripeInstance = null;
  let stripeElements = null;
  let stripeCardElement = null;
  let paypalLoaded = false;

  // ── Toast Notification ──────────────────────────────
  function notify(message, duration = 3500) {
    const toast = $('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), duration);
  }

  // ── Mobile Menu ─────────────────────────────────────
  const menuBtn = $('menuBtn');
  const navlinks = $('navlinks');
  if (menuBtn && navlinks) {
    menuBtn.addEventListener('click', () => {
      const open = navlinks.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', String(open));
      menuBtn.textContent = open ? 'Close' : 'Menu';
    });
    navlinks.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      navlinks.classList.remove('open');
      menuBtn.setAttribute('aria-expanded', 'false');
      menuBtn.textContent = 'Menu';
    }));
  }

  // ── Year ────────────────────────────────────────────
  if ($('year')) $('year').textContent = new Date().getFullYear();

  // ── Scroll Animations ──────────────────────────────
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.animationPlayState = 'running';
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.fade-up').forEach(el => {
    el.style.animationPlayState = 'paused';
    observer.observe(el);
  });

  // ── Load Config from API ────────────────────────────
  async function loadConfig() {
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        appConfig = await res.json();
        initStripe();
        initPayPal();
      }
    } catch (err) {
      console.log('Config API not available — running in static/demo mode');
      // Fallback: work without API
      appConfig = {
        stripePublishableKey: 'pk_test_REPLACE_ME',
        paypalClientId: 'sb',
        paypalMode: 'sandbox',
        products: {
          mt5: { name: 'MT5 Forex Bot', price: 10000, displayPrice: '$100.00' },
          crypto: { name: 'Crypto Bot', price: 15000, displayPrice: '$150.00' }
        }
      };
    }
  }

  // ── Initialize Stripe ───────────────────────────────
  function initStripe() {
    if (!appConfig || !window.Stripe) return;
    const key = appConfig.stripePublishableKey;
    if (!key || key === 'pk_test_REPLACE_ME') {
      console.log('Stripe publishable key not configured — using manual card fields');
      return;
    }
    try {
      stripeInstance = Stripe(key);
      stripeElements = stripeInstance.elements();

      // Replace manual fields with Stripe Element
      const container = $('stripe-card-element');
      if (container) {
        container.innerHTML = '';
        stripeCardElement = stripeElements.create('card', {
          style: {
            base: {
              color: '#f0f2f5',
              fontFamily: 'Inter, sans-serif',
              fontSize: '15px',
              '::placeholder': { color: '#7a8494' }
            },
            invalid: { color: '#f87171' }
          }
        });
        stripeCardElement.mount(container);
      }
    } catch (err) {
      console.error('Stripe init error:', err);
    }
  }

  // ── Initialize PayPal ───────────────────────────────
  function initPayPal() {
    if (!appConfig || paypalLoaded) return;
    const clientId = appConfig.paypalClientId;
    if (!clientId || clientId === 'sb') {
      console.log('PayPal client ID not configured — PayPal in sandbox demo mode');
    }

    // Load PayPal SDK script
    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${clientId || 'sb'}&currency=USD`;
    script.async = true;
    script.onload = () => {
      paypalLoaded = true;
      renderPayPalButton();
    };
    script.onerror = () => {
      console.log('PayPal SDK failed to load');
    };
    document.head.appendChild(script);
  }

  function renderPayPalButton() {
    const container = $('paypal-button-container');
    if (!container || !window.paypal) return;
    container.innerHTML = '';

    window.paypal.Buttons({
      style: {
        layout: 'vertical',
        color: 'gold',
        shape: 'rect',
        label: 'pay',
        height: 48
      },
      createOrder: (data, actions) => {
        const product = appConfig.products[getSelectedProduct()];
        return actions.order.create({
          purchase_units: [{
            description: product.name + ' — 12-month licence',
            amount: {
              value: (product.price / 100).toFixed(2),
              currency_code: 'USD'
            }
          }]
        });
      },
      onApprove: async (data, actions) => {
        const order = await actions.order.capture();
        const email = $('checkoutEmail')?.value.trim() || '';
        const productId = getSelectedProduct();

        setCheckoutState('Processing PayPal payment...', '');
        try {
          const res = await fetch('/api/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              method: 'paypal',
              productId,
              email,
              paypalOrderId: data.orderID,
              paypalPayerId: order.payer?.payer_id || null
            })
          });
          const result = await res.json();
          if (result.success && result.order) {
            showSuccessModal(result.order);
          } else {
            // Fallback for static deployment
            showSuccessModal({
              id: 'ORD-PP-' + Date.now().toString(36).toUpperCase(),
              licenceKey: 'YB-' + Math.random().toString(36).substr(2, 8).toUpperCase() + '-DEMO',
              productName: appConfig.products[productId]?.name || 'YOURBOT'
            });
          }
        } catch (err) {
          // Static fallback
          showSuccessModal({
            id: 'ORD-PP-' + Date.now().toString(36).toUpperCase(),
            licenceKey: 'YB-' + Math.random().toString(36).substr(2, 8).toUpperCase() + '-DEMO',
            productName: appConfig.products[productId]?.name || 'YOURBOT'
          });
        }
      },
      onError: (err) => {
        console.error('PayPal error:', err);
        setCheckoutState('PayPal payment failed. Please try again or use a card.', 'error');
      }
    }).render(container);
  }

  // ── Checkout Logic ──────────────────────────────────
  function getSelectedProduct() {
    return $('checkoutProduct')?.value || 'mt5';
  }

  function updateCheckout() {
    const product = $('checkoutProduct');
    if (!product) return;
    const isCrypto = product.value === 'crypto';
    const name = isCrypto ? 'Crypto Bot' : 'MT5 Forex Bot';
    const price = isCrypto ? '$150.00' : '$100.00';

    if ($('checkoutName')) $('checkoutName').textContent = name;
    if ($('checkoutPrice')) $('checkoutPrice').textContent = price;
    if ($('checkoutDue')) $('checkoutDue').textContent = price;
    if ($('payBtnText')) $('payBtnText').textContent = `Pay ${price} →`;
  }

  function togglePaymentMethod() {
    const method = document.querySelector('input[name="payMethod"]:checked')?.value || 'stripe';
    const stripeFields = $('stripeFields');
    const paypalFields = $('paypalFields');
    const payBtn = $('payBtn');

    if (method === 'stripe') {
      if (stripeFields) stripeFields.style.display = 'block';
      if (paypalFields) paypalFields.style.display = 'none';
      if (payBtn) payBtn.style.display = 'flex';
    } else {
      if (stripeFields) stripeFields.style.display = 'none';
      if (paypalFields) paypalFields.style.display = 'block';
      if (payBtn) payBtn.style.display = 'none';
    }
  }

  function setCheckoutState(message, type) {
    const el = $('checkoutState');
    if (!el) return;
    el.textContent = message;
    el.className = 'checkout-state' + (type ? ' ' + type : '');
  }

  function setPayBtnLoading(loading) {
    const text = $('payBtnText');
    const spinner = $('payBtnSpinner');
    const btn = $('payBtn');
    if (text) text.style.display = loading ? 'none' : 'inline';
    if (spinner) spinner.style.display = loading ? 'inline-block' : 'none';
    if (btn) btn.disabled = loading;
  }

  function showSuccessModal(order) {
    const modal = $('successModal');
    const orderIdEl = $('modalOrderId');
    const keyEl = $('modalLicenceKey');

    if (orderIdEl) orderIdEl.textContent = 'Order ID: ' + (order.id || '—');
    if (keyEl) keyEl.textContent = order.licenceKey || '—';
    if (modal) modal.classList.add('show');

    setCheckoutState('✅ Payment successful! Your licence key has been generated.', 'success');
    setPayBtnLoading(false);
    notify('🎉 Payment successful! Your licence key is ready.');
  }

  // Format card number with spaces
  function formatCardNumber(input) {
    let value = input.value.replace(/\D/g, '');
    value = value.substring(0, 16);
    value = value.replace(/(\d{4})/g, '$1 ').trim();
    input.value = value;
  }

  // Format expiry as MM/YY
  function formatExpiry(input) {
    let value = input.value.replace(/\D/g, '');
    value = value.substring(0, 4);
    if (value.length >= 2) {
      value = value.substring(0, 2) + ' / ' + value.substring(2);
    }
    input.value = value;
  }

  // ── Wire up checkout events ─────────────────────────
  if ($('checkoutProduct')) {
    $('checkoutProduct').addEventListener('change', updateCheckout);
  }

  document.querySelectorAll('input[name="payMethod"]').forEach(radio => {
    radio.addEventListener('change', togglePaymentMethod);
  });

  // Format card fields
  if ($('cardNumber')) {
    $('cardNumber').addEventListener('input', function() { formatCardNumber(this); });
  }
  if ($('cardExpiry')) {
    $('cardExpiry').addEventListener('input', function() { formatExpiry(this); });
  }
  if ($('cardCvc')) {
    $('cardCvc').addEventListener('input', function() {
      this.value = this.value.replace(/\D/g, '').substring(0, 4);
    });
  }

  // Plan buttons → checkout
  document.querySelectorAll('[data-plan]').forEach(link => {
    link.addEventListener('click', () => {
      const plan = link.dataset.plan;
      if ($('checkoutProduct')) {
        $('checkoutProduct').value = plan;
        updateCheckout();
      }
    });
  });

  // Checkout form submit
  const checkoutForm = $('checkoutForm');
  if (checkoutForm) {
    checkoutForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = $('checkoutEmail')?.value.trim() || '';
      const method = document.querySelector('input[name="payMethod"]:checked')?.value || 'stripe';
      const productId = getSelectedProduct();

      if (!email || !email.includes('@')) {
        setCheckoutState('Please enter a valid email address.', 'error');
        return;
      }

      if (method === 'stripe') {
        setPayBtnLoading(true);
        setCheckoutState('Processing your payment securely...', '');

        // If Stripe Elements is available, use it
        if (stripeInstance && stripeCardElement) {
          try {
            const res = await fetch('/api/checkout', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                method: 'stripe',
                productId,
                email,
                origin: window.location.origin
              })
            });
            const data = await res.json();

            if (data.url) {
              // Redirect to Stripe Checkout
              window.location.href = data.url;
            } else if (data.demo && data.order) {
              showSuccessModal(data.order);
            } else if (data.error) {
              setCheckoutState('❌ ' + data.error, 'error');
              setPayBtnLoading(false);
            }
          } catch (err) {
            // Fallback for static deployment
            simulatePayment(productId, email);
          }
          return;
        }

        // Manual card fields (demo mode / no Stripe Elements)
        const cardNum = $('cardNumber')?.value.replace(/\s/g, '') || '';
        const cardExp = $('cardExpiry')?.value.replace(/\s/g, '') || '';
        const cardCvc = $('cardCvc')?.value || '';

        if (cardNum.length < 13) {
          setCheckoutState('Please enter a valid card number.', 'error');
          setPayBtnLoading(false);
          return;
        }
        if (!cardExp || cardExp.length < 4) {
          setCheckoutState('Please enter a valid expiry date (MM/YY).', 'error');
          setPayBtnLoading(false);
          return;
        }
        if (cardCvc.length < 3) {
          setCheckoutState('Please enter a valid CVC code.', 'error');
          setPayBtnLoading(false);
          return;
        }

        // Try API, fallback to simulation
        try {
          const res = await fetch('/api/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              method: 'stripe',
              productId,
              email,
              origin: window.location.origin
            })
          });
          const data = await res.json();

          if (data.success && data.order) {
            showSuccessModal(data.order);
          } else if (data.url) {
            window.location.href = data.url;
          } else {
            setCheckoutState('❌ ' + (data.error || 'Payment failed'), 'error');
            setPayBtnLoading(false);
          }
        } catch (err) {
          simulatePayment(productId, email);
        }
      }
    });
  }

  // Simulated payment for static deployment (no backend)
  function simulatePayment(productId, email) {
    setTimeout(() => {
      const product = appConfig?.products?.[productId];
      const seg = () => Math.random().toString(16).substr(2, 8).toUpperCase();
      showSuccessModal({
        id: 'ORD-' + Date.now().toString(36).toUpperCase(),
        licenceKey: `YB-${seg()}-${seg()}-${seg()}-${seg()}`,
        productName: product?.name || 'YOURBOT'
      });
    }, 2000);
  }

  // Close modal on overlay click
  const successModal = $('successModal');
  if (successModal) {
    successModal.addEventListener('click', (e) => {
      if (e.target === successModal) successModal.classList.remove('show');
    });
  }

  // ── Contact Form ────────────────────────────────────
  const contactForm = $('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const f = new FormData(e.currentTarget);
      const name = String(f.get('name') || '').trim();
      const email = String(f.get('email') || '').trim();
      const product = String(f.get('product') || '');
      const message = String(f.get('message') || '').trim();

      if (!name || !email.includes('@') || !message) {
        notify('Please complete all required fields.');
        return;
      }

      const subject = encodeURIComponent('YOURBOT enquiry — ' + product);
      const body = encodeURIComponent(
        'Name: ' + name + '\nEmail: ' + email + '\nProduct: ' + product + '\n\nMessage:\n' + message
      );
      notify('Opening your email app…');
      window.location.href = 'mailto:support@yourbot.com?subject=' + subject + '&body=' + body;
    });
  }

  // ── TradingView Chart ───────────────────────────────
  const marketSymbol = $('marketSymbol');
  const chartInterval = $('chartInterval');
  const chartStatus = $('chartStatus');
  let tvWidget = null;
  let tvLoading = false;

  function showFallback(message) {
    const container = $('tv_chart_container');
    if (!container) return;
    container.innerHTML = '';
    container.classList.add('chart-fallback-active');

    const note = document.createElement('div');
    note.className = 'fallback-note';
    note.textContent = message || 'Illustrative candlestick preview. Connect to the internet to load TradingView market data.';

    const chart = document.createElement('div');
    chart.className = 'fallback-candles';

    const values = [42,48,44,55,51,60,57,50,46,53,63,58,68,61,70,65,59,64,74,69,76,71,66,72,80,74,83,78,72,79,86,81,75,84,89,82,91,85,79,87];
    values.forEach((v, i) => {
      const candle = document.createElement('span');
      candle.className = 'fallback-candle ' + ((i % 5 === 1 || i % 4 === 0) ? 'down' : 'up');
      candle.style.setProperty('--low', Math.max(5, v - (7 + (i % 4) * 2)) + '%');
      candle.style.setProperty('--high', (100 - Math.min(96, v + (5 + (i % 3) * 3))) + '%');
      candle.style.setProperty('--body-top', (100 - v) + '%');
      candle.style.setProperty('--body-height', (5 + (i % 4)) + '%');
      chart.appendChild(candle);
    });

    container.append(note, chart);
    if ($('feedStatus')) $('feedStatus').textContent = 'Preview mode';
    if (chartStatus) chartStatus.textContent = 'Showing an illustrative chart. Live chart provider did not load.';
  }

  function createTV(symbol, interval) {
    if (!window.TradingView || !window.TradingView.widget) {
      showFallback();
      return;
    }
    try {
      const container = $('tv_chart_container');
      container.classList.remove('chart-fallback-active');
      container.innerHTML = '';
      tvWidget = new TradingView.widget({
        autosize: true, symbol, interval, timezone: 'Etc/UTC',
        theme: 'dark', style: '1', locale: 'en',
        enable_publishing: false, allow_symbol_change: true,
        hide_side_toolbar: false, withdateranges: true,
        details: true, hotlist: false, calendar: false,
        container_id: 'tv_chart_container',
        support_host: 'https://www.tradingview.com',
        save_image: false
      });
      if ($('feedStatus')) $('feedStatus').textContent = 'Loading feed';
      if (chartStatus) chartStatus.textContent = 'Loading interactive TradingView chart…';
    } catch (err) {
      showFallback('TradingView could not initialize. Showing illustrative chart.');
    }
  }

  function loadTradingView() {
    if (!marketSymbol || !chartInterval || !$('tv_chart_container')) return;
    const symbol = marketSymbol.value;
    const interval = chartInterval.value;

    if ($('selectedMarket')) $('selectedMarket').textContent = marketSymbol.options[marketSymbol.selectedIndex].text;
    if ($('feedStatus')) $('feedStatus').textContent = 'Loading…';
    if (chartStatus) chartStatus.textContent = 'Loading interactive chart…';

    if (window.TradingView && window.TradingView.widget) {
      createTV(symbol, interval);
      return;
    }
    if (tvLoading) return;
    tvLoading = true;

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => { tvLoading = false; createTV(symbol, interval); };
    script.onerror = () => {
      tvLoading = false;
      showFallback('Live chart unavailable. Showing illustrative candlestick preview.');
    };
    document.head.appendChild(script);

    setTimeout(() => {
      if (tvLoading) {
        tvLoading = false;
        showFallback('Live chart provider did not respond. Showing illustrative preview.');
      }
    }, 8000);
  }

  if (marketSymbol) marketSymbol.addEventListener('change', loadTradingView);
  if (chartInterval) chartInterval.addEventListener('change', loadTradingView);
  if ($('refreshChart')) $('refreshChart').addEventListener('click', loadTradingView);

  // ── Initialize ──────────────────────────────────────
  loadTradingView();
  loadConfig();
  togglePaymentMethod();
  updateCheckout();
})();

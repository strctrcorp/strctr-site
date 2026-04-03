import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import Database from 'better-sqlite3';
import Stripe from 'stripe';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const SITE_URL = (process.env.SITE_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-only-change-me-in-production-min-32-characters-long';
const COOKIE_NAME = 'strctr_session';
const PAID_STATUSES = new Set(['active', 'trialing']);

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecret ? new Stripe(stripeSecret) : null;
const PRICE_MAP = {
  pro: process.env.STRIPE_PRICE_PRO || '',
  core: process.env.STRIPE_PRICE_CORE || ''
};

const dbPath = path.join(__dirname, 'data', 'strctr.db');
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(dbPath);
db.exec(`
  CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stripe_customer_id TEXT NOT NULL UNIQUE,
    stripe_subscription_id TEXT,
    email TEXT,
    tier TEXT NOT NULL,
    status TEXT NOT NULL,
    current_period_end INTEGER,
    created_at INTEGER DEFAULT (strftime('%s','now')),
    updated_at INTEGER DEFAULT (strftime('%s','now'))
  );
  CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
`);

const upsertSub = db.prepare(`
  INSERT INTO subscriptions (stripe_customer_id, stripe_subscription_id, email, tier, status, current_period_end, updated_at)
  VALUES (@stripe_customer_id, @stripe_subscription_id, @email, @tier, @status, @current_period_end, strftime('%s','now'))
  ON CONFLICT(stripe_customer_id) DO UPDATE SET
    stripe_subscription_id = excluded.stripe_subscription_id,
    email = COALESCE(excluded.email, subscriptions.email),
    tier = excluded.tier,
    status = excluded.status,
    current_period_end = excluded.current_period_end,
    updated_at = strftime('%s','now')
`);

function signSession(customerId) {
  const payload = JSON.stringify({ c: customerId, exp: Date.now() + 90 * 24 * 60 * 60 * 1000 });
  const body = Buffer.from(payload, 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function verifySession(cookieVal) {
  if (!cookieVal || typeof cookieVal !== 'string') return null;
  const [body, sig] = cookieVal.split('.');
  if (!body || !sig) return null;
  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(body).digest('base64url');
  const a = Buffer.from(sig, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) return null;
  if (!crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (data.exp && data.exp < Date.now()) return null;
    return data.c || null;
  } catch {
    return null;
  }
}

function tierFromPriceId(priceId) {
  if (priceId === PRICE_MAP.core) return 'core';
  if (priceId === PRICE_MAP.pro) return 'pro';
  return null;
}

function getTierForCustomer(customerId) {
  const row = db.prepare(
    'SELECT tier, status FROM subscriptions WHERE stripe_customer_id = ?'
  ).get(customerId);
  if (!row) return { tier: 'free', status: 'none', active: false };
  const active = PAID_STATUSES.has(row.status);
  return {
    tier: active ? row.tier : 'free',
    status: row.status,
    active
  };
}

const app = express();

app.use(cookieParser());

function stripeCustomerId(raw) {
  if (typeof raw === 'string') return raw;
  if (raw && typeof raw === 'object' && 'id' in raw) return raw.id;
  return null;
}

app.post('/api/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(503).send('Webhook not configured');
  }
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const customerId = stripeCustomerId(session.customer);
        if (customerId) {
          const s = await stripe.checkout.sessions.retrieve(session.id, { expand: ['subscription'] });
          const sub = s.subscription;
          const subscriptionId = typeof sub === 'string' ? sub : sub?.id;
          let tier = session.metadata?.tier || 'pro';
          let status = 'active';
          let periodEnd = null;
          if (sub && typeof sub === 'object') {
            status = sub.status;
            periodEnd = sub.current_period_end ? sub.current_period_end * 1000 : null;
            const priceId = sub.items?.data?.[0]?.price?.id;
            const fromPrice = tierFromPriceId(priceId);
            if (fromPrice) tier = fromPrice;
            if (sub.metadata?.tier) tier = sub.metadata.tier;
          }
          upsertSub.run({
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId || null,
            email: session.customer_details?.email || null,
            tier,
            status,
            current_period_end: periodEnd
          });
        }
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const customerId = stripeCustomerId(sub.customer);
        if (!customerId) break;
        let tier = sub.metadata?.tier || 'pro';
        const priceId = sub.items?.data?.[0]?.price?.id;
        const fromPrice = tierFromPriceId(priceId);
        if (fromPrice) tier = fromPrice;
        const periodEnd = sub.current_period_end ? sub.current_period_end * 1000 : null;
        upsertSub.run({
          stripe_customer_id: customerId,
          stripe_subscription_id: sub.id,
          email: null,
          tier,
          status: sub.status,
          current_period_end: periodEnd
        });
        break;
      }
      default:
        break;
    }
    return res.json({ received: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Webhook handler failed' });
  }
});

app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, stripe: Boolean(stripe) });
});

app.get('/api/me', (req, res) => {
  const customerId = verifySession(req.cookies[COOKIE_NAME]);
  if (!customerId) {
    return res.json({ tier: 'free', status: 'none', authenticated: false });
  }
  const { tier, status, active } = getTierForCustomer(customerId);
  res.json({
    tier,
    status,
    authenticated: true,
    active
  });
});

app.post('/api/create-checkout-session', async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe is not configured' });
  }
  const tier = req.body?.tier;
  if (tier !== 'pro' && tier !== 'core') {
    return res.status(400).json({ error: 'Invalid tier' });
  }
  const priceId = PRICE_MAP[tier];
  if (!priceId) {
    return res.status(503).json({ error: `Missing STRIPE_PRICE_${tier.toUpperCase()} in environment` });
  }
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${SITE_URL}/api/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/?checkout=canceled`,
      metadata: { tier },
      subscription_data: {
        metadata: { tier }
      },
      allow_promotion_codes: true
    });
    return res.json({ url: session.url });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Checkout failed' });
  }
});

app.get('/api/checkout/success', async (req, res) => {
  const sessionId = req.query.session_id;
  if (!stripe || typeof sessionId !== 'string') {
    return res.redirect(`${SITE_URL}/?checkout=error`);
  }
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'customer']
    });
    const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
    if (!customerId) {
      return res.redirect(`${SITE_URL}/?checkout=error`);
    }
    const sub = session.subscription;
    const subscriptionId = typeof sub === 'string' ? sub : sub?.id;
    let tier = session.metadata?.tier || 'pro';
    let status = 'active';
    let periodEnd = null;
    let email = session.customer_details?.email || null;

    if (sub && typeof sub === 'object') {
      status = sub.status;
      periodEnd = sub.current_period_end ? sub.current_period_end * 1000 : null;
      const priceId = sub.items?.data?.[0]?.price?.id;
      const fromPrice = tierFromPriceId(priceId);
      if (fromPrice) tier = fromPrice;
      if (sub.metadata?.tier) tier = sub.metadata.tier;
    }

    upsertSub.run({
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId || null,
      email,
      tier,
      status,
      current_period_end: periodEnd
    });

    const token = signSession(customerId);
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 90 * 24 * 60 * 60 * 1000,
      path: '/'
    });
    return res.redirect(`${SITE_URL}/?checkout=success`);
  } catch (e) {
    console.error(e);
    return res.redirect(`${SITE_URL}/?checkout=error`);
  }
});

app.use(express.static(__dirname, { index: 'index.html' }));

app.listen(PORT, () => {
  console.log(`STRCTR listening on ${SITE_URL}`);
});

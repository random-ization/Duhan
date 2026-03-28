#!/usr/bin/env node

const isProduction = process.env.NODE_ENV === 'production';

if (!isProduction) {
  console.log('[env:validate] Skipped (NODE_ENV is not production).');
  process.exit(0);
}

const missing = [];
const hasValue = key => Boolean(process.env[key]?.trim());
const requireKey = key => {
  if (!hasValue(key)) missing.push(key);
};

requireKey('SITE_URL');
requireKey('VITE_APP_URL');
requireKey('OPENAI_API_KEY');
requireKey('RESEND_API_KEY');
requireKey('EMAIL_FROM');
requireKey('DEEPGRAM_API_KEY');

if (!hasValue('DEEPGRAM_API_KEY_ID') && !hasValue('DEEPGRAM_CALLBACK_TOKEN')) {
  missing.push('DEEPGRAM_API_KEY_ID or DEEPGRAM_CALLBACK_TOKEN');
}

const hasLemon =
  hasValue('LEMONSQUEEZY_API_KEY') &&
  hasValue('LEMONSQUEEZY_WEBHOOK_SECRET') &&
  hasValue('LEMONSQUEEZY_STORE_ID') &&
  hasValue('LEMONSQUEEZY_VARIANT_MONTHLY') &&
  hasValue('LEMONSQUEEZY_VARIANT_ANNUAL');

if (!hasLemon) {
  missing.push('payment provider configuration (LEMONSQUEEZY_*)');
}

if (missing.length) {
  console.error(`[env:validate] Missing required production env vars: ${missing.join(', ')}`);
  process.exit(1);
}

console.log('[env:validate] All required production env vars are configured.');

'use node';

let validated = false;

const hasValue = (value: string | undefined) => Boolean(value?.trim());

export function assertProductionRuntimeEnv() {
  if (validated) return;
  if (process.env.NODE_ENV !== 'production') {
    validated = true;
    return;
  }

  const missing: string[] = [];
  const requireKey = (key: string) => {
    if (!hasValue(process.env[key])) {
      missing.push(key);
    }
  };

  requireKey('SITE_URL');
  requireKey('VITE_APP_URL');

  // AI
  requireKey('OPENAI_API_KEY');

  // Email
  requireKey('RESEND_API_KEY');
  requireKey('EMAIL_FROM');

  // Deepgram webhook auth requirements
  requireKey('DEEPGRAM_API_KEY');
  if (
    !hasValue(process.env.DEEPGRAM_API_KEY_ID) &&
    !hasValue(process.env.DEEPGRAM_CALLBACK_TOKEN)
  ) {
    missing.push('DEEPGRAM_API_KEY_ID or DEEPGRAM_CALLBACK_TOKEN');
  }

  // Payments: at least one provider must be fully configured.
  const hasCreem =
    hasValue(process.env.CREEM_API_KEY) &&
    hasValue(process.env.CREEM_WEBHOOK_SECRET) &&
    hasValue(process.env.CREEM_PRODUCT_MONTHLY) &&
    hasValue(process.env.CREEM_PRODUCT_ANNUAL);
  const hasLemon =
    hasValue(process.env.LEMONSQUEEZY_API_KEY) &&
    hasValue(process.env.LEMONSQUEEZY_WEBHOOK_SECRET) &&
    hasValue(process.env.LEMONSQUEEZY_STORE_ID) &&
    hasValue(process.env.LEMONSQUEEZY_VARIANT_MONTHLY) &&
    hasValue(process.env.LEMONSQUEEZY_VARIANT_ANNUAL);

  if (!hasCreem && !hasLemon) {
    missing.push(
      'payment provider configuration (CREEM_* or LEMONSQUEEZY_* required for production)'
    );
  }

  if (missing.length > 0) {
    throw new Error(`Missing required production environment variables: ${missing.join(', ')}`);
  }

  validated = true;
}

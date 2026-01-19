'use node';
import { action, internalAction } from './_generated/server';
import { v } from 'convex/values';
import { Resend } from 'resend';
import { toErrorMessage } from './errors';

export const sendEmail = action({
  args: {
    to: v.string(),
    subject: v.string(),
    html: v.string(),
  },
  handler: async (ctx, args) => {
    const resendApiKey = process.env.RESEND_API_KEY;
    const emailFrom = process.env.EMAIL_FROM || 'onboarding@resend.dev';

    if (!resendApiKey) {
      console.error('Missing RESEND_API_KEY environment variable');
      // Return success false or throw? Returning object allows client to handle gracefully.
      return { success: false, error: 'Configuration Error: Missing Email API Key' };
    }

    const resend = new Resend(resendApiKey);

    try {
      const { data, error } = await resend.emails.send({
        from: emailFrom,
        to: args.to,
        subject: args.subject,
        html: args.html,
      });

      if (error) {
        console.error('Resend Error:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (err: unknown) {
      console.error('Email Sending Failed:', toErrorMessage(err));
      return { success: false, error: toErrorMessage(err) };
    }
  },
});

export const sendVerification = internalAction({
  args: {
    email: v.string(),
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const resendApiKey = process.env.RESEND_API_KEY;
    const emailFrom = process.env.EMAIL_FROM || 'onboarding@resend.dev';

    if (!resendApiKey) {
      console.error('Missing RESEND_API_KEY');
      return;
    }

    const resend = new Resend(resendApiKey);

    try {
      await resend.emails.send({
        from: emailFrom,
        to: args.email,
        subject: 'Verify your email',
        html: `<p>Your verification code is: <strong>${args.code}</strong></p>`,
      });
    } catch (err) {
      console.error('Failed to send verification email:', err);
    }
  },
});

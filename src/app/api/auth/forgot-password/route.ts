import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabase } from '@/lib/supabase';
import { checkRateLimit } from '@/lib/rateLimit';
import { sendPasswordResetEmail } from '@/lib/mail';

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function POST(req: NextRequest) {
  try {
    if (!checkRateLimit(req, 'forgot-password', 5, 15 * 60 * 1000)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again in a few minutes.' },
        { status: 429 }
      );
    }

    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Always return the same response whether or not the account exists —
    // otherwise this endpoint becomes a way to enumerate registered emails.
    const genericResponse = NextResponse.json({
      message: "If an account with that email exists, we've sent a password reset link.",
    });

    const emailLower = email.toLowerCase().trim();
    const { data: user } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', emailLower)
      .single();

    if (!user) {
      return genericResponse;
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString();

    const { error: updateErr } = await supabase
      .from('users')
      .update({ reset_token: tokenHash, reset_token_expires_at: expiresAt })
      .eq('id', user.id);

    if (updateErr) {
      console.error('Failed to store password reset token:', updateErr);
      return genericResponse;
    }

    const appUrl = process.env.APP_URL || new URL(req.url).origin;
    const resetUrl = `${appUrl}/reset-password?token=${rawToken}`;
    await sendPasswordResetEmail(user.email, resetUrl);

    return genericResponse;
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

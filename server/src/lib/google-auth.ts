// Google OAuth Helper
// Exchanges authorization code for tokens and verifies user identity

import { OAuth2Client } from 'google-auth-library';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';

// Create OAuth2 client
const createOAuth2Client = (redirectUri?: string) => {
    return new OAuth2Client(
        GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET,
        redirectUri
    );
};

export interface GoogleUserInfo {
    googleId: string;
    email: string;
    name: string;
    avatar?: string;
    emailVerified: boolean;
}

/**
 * Exchange authorization code for tokens and get user info
 * @param code - Authorization code from Google OAuth redirect
 * @param redirectUri - The redirect URI used in the OAuth flow
 */
export const exchangeCodeForUserInfo = async (
    code: string,
    redirectUri: string
): Promise<GoogleUserInfo> => {
    const client = createOAuth2Client(redirectUri);

    // Exchange code for tokens
    const { tokens } = await client.getToken(code);

    if (!tokens.id_token) {
        throw new Error('No ID token received from Google');
    }

    // Verify ID token and get user info
    const ticket = await client.verifyIdToken({
        idToken: tokens.id_token,
        audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload) {
        throw new Error('Failed to get user info from Google token');
    }

    return {
        googleId: payload.sub, // Google's unique user ID
        email: payload.email || '',
        name: payload.name || payload.email?.split('@')[0] || 'User',
        avatar: payload.picture,
        emailVerified: payload.email_verified || false,
    };
};

/**
 * Verify ID token directly (for clients that already have the token)
 * @param idToken - Google ID token
 */
export const verifyIdToken = async (idToken: string): Promise<GoogleUserInfo> => {
    const client = createOAuth2Client();

    const ticket = await client.verifyIdToken({
        idToken,
        audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload) {
        throw new Error('Failed to verify Google token');
    }

    return {
        googleId: payload.sub,
        email: payload.email || '',
        name: payload.name || payload.email?.split('@')[0] || 'User',
        avatar: payload.picture,
        emailVerified: payload.email_verified || false,
    };
};

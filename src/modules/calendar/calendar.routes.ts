import { Router } from 'express';
import { google } from 'googleapis';
import { requireAuth } from '../auth/auth';
import { saveGoogleTokensForUser } from './google-account';

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URL
);

// Short-lived CSRF state for the OAuth round trip: maps a random, single-use
// token to the user who initiated the connection, so /callback knows who Google
// is handing tokens back for. Fine as an in-memory Map for a single instance;
// move to Redis once this runs behind more than one server process.
const OAUTH_STATE_TTL_MS = 5 * 60 * 1000;
const oauthStateStore = new Map<string, { userId: string; expiresAt: number }>();

function createOAuthState(userId: string) {
    const state = crypto.randomUUID();
    oauthStateStore.set(state, { userId, expiresAt: Date.now() + OAUTH_STATE_TTL_MS });
    return state;
}

function consumeOAuthState(state: string) {
    const entry = oauthStateStore.get(state);

    if (!entry) {
        return null;
    }

    oauthStateStore.delete(state);

    return entry.expiresAt >= Date.now() ? entry.userId : null;
}

export const calendarRouter = Router();

calendarRouter.get('/auth', requireAuth, (req, res) => {
    const scopes = ['https://www.googleapis.com/auth/calendar'];
    const state = createOAuthState(req.user!.id);

    const url = oauth2Client.generateAuthUrl({
        // 'online' (default) or 'offline' (gets refresh_token)
        access_type: 'offline',
        prompt: 'consent',
        scope: scopes,
        state,
    });

    res.redirect(url);
});

calendarRouter.get('/callback', async (req, res) => {
    const code = req.query.code as string | undefined;
    const state = req.query.state as string | undefined;

    if (!code || !state) {
        res.status(400).send('Missing authorization code or state.');
        return;
    }

    const userId = consumeOAuthState(state);

    if (!userId) {
        res.status(400).send('This authorization link is invalid or has expired. Please try connecting again.');
        return;
    }

    const { tokens } = await oauth2Client.getToken(code);
    await saveGoogleTokensForUser(userId, tokens);

    res.send('Connected ✅ You can close this tab now.');
});

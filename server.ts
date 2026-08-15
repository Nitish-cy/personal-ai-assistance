import 'dotenv/config';
import 'reflect-metadata';
import express from 'express';
import cookieParser from 'cookie-parser';
import { z } from 'zod';
import { google } from 'googleapis';
import { agentApp, buildSystemMessage } from './agent';
import { dataSource } from './data-source';
import { User } from './entities/User';
import { saveGoogleTokensForUser } from './google-account';
import {
    clearSessionCookie,
    createSession,
    deleteSession,
    hashPassword,
    requireAuth,
    setSessionCookie,
    SESSION_COOKIE_NAME,
    verifyPassword,
} from './auth';

const app = express();
app.use(express.json());
app.use(cookieParser(process.env.SESSION_SECRET));

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

app.get('/auth', requireAuth, (req, res) => {
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

app.get('/callback', async (req, res) => {
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

const signupSchema = z.object({
    name: z.string().min(1),
    email: z.email(),
    password: z.string().min(8),
});

const loginSchema = z.object({
    email: z.email(),
    password: z.string().min(1),
});

app.post('/api/auth/signup', async (req, res) => {
    const parsed = signupSchema.safeParse(req.body);

    if (!parsed.success) {
        res.status(400).json({ error: 'Invalid signup data' });
        return;
    }

    const { name, email, password } = parsed.data;
    const userRepo = dataSource.getRepository(User);

    const existing = await userRepo.findOne({ where: { email } });

    if (existing) {
        res.status(409).json({ error: 'Email already in use' });
        return;
    }

    const passwordHash = await hashPassword(password);
    const user = await userRepo.save(userRepo.create({ name, email, passwordHash }));

    const { id: sessionId, expiresAt } = await createSession(user.id);
    setSessionCookie(res, sessionId, expiresAt);

    res.status(201).json({ id: user.id, name: user.name, email: user.email });
});

app.post('/api/auth/login', async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);

    if (!parsed.success) {
        res.status(400).json({ error: 'Invalid login data' });
        return;
    }

    const { email, password } = parsed.data;
    const userRepo = dataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { email } });

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
    }

    const { id: sessionId, expiresAt } = await createSession(user.id);
    setSessionCookie(res, sessionId, expiresAt);

    res.json({ id: user.id, name: user.name, email: user.email });
});

app.post('/api/auth/logout', async (req, res) => {
    const sessionId = req.signedCookies[SESSION_COOKIE_NAME] as string | undefined;

    if (sessionId) {
        await deleteSession(sessionId);
    }

    clearSessionCookie(res);
    res.status(204).send();
});

app.get('/api/me', requireAuth, (req, res) => {
    res.json(req.user);
});

app.post('/api/agent/chat', requireAuth, async (req, res) => {
    const { message } = req.body as { message?: unknown };

    if (typeof message !== 'string' || !message.trim()) {
        res.status(400).json({ error: 'message is required' });
        return;
    }

    try {
        const result = await agentApp.invoke(
            {
                messages: [buildSystemMessage(), { role: 'user', content: message }],
            },
            { configurable: { thread_id: req.user!.id, userId: req.user!.id } }
        );

        const lastMessage = result.messages[result.messages.length - 1];

        res.json({ reply: lastMessage?.content ?? '' });
    } catch (err) {
        console.error('Agent chat failed', err);
        res.status(500).json({ error: 'Failed to process the request.' });
    }
});

async function start() {
    await dataSource.initialize();
    await dataSource.runMigrations();
    app.listen(3600, () => console.log(`Server is running on port 3600`));
}

start().catch((err) => {
    console.error('Failed to start server', err);
    process.exit(1);
});

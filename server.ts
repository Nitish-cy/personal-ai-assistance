import 'dotenv/config';
import express from 'express';
import { google } from 'googleapis';
import { agentApp, buildSystemMessage } from './agent';

const app = express();
app.use(express.json());

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URL
);

app.get('/auth', (req, res) => {
    // generate the link
    const scopes = ['https://www.googleapis.com/auth/calendar'];

    const url = oauth2Client.generateAuthUrl({
        // 'online' (default) or 'offline' (gets refresh_token)
        access_type: 'offline',
        prompt: 'consent',
        // If you only need one scope, you can pass it as a string
        scope: scopes,
    });

    console.log('url', url);

    res.redirect(url);
});

app.get('/callback', async (req, res) => {
    const code = req.query.code as string;

    const { tokens } = await oauth2Client.getToken(code);

    console.log(tokens);

    res.send('Connected ✅ You can close this tab now.');
});

app.post('/api/agent/chat', async (req, res) => {
    const { message, threadId } = req.body as { message?: unknown; threadId?: unknown };

    if (typeof message !== 'string' || !message.trim()) {
        res.status(400).json({ error: 'message is required' });
        return;
    }

    try {
        const result = await agentApp.invoke(
            {
                messages: [buildSystemMessage(), { role: 'user', content: message }],
            },
            { configurable: { thread_id: typeof threadId === 'string' ? threadId : 'default' } }
        );

        const lastMessage = result.messages[result.messages.length - 1];

        res.json({ reply: lastMessage?.content ?? '' });
    } catch (err) {
        console.error('Agent chat failed', err);
        res.status(500).json({ error: 'Failed to process the request.' });
    }
});

app.listen(3600, () => console.log(`Server is running on port 3600`));
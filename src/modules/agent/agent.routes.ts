import { Router } from 'express';
import { requireAuth } from '../auth/auth';
import { agentApp, buildSystemMessage } from './agent';

export const agentRouter = Router();

agentRouter.post('/chat', requireAuth, async (req, res) => {
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

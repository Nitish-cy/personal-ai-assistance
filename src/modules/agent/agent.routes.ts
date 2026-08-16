import { Router } from 'express';
import crypto from 'node:crypto';
import { isAIMessage } from '@langchain/core/messages';
import type { BaseMessage } from '@langchain/core/messages';
import { requireAuth } from '../auth/auth';
import { agentApp, buildSystemMessage } from './agent';
import { checkpointer } from '../../config/checkpointer';
import { logger } from '../../config/logger';
import { agentChatDurationSeconds, agentChatRequestsTotal } from '../../config/metrics';
import {
    createConversation,
    deleteConversation,
    getConversationForUser,
    listConversations,
    titleFromMessage,
    touchConversation,
} from './conversation.service';

export const agentRouter = Router();

function extractToolCalls(messages: BaseMessage[]): string[] {
    return messages.filter(isAIMessage).flatMap((message) => message.tool_calls?.map((call) => call.name) ?? []);
}

function toDisplayRole(messageType: string): 'user' | 'assistant' | null {
    if (messageType === 'human') return 'user';
    if (messageType === 'ai') return 'assistant';
    return null; // system/tool messages aren't shown in the chat UI
}

async function loadHistory(conversationId: string) {
    const state = await agentApp.getState({ configurable: { thread_id: conversationId } });
    const messages = (state.values?.messages ?? []) as BaseMessage[];

    return messages
        .map((message) => ({
            role: toDisplayRole(message.getType()),
            content: typeof message.content === 'string' ? message.content : '',
        }))
        .filter(
            (message): message is { role: 'user' | 'assistant'; content: string } =>
                message.role !== null && message.content.trim().length > 0
        );
}

agentRouter.get('/conversations', requireAuth, async (req, res) => {
    const conversations = await listConversations(req.user!.id);
    res.json({
        conversations: conversations.map((c) => ({ id: c.id, title: c.title, updatedAt: c.updatedAt })),
    });
});

agentRouter.get('/conversations/:id/messages', requireAuth, async (req, res) => {
    const conversationId = req.params.id;

    if (typeof conversationId !== 'string') {
        res.status(400).json({ error: 'Invalid conversation id' });
        return;
    }

    const conversation = await getConversationForUser(req.user!.id, conversationId);

    if (!conversation) {
        res.status(404).json({ error: 'Conversation not found' });
        return;
    }

    const history = await loadHistory(conversationId);
    res.json({ history });
});

agentRouter.delete('/conversations/:id', requireAuth, async (req, res) => {
    const conversationId = req.params.id;

    if (typeof conversationId !== 'string') {
        res.status(400).json({ error: 'Invalid conversation id' });
        return;
    }

    const conversation = await getConversationForUser(req.user!.id, conversationId);

    if (!conversation) {
        res.status(404).json({ error: 'Conversation not found' });
        return;
    }

    await checkpointer.deleteThread(conversationId);
    await deleteConversation(req.user!.id, conversationId);

    res.status(204).send();
});

agentRouter.post('/chat', requireAuth, async (req, res) => {
    const { message, conversationId } = req.body as { message?: unknown; conversationId?: unknown };

    if (typeof message !== 'string' || !message.trim()) {
        res.status(400).json({ error: 'message is required' });
        return;
    }

    const userId = req.user!.id;
    let conversation = typeof conversationId === 'string' ? await getConversationForUser(userId, conversationId) : null;

    if (typeof conversationId === 'string' && !conversation) {
        res.status(404).json({ error: 'Conversation not found' });
        return;
    }

    if (!conversation) {
        conversation = await createConversation(userId, titleFromMessage(message));
    }

    const agentRunId = crypto.randomUUID();
    const startedAt = Date.now();
    const stopTimer = agentChatDurationSeconds.startTimer();

    try {
        const result = await agentApp.invoke(
            {
                messages: [buildSystemMessage(), { role: 'user', content: message }],
            },
            { configurable: { thread_id: conversation.id, userId } }
        );

        await touchConversation(conversation.id);

        const lastMessage = result.messages[result.messages.length - 1];
        const toolsCalled = extractToolCalls(result.messages);
        const latencyMs = Date.now() - startedAt;

        logger.info(
            { agentRunId, userId, conversationId: conversation.id, toolsCalled, latencyMs, status: 'success' },
            'agent run completed'
        );
        agentChatRequestsTotal.inc({ status: 'success' });
        stopTimer({ status: 'success' });

        res.json({ reply: lastMessage?.content ?? '', conversationId: conversation.id });
    } catch (err) {
        const latencyMs = Date.now() - startedAt;
        logger.error(
            { agentRunId, userId, conversationId: conversation.id, latencyMs, status: 'error', err },
            'agent run failed'
        );
        agentChatRequestsTotal.inc({ status: 'error' });
        stopTimer({ status: 'error' });

        res.status(500).json({ error: 'Failed to process the request.' });
    }
});

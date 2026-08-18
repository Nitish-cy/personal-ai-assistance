import { dataSource } from '../../config/data-source';
import { Conversation } from '../../entities/Conversation';

const TITLE_MAX_LENGTH = 60;

export function titleFromMessage(message: string): string {
    const trimmed = message.trim().replace(/\s+/g, ' ');
    return trimmed.length > TITLE_MAX_LENGTH ? `${trimmed.slice(0, TITLE_MAX_LENGTH)}…` : trimmed;
}

export async function createConversation(userId: string, title: string) {
    const repo = dataSource.getRepository(Conversation);
    return repo.save(repo.create({ userId, title }));
}

export async function touchConversation(conversationId: string) {
    await dataSource.getRepository(Conversation).update({ id: conversationId }, { updatedAt: new Date() });
}

export async function getConversationForUser(userId: string, conversationId: string) {
    return dataSource.getRepository(Conversation).findOne({ where: { id: conversationId, userId } });
}

export async function listConversations(userId: string) {
    return dataSource.getRepository(Conversation).find({ where: { userId }, order: { updatedAt: 'DESC' } });
}

export async function deleteConversation(userId: string, conversationId: string) {
    await dataSource.getRepository(Conversation).delete({ id: conversationId, userId });
}

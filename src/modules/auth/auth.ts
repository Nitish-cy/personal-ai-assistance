import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { dataSource } from '../../config/data-source';
import { Session } from '../../entities/Session';

export { hashPassword, verifyPassword } from './password';

declare global {
    namespace Express {
        interface Request {
            user?: { id: string; name: string; email: string };
        }
    }
}

export const SESSION_COOKIE_NAME = 'session_id';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export async function createSession(userId: string) {
    const sessionRepo = dataSource.getRepository(Session);
    const id = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    await sessionRepo.save(sessionRepo.create({ id, userId, expiresAt }));

    return { id, expiresAt };
}

export async function getUserForSession(sessionId: string) {
    const sessionRepo = dataSource.getRepository(Session);
    const session = await sessionRepo.findOne({ where: { id: sessionId }, relations: { user: true } });

    if (!session) {
        return null;
    }

    if (session.expiresAt.getTime() < Date.now()) {
        await sessionRepo.delete({ id: sessionId });
        return null;
    }

    return session.user;
}

export async function deleteSession(sessionId: string) {
    await dataSource.getRepository(Session).delete({ id: sessionId });
}

export function setSessionCookie(res: Response, sessionId: string, expiresAt: Date) {
    res.cookie(SESSION_COOKIE_NAME, sessionId, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        expires: expiresAt,
        signed: true,
    });
}

export function clearSessionCookie(res: Response) {
    res.clearCookie(SESSION_COOKIE_NAME);
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
    const sessionId = req.signedCookies[SESSION_COOKIE_NAME] as string | undefined;

    if (!sessionId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
    }

    const user = await getUserForSession(sessionId);

    if (!user) {
        clearSessionCookie(res);
        res.status(401).json({ error: 'Session expired' });
        return;
    }

    req.user = { id: user.id, name: user.name, email: user.email };
    next();
}

import { Router } from 'express';
import { z } from 'zod';
import { dataSource } from '../../config/data-source';
import { User } from '../../entities/User';
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

const signupSchema = z.object({
    name: z.string().min(1),
    email: z.email(),
    password: z.string().min(8),
});

const loginSchema = z.object({
    email: z.email(),
    password: z.string().min(1),
});

export const authRouter = Router();

authRouter.post('/auth/signup', async (req, res) => {
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

authRouter.post('/auth/login', async (req, res) => {
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

authRouter.post('/auth/logout', async (req, res) => {
    const sessionId = req.signedCookies[SESSION_COOKIE_NAME] as string | undefined;

    if (sessionId) {
        await deleteSession(sessionId);
    }

    clearSessionCookie(res);
    res.status(204).send();
});

authRouter.get('/me', requireAuth, (req, res) => {
    res.json(req.user);
});

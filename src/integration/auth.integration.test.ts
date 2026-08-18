import 'dotenv/config';

// app.ts pulls in the agent module, which constructs a ChatGroq client at import
// time - it throws if no key is present at all. This suite never exercises
// /api/agent/chat, so a dummy key (used only when a real one isn't already
// loaded from .env) is enough to satisfy the constructor.
if (!process.env.GROQ_API_KEY) {
    process.env.GROQ_API_KEY = 'test-dummy-key';
}

import request from 'supertest';
import { In } from 'typeorm';
import { app } from '../app';
import { dataSource } from '../config/data-source';
import { User } from '../entities/User';

const testEmails: string[] = [];

function uniqueEmail(label: string) {
    const email = `integration-${label}-${Math.random().toString(36).slice(2)}@example.com`;
    testEmails.push(email);
    return email;
}

beforeAll(async () => {
    await dataSource.initialize();
    await dataSource.runMigrations();
});

afterAll(async () => {
    if (testEmails.length > 0) {
        await dataSource.getRepository(User).delete({ email: In(testEmails) });
    }
    await dataSource.destroy();
});

describe('auth flow (real Postgres, real Express app)', () => {
    it('signs up, is recognized via the session cookie, then logout revokes it', async () => {
        const email = uniqueEmail('flow');
        const agent = request.agent(app);

        const signupRes = await agent
            .post('/api/auth/signup')
            .send({ name: 'Integration Test', email, password: 'supersecret123' });

        expect(signupRes.status).toBe(201);
        expect(signupRes.body.email).toBe(email);

        const meRes = await agent.get('/api/me');
        expect(meRes.status).toBe(200);
        expect(meRes.body.email).toBe(email);

        const logoutRes = await agent.post('/api/auth/logout');
        expect(logoutRes.status).toBe(204);

        const meAfterLogout = await agent.get('/api/me');
        expect(meAfterLogout.status).toBe(401);
    });

    it('rejects duplicate signups and wrong passwords', async () => {
        const email = uniqueEmail('dupe');

        const first = await request(app)
            .post('/api/auth/signup')
            .send({ name: 'First', email, password: 'supersecret123' });
        expect(first.status).toBe(201);

        const duplicate = await request(app)
            .post('/api/auth/signup')
            .send({ name: 'Second', email, password: 'anotherpassword' });
        expect(duplicate.status).toBe(409);

        const wrongPassword = await request(app)
            .post('/api/auth/login')
            .send({ email, password: 'not-the-right-password' });
        expect(wrongPassword.status).toBe(401);
    });

    it("does not let one user's session read another user's identity (authorization boundary)", async () => {
        const emailA = uniqueEmail('user-a');
        const emailB = uniqueEmail('user-b');

        const agentA = request.agent(app);
        const agentB = request.agent(app);

        await agentA.post('/api/auth/signup').send({ name: 'User A', email: emailA, password: 'supersecret123' });
        await agentB.post('/api/auth/signup').send({ name: 'User B', email: emailB, password: 'supersecret123' });

        const meA = await agentA.get('/api/me');
        const meB = await agentB.get('/api/me');

        expect(meA.body.email).toBe(emailA);
        expect(meB.body.email).toBe(emailB);
        expect(meA.body.id).not.toBe(meB.body.id);
    });

    it('rejects calendar endpoints without a session', async () => {
        const res = await request(app).get('/api/calendar/events?timeMin=2026-01-01&timeMax=2026-01-02');
        expect(res.status).toBe(401);
    });
});

import { hashPassword, verifyPassword } from './password';

describe('password hashing', () => {
    it('verifies a correct password against its hash', async () => {
        const hash = await hashPassword('correct-horse-battery-staple');

        await expect(verifyPassword('correct-horse-battery-staple', hash)).resolves.toBe(true);
    });

    it('rejects an incorrect password', async () => {
        const hash = await hashPassword('correct-horse-battery-staple');

        await expect(verifyPassword('wrong-password', hash)).resolves.toBe(false);
    });

    it('produces a different hash each time (random salt)', async () => {
        const [first, second] = await Promise.all([
            hashPassword('correct-horse-battery-staple'),
            hashPassword('correct-horse-battery-staple'),
        ]);

        expect(first).not.toBe(second);
    });
});

process.env.ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');

import { decrypt, encrypt } from './crypto-util';

describe('crypto-util', () => {
    it('decrypts what it encrypted', () => {
        const encrypted = encrypt('ya29.super-secret-access-token');

        expect(decrypt(encrypted)).toBe('ya29.super-secret-access-token');
    });

    it('produces a different payload each time (random IV)', () => {
        expect(encrypt('same-input')).not.toBe(encrypt('same-input'));
    });

    it('fails to decrypt a tampered payload', () => {
        const encrypted = encrypt('sensitive-value');
        const [iv, authTag, ciphertext] = encrypted.split('.');
        const tampered = [iv, authTag, `${ciphertext!.slice(0, -4)}abcd`].join('.');

        expect(() => decrypt(tampered)).toThrow();
    });
});

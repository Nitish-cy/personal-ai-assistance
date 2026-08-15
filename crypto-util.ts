import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';

function getKey() {
    const key = process.env.ENCRYPTION_KEY;

    if (!key) {
        throw new Error('ENCRYPTION_KEY environment variable is not set.');
    }

    const buffer = Buffer.from(key, 'base64');

    if (buffer.length !== 32) {
        throw new Error('ENCRYPTION_KEY must decode to exactly 32 bytes (base64-encoded).');
    }

    return buffer;
}

export function encrypt(plainText: string) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);

    const ciphertext = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return [iv.toString('base64'), authTag.toString('base64'), ciphertext.toString('base64')].join('.');
}

export function decrypt(payload: string) {
    const [ivB64, authTagB64, ciphertextB64] = payload.split('.');

    if (!ivB64 || !authTagB64 || !ciphertextB64) {
        throw new Error('Malformed encrypted payload.');
    }

    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(authTagB64, 'base64'));

    const plaintext = Buffer.concat([decipher.update(Buffer.from(ciphertextB64, 'base64')), decipher.final()]);

    return plaintext.toString('utf8');
}

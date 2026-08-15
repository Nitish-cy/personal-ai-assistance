import { google } from 'googleapis';
import type { Credentials } from 'google-auth-library';
import { dataSource } from './data-source';
import { OAuthAccount } from './entities/OAuthAccount';
import { decrypt, encrypt } from './crypto-util';

const PROVIDER = 'google';

function buildBareOAuthClient() {
    return new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URL
    );
}

export async function saveGoogleTokensForUser(userId: string, tokens: Credentials) {
    if (!tokens.access_token) {
        throw new Error('Google did not return an access token.');
    }

    const repo = dataSource.getRepository(OAuthAccount);
    const existing = await repo.findOne({ where: { userId, provider: PROVIDER } });

    const accessToken = encrypt(tokens.access_token);
    const refreshToken = tokens.refresh_token ? encrypt(tokens.refresh_token) : (existing?.refreshToken ?? null);
    const expiresAt = tokens.expiry_date ? new Date(tokens.expiry_date) : null;
    const scope = tokens.scope ?? existing?.scope ?? null;

    if (existing) {
        existing.accessToken = accessToken;
        existing.refreshToken = refreshToken;
        existing.expiresAt = expiresAt;
        existing.scope = scope;
        await repo.save(existing);
        return;
    }

    await repo.save(repo.create({ userId, provider: PROVIDER, accessToken, refreshToken, expiresAt, scope }));
}

export async function getGoogleClientForUser(userId: string) {
    const repo = dataSource.getRepository(OAuthAccount);
    const account = await repo.findOne({ where: { userId, provider: PROVIDER } });

    if (!account) {
        return null;
    }

    const client = buildBareOAuthClient();

    client.setCredentials({
        access_token: decrypt(account.accessToken),
        refresh_token: account.refreshToken ? decrypt(account.refreshToken) : null,
        expiry_date: account.expiresAt ? account.expiresAt.getTime() : null,
    });

    // google-auth-library refreshes the access token transparently during API calls;
    // persist whatever it hands back so the next request doesn't have to refresh again.
    client.on('tokens', (tokens) => {
        void saveGoogleTokensForUser(userId, tokens).catch((err) => {
            console.error('Failed to persist refreshed Google tokens', err);
        });
    });

    return client;
}

import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { User } from '../entities/User';
import { Session } from '../entities/Session';
import { OAuthAccount } from '../entities/OAuthAccount';
import { InitialSchema1755300000000 } from '../migrations/1755300000000-InitialSchema';

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set.');
}

export const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: [User, Session, OAuthAccount],
    migrations: [InitialSchema1755300000000],
    synchronize: false,
});

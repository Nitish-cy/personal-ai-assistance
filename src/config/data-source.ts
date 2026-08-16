import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { User } from '../entities/User';
import { Session } from '../entities/Session';
import { OAuthAccount } from '../entities/OAuthAccount';
import { Reminder } from '../entities/Reminder';
import { Conversation } from '../entities/Conversation';
import { InitialSchema1755300000000 } from '../migrations/1755300000000-InitialSchema';
import { AddReminders1755400000000 } from '../migrations/1755400000000-AddReminders';
import { AddConversations1755500000000 } from '../migrations/1755500000000-AddConversations';

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set.');
}

export const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: [User, Session, OAuthAccount, Reminder, Conversation],
    migrations: [InitialSchema1755300000000, AddReminders1755400000000, AddConversations1755500000000],
    synchronize: false,
});

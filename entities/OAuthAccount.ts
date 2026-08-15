import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    Unique,
    UpdateDateColumn,
} from 'typeorm';
import { User } from './User';

@Entity()
@Unique(['userId', 'provider'])
export class OAuthAccount {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column('uuid')
    userId!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user!: User;

    @Column('varchar', { length: 50 })
    provider!: string;

    // Encrypted at rest - see crypto-util.ts. Never store these in plaintext.
    @Column('text')
    accessToken!: string;

    @Column('text', { nullable: true })
    refreshToken!: string | null;

    @Column('timestamptz', { nullable: true })
    expiresAt!: Date | null;

    @Column('varchar', { length: 500, nullable: true })
    scope!: string | null;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}

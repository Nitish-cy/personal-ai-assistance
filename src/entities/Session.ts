import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { User } from './User';

@Entity()
export class Session {
    @PrimaryColumn('varchar', { length: 255 })
    id!: string;

    @Column('uuid')
    userId!: string;

    @ManyToOne(() => User, (user) => user.sessions, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user!: User;

    @Column('timestamptz')
    expiresAt!: Date;

    @CreateDateColumn()
    createdAt!: Date;
}

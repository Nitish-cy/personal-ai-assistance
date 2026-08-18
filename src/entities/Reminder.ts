import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './User';

@Entity()
export class Reminder {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column('uuid')
    userId!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user!: User;

    @Column('varchar', { length: 255 })
    eventId!: string;

    @Column('varchar', { length: 500 })
    eventSummary!: string;

    @Column('timestamptz')
    remindAt!: Date;

    @Column('boolean', { default: false })
    seen!: boolean;

    @CreateDateColumn()
    createdAt!: Date;
}

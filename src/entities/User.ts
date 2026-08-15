import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Session } from './Session';

@Entity()
export class User {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column('varchar', { length: 255 })
    name!: string;

    @Column('varchar', { length: 255, unique: true })
    email!: string;

    @Column('varchar', { length: 255 })
    passwordHash!: string;

    @OneToMany(() => Session, (session) => session.user)
    sessions!: Session[];

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}

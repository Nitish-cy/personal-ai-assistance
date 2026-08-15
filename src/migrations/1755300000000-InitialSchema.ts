import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1755300000000 implements MigrationInterface {
    name = 'InitialSchema1755300000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

        await queryRunner.query(`
            CREATE TABLE "user" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying(255) NOT NULL,
                "email" character varying(255) NOT NULL,
                "passwordHash" character varying(255) NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email"),
                CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`
            CREATE TABLE "session" (
                "id" character varying(255) NOT NULL,
                "userId" uuid NOT NULL,
                "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_f55da76ac1c3ac420f444d2ff11" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`
            CREATE TABLE "o_auth_account" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" uuid NOT NULL,
                "provider" character varying(50) NOT NULL,
                "accessToken" text NOT NULL,
                "refreshToken" text,
                "expiresAt" TIMESTAMP WITH TIME ZONE,
                "scope" character varying(500),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_70488c823a795f9e714f4538a76" UNIQUE ("userId", "provider"),
                CONSTRAINT "PK_c6d5ec585a70cc98562375fafc7" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`
            ALTER TABLE "session"
            ADD CONSTRAINT "FK_3d2f174ef04fb312fdebd0ddc53"
            FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE
        `);

        await queryRunner.query(`
            ALTER TABLE "o_auth_account"
            ADD CONSTRAINT "FK_12d0d6928e2fc57edef813fb7c0"
            FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "o_auth_account" DROP CONSTRAINT "FK_12d0d6928e2fc57edef813fb7c0"`);
        await queryRunner.query(`ALTER TABLE "session" DROP CONSTRAINT "FK_3d2f174ef04fb312fdebd0ddc53"`);
        await queryRunner.query(`DROP TABLE "o_auth_account"`);
        await queryRunner.query(`DROP TABLE "session"`);
        await queryRunner.query(`DROP TABLE "user"`);
    }
}

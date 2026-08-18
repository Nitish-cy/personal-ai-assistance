import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddConversations1755500000000 implements MigrationInterface {
    name = 'AddConversations1755500000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "conversation" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" uuid NOT NULL,
                "title" character varying(200) NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_conversation_id" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`
            ALTER TABLE "conversation"
            ADD CONSTRAINT "FK_conversation_userId"
            FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE
        `);

        await queryRunner.query(`CREATE INDEX "IDX_conversation_user_updatedAt" ON "conversation" ("userId", "updatedAt")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_conversation_user_updatedAt"`);
        await queryRunner.query(`ALTER TABLE "conversation" DROP CONSTRAINT "FK_conversation_userId"`);
        await queryRunner.query(`DROP TABLE "conversation"`);
    }
}

import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReminders1755400000000 implements MigrationInterface {
    name = 'AddReminders1755400000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "reminder" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" uuid NOT NULL,
                "eventId" character varying(255) NOT NULL,
                "eventSummary" character varying(500) NOT NULL,
                "remindAt" TIMESTAMP WITH TIME ZONE NOT NULL,
                "seen" boolean NOT NULL DEFAULT false,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_reminder_id" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`
            ALTER TABLE "reminder"
            ADD CONSTRAINT "FK_reminder_userId"
            FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE
        `);

        await queryRunner.query(`CREATE INDEX "IDX_reminder_user_remindAt" ON "reminder" ("userId", "remindAt")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_reminder_user_remindAt"`);
        await queryRunner.query(`ALTER TABLE "reminder" DROP CONSTRAINT "FK_reminder_userId"`);
        await queryRunner.query(`DROP TABLE "reminder"`);
    }
}

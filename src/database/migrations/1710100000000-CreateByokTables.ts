import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateByokTables1710100000000 implements MigrationInterface {
  name = 'CreateByokTables1710100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create user_keys table
    await queryRunner.query(`
      CREATE TABLE "user_keys" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organizationId" uuid NOT NULL,
        "identity" character varying NOT NULL,
        "provider" character varying NOT NULL,
        "encryptedApiKey" text NOT NULL,
        "keyHint" character varying(8),
        "baseUrl" character varying,
        "isActive" boolean NOT NULL DEFAULT true,
        "lastUsedAt" TIMESTAMP,
        "requestCount" bigint NOT NULL DEFAULT 0,
        "totalTokens" bigint NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_keys" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_user_keys_org_identity_provider" UNIQUE ("organizationId", "identity", "provider"),
        CONSTRAINT "FK_user_keys_organization" FOREIGN KEY ("organizationId") 
          REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    // Create indexes for user_keys
    await queryRunner.query(`
      CREATE INDEX "IDX_user_keys_organizationId" ON "user_keys" ("organizationId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_user_keys_identity" ON "user_keys" ("identity")
    `);

    // Create byok_configs table
    await queryRunner.query(`
      CREATE TABLE "byok_configs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organizationId" uuid NOT NULL,
        "enabled" boolean NOT NULL DEFAULT true,
        "allowedProviders" jsonb NOT NULL DEFAULT '["openai", "anthropic", "google", "xai"]',
        "validateKeysOnSave" boolean NOT NULL DEFAULT true,
        "trackUsage" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_byok_configs" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_byok_configs_organizationId" UNIQUE ("organizationId"),
        CONSTRAINT "FK_byok_configs_organization" FOREIGN KEY ("organizationId") 
          REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    // Create index for byok_configs
    await queryRunner.query(`
      CREATE INDEX "IDX_byok_configs_organizationId" ON "byok_configs" ("organizationId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_byok_configs_organizationId"`);
    await queryRunner.query(`DROP TABLE "byok_configs"`);
    await queryRunner.query(`DROP INDEX "IDX_user_keys_identity"`);
    await queryRunner.query(`DROP INDEX "IDX_user_keys_organizationId"`);
    await queryRunner.query(`DROP TABLE "user_keys"`);
  }
}

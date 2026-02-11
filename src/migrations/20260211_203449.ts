import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_service_accounts\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`revoked\` integer,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`enable_a_p_i_key\` integer,
  	\`api_key\` text,
  	\`api_key_index\` text
  );
  `)
  await db.run(sql`INSERT INTO \`__new_service_accounts\`("id", "name", "revoked", "updated_at", "created_at", "enable_a_p_i_key", "api_key", "api_key_index") SELECT "id", "name", "revoked", "updated_at", "created_at", "enable_a_p_i_key", "api_key", "api_key_index" FROM \`service_accounts\`;`)
  await db.run(sql`DROP TABLE \`service_accounts\`;`)
  await db.run(sql`ALTER TABLE \`__new_service_accounts\` RENAME TO \`service_accounts\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE INDEX \`service_accounts_updated_at_idx\` ON \`service_accounts\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`service_accounts_created_at_idx\` ON \`service_accounts\` (\`created_at\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_service_accounts\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text,
  	\`revoked\` integer,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`enable_a_p_i_key\` integer,
  	\`api_key\` text,
  	\`api_key_index\` text
  );
  `)
  await db.run(sql`INSERT INTO \`__new_service_accounts\`("id", "name", "revoked", "updated_at", "created_at", "enable_a_p_i_key", "api_key", "api_key_index") SELECT "id", "name", "revoked", "updated_at", "created_at", "enable_a_p_i_key", "api_key", "api_key_index" FROM \`service_accounts\`;`)
  await db.run(sql`DROP TABLE \`service_accounts\`;`)
  await db.run(sql`ALTER TABLE \`__new_service_accounts\` RENAME TO \`service_accounts\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE INDEX \`service_accounts_updated_at_idx\` ON \`service_accounts\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`service_accounts_created_at_idx\` ON \`service_accounts\` (\`created_at\`);`)
}

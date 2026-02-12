import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_sessions\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`title\` text NOT NULL,
  	\`date\` text NOT NULL,
  	\`published\` integer DEFAULT false NOT NULL,
  	\`host_preferred_name\` text NOT NULL,
  	\`host_discord_id\` numeric,
  	\`description\` text NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`INSERT INTO \`__new_sessions\`("id", "title", "date", "published", "host_preferred_name", "host_discord_id", "description", "updated_at", "created_at") SELECT "id", "title", "date", "published", "host_preferred_name", "host_discord_id", "description", "updated_at", "created_at" FROM \`sessions\`;`)
  await db.run(sql`DROP TABLE \`sessions\`;`)
  await db.run(sql`ALTER TABLE \`__new_sessions\` RENAME TO \`sessions\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE INDEX \`sessions_date_idx\` ON \`sessions\` (\`date\`);`)
  await db.run(sql`CREATE INDEX \`sessions_updated_at_idx\` ON \`sessions\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`sessions_created_at_idx\` ON \`sessions\` (\`created_at\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_sessions\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`title\` text NOT NULL,
  	\`date\` text NOT NULL,
  	\`published\` integer,
  	\`host_preferred_name\` text NOT NULL,
  	\`host_discord_id\` numeric,
  	\`description\` text NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`INSERT INTO \`__new_sessions\`("id", "title", "date", "published", "host_preferred_name", "host_discord_id", "description", "updated_at", "created_at") SELECT "id", "title", "date", "published", "host_preferred_name", "host_discord_id", "description", "updated_at", "created_at" FROM \`sessions\`;`)
  await db.run(sql`DROP TABLE \`sessions\`;`)
  await db.run(sql`ALTER TABLE \`__new_sessions\` RENAME TO \`sessions\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE INDEX \`sessions_date_idx\` ON \`sessions\` (\`date\`);`)
  await db.run(sql`CREATE INDEX \`sessions_updated_at_idx\` ON \`sessions\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`sessions_created_at_idx\` ON \`sessions\` (\`created_at\`);`)
}

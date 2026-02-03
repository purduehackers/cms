import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`events\` ADD \`event_type\` text DEFAULT 'hack-night' NOT NULL;`)
  await db.run(sql`ALTER TABLE \`events\` ADD \`description\` text NOT NULL;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`events\` DROP COLUMN \`event_type\`;`)
  await db.run(sql`ALTER TABLE \`events\` DROP COLUMN \`description\`;`)
}

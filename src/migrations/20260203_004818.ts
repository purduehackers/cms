import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`events_statis\` RENAME TO \`events_stats\`;`)
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_events_stats\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`data\` text NOT NULL,
  	\`label\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`events\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new_events_stats\`("_order", "_parent_id", "id", "data", "label") SELECT "_order", "_parent_id", "id", "data", "label" FROM \`events_stats\`;`)
  await db.run(sql`DROP TABLE \`events_stats\`;`)
  await db.run(sql`ALTER TABLE \`__new_events_stats\` RENAME TO \`events_stats\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE INDEX \`events_stats_order_idx\` ON \`events_stats\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`events_stats_parent_id_idx\` ON \`events_stats\` (\`_parent_id\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`events_statis\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`data\` text NOT NULL,
  	\`label\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`events\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`events_statis_order_idx\` ON \`events_statis\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`events_statis_parent_id_idx\` ON \`events_statis\` (\`_parent_id\`);`)
  await db.run(sql`DROP TABLE \`events_stats\`;`)
}

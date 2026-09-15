import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  const missing = await db.all<{ id: number }>(
    sql`SELECT id FROM events WHERE end IS NULL OR trim(end) = '';`,
  )
  if (missing.length > 0) {
    throw new Error(
      `Set explicit end times for CMS events ${missing.map(({ id }) => id).join(', ')} before requiring event end times. End times must not be inferred.`,
    )
  }

  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_events\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`name\` text NOT NULL,
    \`slug\` text,
    \`published\` integer DEFAULT false NOT NULL,
    \`event_type\` text DEFAULT 'hack-night' NOT NULL,
    \`start\` text NOT NULL,
    \`end\` text NOT NULL,
    \`location_name\` text,
    \`location_url\` text,
    \`description\` text NOT NULL,
    \`send\` integer DEFAULT false,
    \`sent_at\` text,
    \`reminders_sent\` integer DEFAULT false,
    \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(
    sql`INSERT INTO \`__new_events\`("id", "name", "slug", "published", "event_type", "start", "end", "location_name", "location_url", "description", "send", "sent_at", "reminders_sent", "updated_at", "created_at") SELECT "id", "name", "slug", "published", "event_type", "start", "end", "location_name", "location_url", "description", "send", "sent_at", "reminders_sent", "updated_at", "created_at" FROM \`events\`;`,
  )
  await db.run(sql`DROP TABLE \`events\`;`)
  await db.run(sql`ALTER TABLE \`__new_events\` RENAME TO \`events\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE UNIQUE INDEX \`events_slug_idx\` ON \`events\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX \`events_updated_at_idx\` ON \`events\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`events_created_at_idx\` ON \`events\` (\`created_at\`);`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_events\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`name\` text NOT NULL,
    \`slug\` text,
    \`published\` integer DEFAULT false NOT NULL,
    \`event_type\` text DEFAULT 'hack-night' NOT NULL,
    \`start\` text NOT NULL,
    \`end\` text,
    \`location_name\` text,
    \`location_url\` text,
    \`description\` text NOT NULL,
    \`send\` integer DEFAULT false,
    \`sent_at\` text,
    \`reminders_sent\` integer DEFAULT false,
    \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(
    sql`INSERT INTO \`__new_events\`("id", "name", "slug", "published", "event_type", "start", "end", "location_name", "location_url", "description", "send", "sent_at", "reminders_sent", "updated_at", "created_at") SELECT "id", "name", "slug", "published", "event_type", "start", "end", "location_name", "location_url", "description", "send", "sent_at", "reminders_sent", "updated_at", "created_at" FROM \`events\`;`,
  )
  await db.run(sql`DROP TABLE \`events\`;`)
  await db.run(sql`ALTER TABLE \`__new_events\` RENAME TO \`events\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE UNIQUE INDEX \`events_slug_idx\` ON \`events\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX \`events_updated_at_idx\` ON \`events\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`events_created_at_idx\` ON \`events\` (\`created_at\`);`)
}

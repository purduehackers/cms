import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  const keys = await db.all<{ id: number }>(sql`SELECT id FROM payload_mcp_api_keys LIMIT 1`)
  if (keys.length > 0) {
    throw new Error(
      'Remove existing MCP keys before changing their owner collection. Other CMS records are unaffected.',
    )
  }
  // Keep the table rebuild on one Turso connection without remapping credential owners.
  await db.$client.migrate([
    `CREATE TABLE __new_payload_mcp_api_keys (
      id integer PRIMARY KEY NOT NULL,
      user_id integer NOT NULL,
      label text,
      description text,
      events_find integer DEFAULT false,
      events_create integer DEFAULT false,
      events_update integer DEFAULT false,
      events_delete integer DEFAULT false,
      rsvps_find integer DEFAULT false,
      rsvps_create integer DEFAULT false,
      rsvps_update integer DEFAULT false,
      rsvps_delete integer DEFAULT false,
      emails_find integer DEFAULT false,
      emails_create integer DEFAULT false,
      emails_update integer DEFAULT false,
      emails_delete integer DEFAULT false,
      hack_night_sessions_find integer DEFAULT false,
      hack_night_sessions_create integer DEFAULT false,
      hack_night_sessions_update integer DEFAULT false,
      hack_night_sessions_delete integer DEFAULT false,
      media_find integer DEFAULT false,
      media_create integer DEFAULT false,
      media_update integer DEFAULT false,
      media_delete integer DEFAULT false,
      shelter_find integer DEFAULT false,
      shelter_create integer DEFAULT false,
      shelter_update integer DEFAULT false,
      shelter_delete integer DEFAULT false,
      microgrants_find integer DEFAULT false,
      microgrants_create integer DEFAULT false,
      microgrants_update integer DEFAULT false,
      microgrants_delete integer DEFAULT false,
      users_find integer DEFAULT false,
      users_create integer DEFAULT false,
      users_update integer DEFAULT false,
      users_delete integer DEFAULT false,
      service_accounts_find integer DEFAULT false,
      service_accounts_create integer DEFAULT false,
      service_accounts_update integer DEFAULT false,
      service_accounts_delete integer DEFAULT false,
      updated_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
      created_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
      enable_a_p_i_key integer,
      api_key text,
      api_key_index text,
      FOREIGN KEY (user_id) REFERENCES service_accounts(id) ON UPDATE no action ON DELETE set null
    );`,
    `DROP TABLE payload_mcp_api_keys;`,
    `ALTER TABLE __new_payload_mcp_api_keys RENAME TO payload_mcp_api_keys;`,
    `CREATE INDEX payload_mcp_api_keys_user_idx ON payload_mcp_api_keys (user_id);`,
    `CREATE INDEX payload_mcp_api_keys_updated_at_idx ON payload_mcp_api_keys (updated_at);`,
    `CREATE INDEX payload_mcp_api_keys_created_at_idx ON payload_mcp_api_keys (created_at);`,
  ])
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  const keys = await db.all<{ id: number }>(sql`SELECT id FROM payload_mcp_api_keys LIMIT 1`)
  if (keys.length > 0) {
    throw new Error(
      'Remove existing MCP keys before changing their owner collection. Other CMS records are unaffected.',
    )
  }
  // Keep the table rebuild on one Turso connection without remapping credential owners.
  await db.$client.migrate([
    `CREATE TABLE __new_payload_mcp_api_keys (
      id integer PRIMARY KEY NOT NULL,
      user_id integer NOT NULL,
      label text,
      description text,
      events_find integer DEFAULT false,
      rsvps_find integer DEFAULT false,
      hack_night_sessions_find integer DEFAULT false,
      shelter_find integer DEFAULT false,
      microgrants_find integer DEFAULT false,
      updated_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
      created_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
      enable_a_p_i_key integer,
      api_key text,
      api_key_index text,
      FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE no action ON DELETE set null
    );`,
    `DROP TABLE payload_mcp_api_keys;`,
    `ALTER TABLE __new_payload_mcp_api_keys RENAME TO payload_mcp_api_keys;`,
    `CREATE INDEX payload_mcp_api_keys_user_idx ON payload_mcp_api_keys (user_id);`,
    `CREATE INDEX payload_mcp_api_keys_updated_at_idx ON payload_mcp_api_keys (updated_at);`,
    `CREATE INDEX payload_mcp_api_keys_created_at_idx ON payload_mcp_api_keys (created_at);`,
  ])
}

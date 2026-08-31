import type { CollectionConfig } from 'payload'
import { anyone, hasAnyRoles, isEditor, isViewer, loggedIn } from './auth-utils'

export const Media: CollectionConfig = {
  slug: 'media',
  admin: {
    group: 'Assets',
  },
  access: {
    read: anyone,
    readVersions: isViewer,
    create: hasAnyRoles('editor', 'wack_hacker'),
    update: isEditor,
    delete: (args) => {
      if (isEditor(args)) {
        return true
      }
      if (hasAnyRoles('wack_hacker')(args)) {
        // The bot may only remove what it uploaded: an ❌ reaction in a drop
        // thread deletes that message's media, and nothing else.
        return {
          source: {
            in: ['hack-night', 'discord-drop'],
          },
        }
      }
      return false
    },
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
    {
      name: 'batchId',
      type: 'text',
      index: true,
      access: {
        read: loggedIn,
      },
      admin: {
        description:
          'Groups media uploaded in the same batch: a hack-night date slug, or the slug of the event an /image-drop thread files to. Filter by this to bulk-attach into events.images[].',
      },
    },
    {
      name: 'discordMessageId',
      type: 'text',
      index: true,
      access: {
        read: loggedIn,
      },
    },
    {
      name: 'discordUserId',
      type: 'text',
      index: true,
      access: {
        read: loggedIn,
      },
    },
    {
      name: 'source',
      type: 'select',
      options: [
        { value: 'manual', label: 'Manual' },
        { value: 'hack-night', label: 'Hack Night (bot)' },
        { value: 'discord-drop', label: 'Discord Image Drop (bot)' },
      ],
      defaultValue: 'manual',
      index: true,
      access: {
        read: loggedIn,
      },
    },
  ],
  // Sizing is the events site's job (Vercel image optimizer); the CMS stores
  // originals only.
  upload: true,
}

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
        return {
          source: {
            equals: 'hack-night',
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
          'Groups media uploaded in the same batch (e.g. a hack-night UUID). Filter by this to bulk-attach into events.images[].',
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
      ],
      defaultValue: 'manual',
      index: true,
      access: {
        read: loggedIn,
      },
    },
  ],
  upload: {
    // Originals are kept untouched; generated sizes are webp. The events site
    // uses `thumbnailURL` (from adminThumbnail) and falls back to the original
    // when a doc predates these sizes — run scripts/regenerate-media-sizes.ts
    // to backfill existing media.
    imageSizes: [
      { name: 'thumbnail', width: 240, height: 240, position: 'centre', formatOptions: { format: 'webp' } },
      { name: 'card', width: 640, formatOptions: { format: 'webp' } },
      { name: 'gallery', width: 1200, formatOptions: { format: 'webp' } },
    ],
    adminThumbnail: 'thumbnail',
  },
}

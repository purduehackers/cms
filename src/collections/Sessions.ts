import type { CollectionConfig, TextFieldSingleValidation } from 'payload'
import { hasAnyRoles, isEditor } from './auth-utils'

export const Sessions: CollectionConfig = {
  slug: 'sessions',
  admin: {
    description: 'Hack Night sessions',
    useAsTitle: 'title',
    group: 'Content',
  },
  access: {
    read: hasAnyRoles('viewer', 'sessionsViewer'),
    readVersions: hasAnyRoles('viewer', 'sessionsViewer'),
    create: isEditor,
    update: isEditor,
    delete: isEditor,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'date',
      type: 'date',
      required: true,
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
      index: true,
    },
    {
      name: 'published',
      type: 'checkbox',
      label: 'Publish',
      required: true,
      defaultValue: false,
      admin: {
        description:
          'Check this box to make the session public, e.g. visible on the Hack Night dashboard',
      },
    },
    {
      name: 'host',
      label: 'Host information',
      type: 'group',
      fields: [
        {
          name: 'preferred_name',
          label: 'Preferred name',
          type: 'text',
          required: true,
        },
        {
          name: 'discord_id',
          label: 'Discord ID',
          type: 'text',
          validate: ((value) =>
            /^[0-9]+$/.test(value) || 'Must be a number') satisfies TextFieldSingleValidation,
          admin: {
            description: "The host's Discord ID. This should be a number, not their username.",
          },
        },
      ],
    },
    {
      name: 'description',
      type: 'richText',
      required: true,
    },
    {
      name: 'images',
      type: 'array',
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          required: true,
        },
      ],
    },
  ],
}

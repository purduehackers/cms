import type { CollectionConfig } from 'payload'

export const Sessions: CollectionConfig = {
  slug: 'sessions',
  admin: {
    description: 'Hack Night sessions',
    useAsTitle: 'title',
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
          type: 'number',
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

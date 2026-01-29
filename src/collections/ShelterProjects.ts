import type { CollectionConfig } from 'payload'

export const ShelterProjects: CollectionConfig = {
  slug: 'shelter-projects',
  admin: {
    useAsTitle: 'name',
  },
  access: {
    read: ({ req }) => {
      if (req.user) return true
      return { visible: { equals: true } }
    },
  },
  fields: [
    {
      name: 'visible',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        position: 'sidebar',
        description: 'Uncheck to hide from the public API',
      },
    },
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'last_division',
      type: 'text',
      required: true,
    },
    {
      name: 'last_owner',
      type: 'text',
      required: true,
    },
    {
      name: 'description',
      type: 'richText',
      required: true,
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      required: true,
    },
  ],
}

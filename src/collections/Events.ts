import type { CollectionConfig } from 'payload'

export const Events: CollectionConfig = {
  slug: 'events',
  admin: {
    useAsTitle: 'name',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'start',
      type: 'date',
      required: true,
    },
    {
      name: 'end',
      type: 'date',
      required: false,
    },
    {
      name: 'location_name',
      type: 'text',
      required: false,
    },
    {
      name: 'location_url',
      type: 'text',
      required: false,
    },
    {
      name: 'stats',
      type: 'array',
      fields: [
        {
          name: 'data',
          type: 'text',
          required: true,
        },
        {
          name: 'label',
          type: 'text',
          required: true,
        },
      ],
    },
  ],
}

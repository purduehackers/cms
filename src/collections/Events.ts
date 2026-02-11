import type { CollectionConfig } from 'payload'
import { isEditor, isViewer } from './auth-utils'

export const Events: CollectionConfig = {
  slug: 'events',
  admin: {
    useAsTitle: 'name',
    group: 'Content',
  },
  access: {
    read: isViewer,
    readVersions: isViewer,
    create: isEditor,
    update: isEditor,
    delete: isEditor,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'eventType',
      type: 'text',
      label: 'Event Type',
      defaultValue: 'hack-night',
      required: true,
      admin: {
        components: {
          Field: '@/components/EventTypeField',
        },
      },
    },
    {
      name: 'start',
      type: 'date',
      required: true,
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'end',
      type: 'date',
      required: false,
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
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

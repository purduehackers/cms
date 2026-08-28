import { mcpPlugin } from '@payloadcms/plugin-mcp'
import { redirectsPlugin } from '@payloadcms/plugin-redirects'
import { searchPlugin } from '@payloadcms/plugin-search'
import { sentryPlugin } from '@payloadcms/plugin-sentry'
import { seoPlugin } from '@payloadcms/plugin-seo'
import type { GenerateTitle, GenerateURL } from '@payloadcms/plugin-seo/types'
import { convertLexicalToPlaintext } from '@payloadcms/richtext-lexical/plaintext'
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'
import * as Sentry from '@sentry/nextjs'
import type { Plugin } from 'payload'

import type { Event, HackNightSession, Microgrant, Shelter } from '@/payload-types'

type SeoDoc = Event | HackNightSession | Shelter | Microgrant

const generateTitle: GenerateTitle<SeoDoc> = ({ doc }) => {
  const title = 'name' in doc && doc.name ? doc.name : 'title' in doc ? doc.title : undefined
  return title ? `${title} | Purdue Hackers` : 'Purdue Hackers CMS'
}

const generateURL: GenerateURL<SeoDoc> = ({ doc }) => {
  const base = 'https://cms.purduehackers.com'
  return doc?.id ? `${base}/admin/collections/${doc.id}` : base
}

export const plugins: Plugin[] = [
  redirectsPlugin({
    collections: ['events', 'shelter', 'microgrants', 'hack-night-sessions'],
    overrides: {
      admin: { group: 'Meta' },
    },
  }),
  seoPlugin({
    generateTitle,
    generateURL,
  }),
  searchPlugin({
    collections: ['events', 'shelter', 'microgrants', 'hack-night-sessions'],
    searchOverrides: {
      admin: { group: 'Meta' },
      fields: ({ defaultFields }) => [
        ...defaultFields,
        // Denormalized event fields so the events site can render search
        // results (link, upcoming/past split) without a second lookup —
        // depth-population of `doc` is not available to its service account
        { name: 'eventSlug', type: 'text', index: true },
        { name: 'eventType', type: 'text', index: true },
        { name: 'start', type: 'date', index: true },
        { name: 'published', type: 'checkbox', index: true },
        { name: 'excerpt', type: 'textarea' },
      ],
    },
    // Source collections title their docs `name` (events) or `title`; without
    // this mapping every search doc syncs with title: null and nothing is
    // searchable. Re-index after deploying (Search collection → Reindex).
    beforeSync: ({ originalDoc, searchDoc }) => {
      const title =
        ('name' in originalDoc && originalDoc.name) ||
        ('title' in originalDoc && originalDoc.title) ||
        null
      const base = { ...searchDoc, title }

      if (searchDoc.doc?.relationTo !== 'events') return base

      const event = originalDoc as Event
      let plaintext = ''
      try {
        plaintext = convertLexicalToPlaintext({
          data: event.description as SerializedEditorState,
        })
      } catch {
        // non-lexical or empty description — excerpt falls back to location
      }
      return {
        ...base,
        eventSlug: event.slug ?? null,
        eventType: event.eventType ?? null,
        start: event.start ?? null,
        published: event.published ?? false,
        excerpt:
          [plaintext, event.location_name].filter(Boolean).join(' — ').slice(0, 2000) || null,
      }
    },
  }),
  sentryPlugin({
    Sentry,
    options: {
      captureErrors: [400, 403, 500],
    },
  }),
  mcpPlugin({
    collections: {
      events: { enabled: { find: true } },
      rsvps: { enabled: { find: true } },
      'hack-night-sessions': { enabled: { find: true } },
      shelter: { enabled: { find: true } },
      microgrants: { enabled: { find: true } },
    },
  }),
]

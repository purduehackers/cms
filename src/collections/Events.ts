import type {
  CollectionAfterChangeHook,
  CollectionBeforeChangeHook,
  CollectionConfig,
  PayloadRequest,
  TextFieldValidation,
} from 'payload'
import { hasAnyRoles, isEditor } from './auth-utils'
import { renderEmailTemplate } from '@/emails/EmailTemplate'
import { formatEventStart } from '@/emails/format'
import { Event } from '@/payload-types'

export function createSlugFromName(name: string, eventType?: string) {
  let slug = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/(^-|-$)/g, '')

  // Remove hack night and workshop eventTypes from slug
  if (eventType == 'hack-night' || eventType == 'workshop') {
    if (slug.includes(`-${eventType}`)) {
      slug = slug.replace(`-${eventType}`, '')
    } else if (slug.includes(`${eventType}-`)) {
      slug = slug.replace(`${eventType}-`, '')
    }
  }

  return slug
}

export const EVENTS_SITE_URL = 'https://events.purduehackers.com'

// Public page URL for an event on the events site. The site routes events as
// /events/<category-slug>/<slug> — an id-based URL 404s over there.
export function getEventPageUrl(eventDoc: Pick<Event, 'eventType' | 'slug'>) {
  const catSlug = (eventDoc.eventType || 'other').replaceAll(' ', '-').toLowerCase()
  return `${EVENTS_SITE_URL}/events/${catSlug}/${eventDoc.slug}`
}

// Helper for formatting text indicating how long until event occurs
export function getTimeUntilText(start?: Date | null) {
  if (!start) {
    return 'soon'
  }

  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto', style: 'long' })
  const now = new Date()
  const diffMs = start.getTime() - now.getTime()
  const diffMinutes = Math.ceil(diffMs / 60000)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const eventDay = new Date(start.getFullYear(), start.getMonth(), start.getDate())

  if (diffMinutes <= 0) return 'now'
  else if (diffMinutes < 60) return formatter.format(diffMinutes, 'minute')

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return formatter.format(diffHours, 'hour')

  const diffDays = Math.round((eventDay.getTime() - today.getTime()) / 86400000)
  if (diffDays === 0) return 'today'
  else if (diffDays === 1) return 'tomorrow'
  else if (diffDays < 14) return formatter.format(diffDays, 'day')

  const diffWeeks = Math.floor(diffDays / 7)
  return formatter.format(diffWeeks, 'week')
}

// Helper for formatting email body
export function getEventReminderText(
  eventName: string,
  startText: string,
  timeUntilText: string,
  locationName?: string,
  customBody?: string,
) {
  const locationText = locationName ? ` at ${locationName}` : ''
  const greeting = `Hi there!\n\nThis is a friendly reminder that ${eventName} is happening ${timeUntilText} on ${startText}${locationText}.`
  const body = customBody ? `\n\n${customBody}` : '\n\nHope to see you there :)'
  return `${greeting}${body}`
}

// Returns html for email given event info
async function getEmailData(eventDoc: Event) {
  if (!eventDoc) {
    return
  }

  // Build event-specific info
  const eventName = eventDoc.name || 'your Purdue Hackers event'
  const start = eventDoc.start ? new Date(eventDoc.start) : null
  const timeUntilText = getTimeUntilText(start)
  const startText = formatEventStart(start)
  const subject = `Reminder: ${eventName} is happening ${timeUntilText}!`
  const heading = `${eventName} is happening ${timeUntilText}!`
  const text = getEventReminderText(eventName, startText, timeUntilText, eventDoc.location_name)

  // Generate html from React Email
  const html = await renderEmailTemplate({
    heading,
    previewText: text,
    body: text,
    locationName: eventDoc.location_name,
    locationUrl: eventDoc.location_url,
    ctaUrl: getEventPageUrl(eventDoc),
  })

  return { subject, text, html }
}

// Sends the event's reminder email to every active RSVP (bcc) and records it
// in the emails collection. Shared by the manual "send" checkbox hook and the
// /send-reminders endpoint.
async function sendEventBlast(req: PayloadRequest, doc: Event): Promise<number> {
  const rsvpResults = await req.payload.find({
    collection: 'rsvps',
    depth: 0,
    limit: 0,
    pagination: false,
    overrideAccess: false,
    req,
    select: {
      email: true,
    },
    where: {
      and: [
        { event: { equals: doc.id } },
        { unsubscribed: { equals: false } },
        { cancelled: { not_equals: true } },
      ],
    },
  })

  const recipients = rsvpResults.docs
    .map((rsvp) => rsvp.email)
    .filter((email) => typeof email === 'string' && email.trim())

  const emailInfo = await getEmailData(doc)
  if (recipients.length > 0 && emailInfo) {
    await req.payload.sendEmail({
      to: 'events@purduehackers.com',
      bcc: recipients,
      subject: emailInfo.subject,
      text: emailInfo.text,
      html: emailInfo.html,
    })
  }

  // Create new corresponding Payload email object
  await req.payload.create({
    collection: 'emails',
    data: {
      event: doc.id,
      subject: emailInfo?.subject,
      body: emailInfo?.text,
    },
    overrideAccess: false,
    req,
    context: {
      skipEmailSend: true,
    },
  })

  return recipients.length
}

export const Events: CollectionConfig = {
  slug: 'events',
  admin: {
    useAsTitle: 'name',
    group: 'Events',
  },
  access: {
    read: hasAnyRoles('viewer', 'events_website'),
    readVersions: hasAnyRoles('viewer', 'events_website'),
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
      name: 'slug',
      type: 'text',
      required: false,
      unique: true,
      validate: async (
        slug: Parameters<TextFieldValidation>[0],
        options: Parameters<TextFieldValidation>[1],
      ) => {
        if (!slug) return true

        const id = options?.id
        const req = options?.req
        if (!req) return true

        const results = await req.payload.find({
          collection: 'events',
          depth: 0,
          limit: 1,
          pagination: false,
          overrideAccess: true,
          where: {
            slug: {
              equals: slug,
            },
          },
        })

        const existing = results.docs?.[0]
        if (!existing) return true
        if (id !== undefined && String(existing.id) === String(id)) return true

        return 'Slug must be unique. Another event already uses this slug.'
      },
      admin: {
        description:
          'Unique URL-friendly slug. Required but it will attempt to autogenerate if you submit empty.',
      },
    },
    {
      name: 'published',
      type: 'checkbox',
      required: true,
      defaultValue: false,
      admin: {
        description: 'Controls whether the event information is public (will show on events site)',
      },
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
    {
      name: 'send',
      type: 'checkbox',
      label: 'Send reminder email --WARNING!!! NON-REVERSABLE EMAIL BLAST (upon save)--',
      defaultValue: false,
      admin: {
        description: 'Check this box then save this event to send an email reminder to all RSVPs.',
      },
    },
    {
      name: 'sentAt',
      type: 'date',
      label: 'Sent at (automatically updated once email sent)',
      required: false,
      admin: {
        description: 'When email was last sent.',
      },
    },
    {
      name: 'remindersSent',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        hidden: true,
        description:
          'Set by the events site reminder cron once T-1-day reminders have gone out. Idempotence guard.',
      },
    },
  ],
  endpoints: [
    {
      // T-1-day reminders, triggered by the events site's hourly cron. The
      // whole pipeline lives here so it reuses the blast composer/template
      // and the emails audit log; remindersSent keeps it idempotent.
      path: '/send-reminders',
      method: 'post',
      handler: async (req) => {
        const allowed = hasAnyRoles('editor', 'events_website')({ req })
        if (allowed !== true) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const now = Date.now()
        const due = await req.payload.find({
          collection: 'events',
          where: {
            and: [
              { published: { equals: true } },
              { start: { greater_than: new Date(now + 23 * 3600_000).toISOString() } },
              { start: { less_than: new Date(now + 24 * 3600_000).toISOString() } },
              { remindersSent: { not_equals: true } },
            ],
          },
          limit: 10,
          overrideAccess: true,
        })

        const processed = []
        for (const event of due.docs) {
          try {
            const recipients = await sendEventBlast(req, event)
            await req.payload.update({
              collection: 'events',
              id: event.id,
              data: { remindersSent: true },
              overrideAccess: true,
              context: { skipEmailSend: true },
            })
            processed.push({ event: event.slug, recipients })
          } catch (err) {
            console.error('Reminder send failed for', event.slug, err)
            processed.push({ event: event.slug, error: true })
          }
        }

        return Response.json({ eventsInWindow: due.totalDocs, processed })
      },
    },
  ],
  hooks: {
    beforeChange: [
      async ({ originalDoc, data }) => {
        const name = data?.name || originalDoc?.name
        const eventType = data?.eventType || originalDoc?.eventType
        if (!name || data?.slug) {
          return data
        }

        return {
          ...data,
          slug: createSlugFromName(name, eventType),
        }
      },
    ] satisfies CollectionBeforeChangeHook<Event>[],
    afterChange: [
      async ({ doc, previousDoc, operation, req, context }) => {
        // Only on the false→true transition, never on a `send` that is merely
        // still true. A blast that fails leaves the flag set, and every later
        // save of the event — an editor fixing a typo, the Discord bot appending
        // a photo to images[] — would otherwise re-attempt it. Re-sending is
        // asked for by re-checking the box, not by touching the event.
        const justRequested =
          operation === 'create' ? Boolean(doc?.send) : Boolean(doc?.send) && !previousDoc?.send

        // Skip sending email if conditions not met
        if (!justRequested || context?.skipEmailSend) {
          console.log('send skipped')
          return doc
        }

        await sendEventBlast(req, doc)

        // Set send to false, update last sent field
        await req.payload.update({
          collection: 'events',
          id: doc.id,
          data: {
            send: false,
            sentAt: new Date().toISOString(),
          },
          overrideAccess: false,
          req,
          context: {
            skipEmailSend: true,
          },
        })

        return doc
      },
      async ({ doc, context }) => {
        // Internal update cascades (send/sentAt/remindersSent) don't change
        // public content — don't revalidate twice per save
        if (context?.skipEmailSend) return

        // Trigger ISR revalidation for the events site: the home page and the
        // event's real (slugged) page. Never fail the save over it.
        const routes = ['', new URL(getEventPageUrl(doc)).pathname]
        await Promise.allSettled(
          routes.map((route) =>
            fetch(`${EVENTS_SITE_URL}${route}`, {
              method: 'HEAD',
              headers: {
                'x-prerender-revalidate': process.env.ISR_REVALIDATION_TOKEN || '',
              },
            }),
          ),
        )
      },
    ] satisfies CollectionAfterChangeHook<Event>[],
  },
}

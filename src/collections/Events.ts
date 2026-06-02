import type {
  CollectionAfterChangeHook,
  CollectionBeforeChangeHook,
  CollectionConfig,
} from 'payload'
import { hasAnyRoles, isEditor } from './auth-utils'
import { renderEmailTemplate } from '@/emails/EmailTemplate'
import { Event } from '@/payload-types'

function createSlugFromName(name: string, eventType?: string) {
  let slug = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

  // Remove eventType if it appears at the end of the slug
  if (eventType) {
    const typeSlug = eventType
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')

    if (typeSlug && slug.endsWith(`-${typeSlug}`)) {
      slug = slug.slice(0, -(typeSlug.length + 1))
    }
  }

  return slug
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
  const startTextFormatter = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
    timeZone: 'America/New_York',
  })
  const startText = startTextFormatter.format(start)
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
    ctaUrl: `https://events.purduehackers.com/events/${eventDoc.id}`,
  })

  return { subject, text, html }
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
      admin: {
        description:
          'Optional URL-friendly slug. Automatically generated from the event name when created.',
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
  ],
  hooks: {
    beforeChange: [
      async ({ originalDoc, operation, data }) => {
        if (operation !== 'create') {
          return data
        }

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
      async ({ doc, req, context }) => {
        // Skip sending email if conditions not met
        if (!doc?.send || context?.skipEmailSend) {
          console.log('send skipped')
          return doc
        }

        // All RSVPs for this event
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
            and: [{ event: { equals: doc.id } }, { unsubscribed: { equals: false } }],
          },
        })

        const recipients = rsvpResults.docs
          .map((rsvp) => rsvp.email)
          .filter((email) => typeof email === 'string' && email.trim())

        // Send email blast
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
      async ({ doc }) => {
        // Trigger ISR revalidation for Events Site
        await fetch('https://events.purduehackers.com', {
          method: 'GET',
          headers: {
            'x-prerender-revalidate': process.env.ISR_REVALIDATION_TOKEN || '',
          },
        })
        await fetch(`https://events.purduehackers.com/events/${doc.id}`, {
          method: 'GET',
          headers: {
            'x-prerender-revalidate': process.env.ISR_REVALIDATION_TOKEN || '',
          },
        })
      },
    ] satisfies CollectionAfterChangeHook<Event>[],
  },
}

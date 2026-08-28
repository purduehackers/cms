import { APIError, type CollectionConfig } from 'payload'
import { hasAnyRoles, isEditor } from './auth-utils'
import { renderEmailTemplate } from '@/emails/EmailTemplate'
import { formatEventStart } from '@/emails/format'
import { EVENTS_SITE_URL, getEventPageUrl } from './Events'
import type { Event } from '@/payload-types'

// Returns html for email given event info
async function getEmailData(rsvpName: string | null, cancelToken: string | null, eventDoc: Event) {
  if (!eventDoc) {
    return
  }

  // Build event-specific info
  const startText = formatEventStart(eventDoc.start ? new Date(eventDoc.start) : null)

  const subject = `Excited to see you at ${eventDoc.name}!`
  const heading = `Excited to see you at ${eventDoc.name}!!`
  const cancelUrl = cancelToken
    ? `${EVENTS_SITE_URL}/rsvp/cancel?token=${encodeURIComponent(cancelToken)}`
    : null
  const text = [
    `${rsvpName ? `Hey ${rsvpName}` : 'Hello friend'}! You're registered to attend ${eventDoc.name} on ${startText} at ${eventDoc.location_name}.`,
    cancelUrl ? `Can't make it anymore? Cancel your RSVP here: ${cancelUrl}` : null,
  ]
    .filter(Boolean)
    .join('\n\n')

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

// Fetch the event's .ics from the events site so calendar apps can add it
// straight from the confirmation email. Best-effort: emails still send
// without the attachment (e.g. unpublished events 404 on the feed).
async function getIcsAttachment(eventDoc: Event) {
  if (!eventDoc?.slug) return null
  try {
    const res = await fetch(
      `${EVENTS_SITE_URL}/api/events.ics?slug=${encodeURIComponent(eventDoc.slug)}`,
    )
    if (!res.ok) return null
    const ics = await res.text()
    return {
      filename: `${eventDoc.slug}.ics`,
      content: Buffer.from(ics, 'utf-8'),
      contentType: 'text/calendar; charset=utf-8; method=PUBLISH',
    }
  } catch {
    return null
  }
}

export const Rsvps: CollectionConfig = {
  slug: 'rsvps',
  admin: {
    useAsTitle: 'email',
    group: 'Events',
  },
  access: {
    read: hasAnyRoles('viewer', 'events_website'),
    readVersions: hasAnyRoles('viewer', 'events_website'),
    create: hasAnyRoles('editor', 'events_website'),
    update: hasAnyRoles('editor', 'events_website'),
    delete: isEditor,
  },
  fields: [
    {
      name: 'email',
      type: 'email',
      required: true,
    },
    {
      name: 'name',
      type: 'text',
    },
    {
      name: 'event',
      type: 'relationship',
      relationTo: 'events',
      required: true,
    },
    {
      name: 'unsubscribed',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Designates whether owner of this email has unsubscribed from further notifs.',
      },
    },
    {
      // The only credential behind the no-account cancel link. Readable only
      // by editors and the events-site service account (which puts it in
      // confirmation/reminder emails) — never by viewer-level reads.
      name: 'cancelToken',
      type: 'text',
      unique: true,
      index: true,
      defaultValue: () => crypto.randomUUID(),
      access: {
        read: hasAnyRoles('editor', 'events_website'),
        update: () => false,
      },
      admin: {
        hidden: true,
      },
    },
    {
      name: 'cancelled',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Guest cancelled via their emailed cancel link.',
      },
    },
    {
      name: 'cancelledAt',
      type: 'date',
      admin: {
        hidden: true,
      },
    },
  ],
  endpoints: [
    {
      // Cancels the RSVP holding this token. Idempotent and non-enumerating:
      // every well-formed request gets the same { ok: true } back.
      path: '/cancel',
      method: 'post',
      handler: async (req) => {
        const body = ((await req.json?.()) ?? {}) as { token?: string }
        const token = body.token
        if (typeof token !== 'string' || !token || token.length > 100) {
          return Response.json({ ok: true })
        }

        const found = await req.payload.find({
          collection: 'rsvps',
          where: { cancelToken: { equals: token } },
          limit: 1,
          depth: 0,
          overrideAccess: true,
        })

        const doc = found.docs[0]
        if (doc && !doc.cancelled) {
          await req.payload.update({
            collection: 'rsvps',
            id: doc.id,
            data: { cancelled: true, cancelledAt: new Date().toISOString() },
            overrideAccess: true,
          })
        }

        return Response.json({ ok: true })
      },
    },
  ],
  hooks: {
    beforeValidate: [
      async ({ data, req, operation }) => {
        // One active RSVP per (event, email); a cancelled one may re-RSVP
        if (operation !== 'create' || !data?.email || !data?.event) return data
        const existing = await req.payload.find({
          collection: 'rsvps',
          where: {
            and: [
              { event: { equals: data.event } },
              { email: { equals: data.email } },
              { cancelled: { not_equals: true } },
            ],
          },
          limit: 1,
          depth: 0,
          overrideAccess: true,
        })
        if (existing.totalDocs > 0) {
          throw new APIError("You're already on the list for this event.", 400)
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, operation, req: { payload } }) => {
        if (operation === 'create') {
          try {
            // Send confirmation email after new rsvp is created
            const eventId = typeof doc.event === 'object' ? doc.event.id : doc.event
            const eventDoc = await payload.findByID({
              collection: 'events',
              id: eventId,
              depth: 0,
            })

            // Field read access on cancelToken covers everyone allowed to
            // create, so the token is present on the hook doc
            const [emailInfo, icsAttachment] = await Promise.all([
              getEmailData(doc.name, doc.cancelToken ?? null, eventDoc),
              getIcsAttachment(eventDoc),
            ])
            if (!emailInfo) {
              console.error('Email data generation failed', { doc, eventDoc })
              return
            }

            await payload.sendEmail({
              to: doc.email,
              subject: emailInfo.subject,
              text: emailInfo.text,
              html: emailInfo.html,
              ...(icsAttachment ? { attachments: [icsAttachment] } : {}),
            })
          } catch (err) {
            console.error('RSVP email send hook failed:', err)
          }
        }
      },
    ],
  },
}

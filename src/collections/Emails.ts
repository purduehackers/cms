import type { CollectionAfterChangeHook, CollectionConfig } from 'payload'
import { hasAnyRoles, isEditor } from './auth-utils'
import { renderEmailTemplate } from '@/emails/EmailTemplate'
import { Email } from '@/payload-types'

export const Emails: CollectionConfig = {
  slug: 'emails',
  admin: {
    useAsTitle: 'subject',
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
      name: 'event',
      type: 'relationship',
      relationTo: 'events',
      required: true,
      admin: {
        description: 'This email will be sent to RSVP-ers subscribed to this event.',
      },
    },
    {
      name: 'subject',
      type: 'text',
      required: true,
      defaultValue: 'Reminder: Purdue Hackers event starting soon!!!',
    },
    {
      name: 'body',
      type: 'textarea',
      required: true,
      defaultValue:
        'Hi there!\n\nThis is a friendly reminder that the event is coming up soon. We look forward to seeing you there!',
      admin: {
        rows: 8,
      },
    },
    {
      name: 'send',
      type: 'checkbox',
      label: 'Send email --WARNING!!! NON-REVERSABLE EMAIL BLAST (upon save)--',
      defaultValue: false,
      admin: {
        description:
          'Check this box then save this email to send an email reminder to all RSVPs for the selected event.',
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
    afterChange: [
      async ({ doc, req, context }) => {
        // Skip sending email if conditions not met
        if (!doc?.send || context?.skipEmailSend) {
          console.log('send skipped')
          return doc
        }

        // Associated event
        const eventDoc = await req.payload.findByID({
          collection: 'events',
          id: typeof doc.event === 'number' ? doc.event : doc.event.id,
          overrideAccess: false,
          req,
        })

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
            and: [{ event: { equals: doc.event } }, { unsubscribed: { equals: false } }],
          },
        })
        console.log('rsvp results: ', rsvpResults)

        const recipients = rsvpResults.docs
          .map((rsvp) => rsvp.email)
          .filter((email) => typeof email === 'string' && email.trim())
        console.log('recipients: ', recipients)

        const subject = doc.subject
        const body = doc.body
        const previewText = doc.body
        const text = body
        const html = await renderEmailTemplate({
          heading: subject,
          previewText,
          body,
          locationName: eventDoc?.location_name,
          locationUrl: eventDoc?.location_url,
          ctaUrl: `https://events.purduehackers.com/events/${eventDoc.id}`,
        })

        // Send email blast
        if (recipients.length > 0) {
          await req.payload.sendEmail({
            // Real recipients are bcc'd, so the To is only the copy we keep. It
            // has to be an address Email Routing delivers, or that copy goes
            // nowhere.
            to: 'team@purduehackers.com',
            bcc: recipients,
            subject,
            text,
            html,
          })
        }

        // Set send to false, update last sent field
        await req.payload.update({
          collection: 'emails',
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
    ] satisfies CollectionAfterChangeHook<Email>[],
  },
}

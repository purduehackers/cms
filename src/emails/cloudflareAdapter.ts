import { APIError } from 'payload'
import type { EmailAdapter, SendEmailOptions } from 'payload'

/**
 * Payload email adapter for Cloudflare Email Sending.
 *
 * Purdue Hackers already runs DNS, Email Routing, and outbound sending through
 * one Cloudflare token, so this replaces the Resend adapter with the provider we
 * were already paying attention to — one credential to rotate, one dashboard to
 * check when a blast does not arrive.
 *
 * Written against `fetch` rather than the `cloudflare` SDK for the same reason
 * the Resend adapter it replaces was: an email adapter uses exactly one endpoint,
 * and pulling a full API client into the CMS bundle to reach it is not a trade
 * worth making.
 *
 * Three behaviours differ from most providers and are handled deliberately below.
 *
 * A permanent bounce is reported inside a 2xx body rather than as an error.
 *
 * The sender must belong to a subdomain onboarded for Email Sending — ours is
 * `mail.purduehackers.com` — and a `from` anywhere else is refused with
 * `sending_disabled` rather than silently rewritten. That is a domain-level
 * answer, not an account-level one: it reads like the product is switched off.
 *
 * Because the sender therefore lives on a subdomain nobody reads mail at,
 * `defaultReplyTo` exists to point replies at an address Email Routing actually
 * delivers. Without it every reply to an event blast lands somewhere unattended.
 */

const API_BASE = 'https://api.cloudflare.com/client/v4'

interface CloudflareAdapterArgs {
  accountId: string
  apiToken: string
  defaultFromAddress: string
  defaultFromName: string
  /** Applied when a message does not set its own `replyTo`. */
  defaultReplyTo?: string
}

interface CloudflareAddress {
  address: string
  name?: string
}

/**
 * The attachment shape Payload passes through from nodemailer.
 *
 * Declared here rather than imported: the CMS does not carry `@types/nodemailer`,
 * so `SendEmailOptions['attachments']` widens to `any` and the mapping below
 * would silently lose its element type.
 */
interface MailAttachment {
  cid?: string
  content?: unknown
  contentType?: string
  filename?: string
}

interface CloudflareAttachment {
  content: string
  disposition: 'attachment' | 'inline'
  filename: string
  type: string
  content_id?: string
}

export interface CloudflareSendResult {
  delivered: string[]
  message_id: string
  permanent_bounces: string[]
  queued: string[]
}

interface CloudflareEnvelope {
  errors?: { code?: number; message?: string }[]
  result?: CloudflareSendResult
  success?: boolean
}

/** `Name <addr@example.com>` and a bare address both reach us; both mean an address. */
function toAddress(value: unknown): CloudflareAddress | null {
  if (typeof value === 'string') {
    const named = /^\s*(.*?)\s*<([^>]+)>\s*$/.exec(value)
    if (named) return { address: named[2]!.trim(), name: named[1] || undefined }
    return { address: value.trim() }
  }
  if (value && typeof value === 'object' && 'address' in value) {
    const { address, name } = value as { address: string; name?: string }
    return { address, ...(name ? { name } : {}) }
  }
  return null
}

/** Recipient lists, flattened to plain addresses — Cloudflare takes no display names here. */
function toRecipients(value: SendEmailOptions['to']): string[] {
  const values = Array.isArray(value) ? value : [value]
  return values.flatMap((entry) => {
    const address = toAddress(entry)
    return address ? [address.address] : []
  })
}

function toBody(value: unknown): string | undefined {
  if (typeof value === 'string') return value.length > 0 ? value : undefined
  if (Buffer.isBuffer(value)) return value.toString('utf-8')
  return undefined
}

/**
 * Nodemailer attachments carry raw bytes; Cloudflare wants base64.
 *
 * A `cid` means the file is referenced from the HTML body, which is Cloudflare's
 * `inline` disposition — getting that wrong shows the image as a download
 * instead of in the message.
 */
function toAttachments(attachments: MailAttachment[] | undefined): CloudflareAttachment[] {
  if (!attachments?.length) return []

  return attachments.map((attachment) => {
    const { cid, content, contentType, filename } = attachment
    if (typeof content !== 'string' && !Buffer.isBuffer(content)) {
      // Streams and `path`/`href` sources would need to be read before the
      // request is built. Nothing here sends one, and failing loudly beats
      // sending a mail with a silently missing attachment.
      throw new APIError(
        `Unsupported attachment source for "${filename ?? 'attachment'}": expected a string or Buffer`,
        400,
      )
    }

    const encoded = Buffer.isBuffer(content)
      ? content.toString('base64')
      : Buffer.from(content, 'utf-8').toString('base64')

    return {
      content: encoded,
      disposition: cid ? 'inline' : 'attachment',
      filename: filename ?? 'attachment',
      type: contentType ?? 'application/octet-stream',
      ...(cid ? { content_id: cid } : {}),
    }
  })
}

export const cloudflareAdapter =
  (args: CloudflareAdapterArgs): EmailAdapter<CloudflareSendResult> =>
  ({ payload }) => {
    const { accountId, apiToken, defaultFromAddress, defaultFromName, defaultReplyTo } = args

    return {
      name: 'cloudflare-email-sending',
      defaultFromAddress,
      defaultFromName,
      sendEmail: async (message) => {
        const text = toBody(message.text)
        const html = toBody(message.html)
        if (!text && !html) {
          throw new APIError('Refusing to send an email with neither a text nor an HTML body', 400)
        }

        const to = toRecipients(message.to)
        const cc = toRecipients(message.cc)
        const bcc = toRecipients(message.bcc)
        if (to.length === 0 && cc.length === 0 && bcc.length === 0) {
          throw new APIError('Refusing to send an email with no recipients', 400)
        }

        const replyTo = toAddress(message.replyTo ?? defaultReplyTo)
        const attachments = toAttachments(message.attachments)
        const headers =
          message.headers && !Array.isArray(message.headers) ? message.headers : undefined

        const response = await fetch(`${API_BASE}/accounts/${accountId}/email/sending/send`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: toAddress(message.from) ?? {
              address: defaultFromAddress,
              name: defaultFromName,
            },
            subject: message.subject ?? '',
            ...(to.length > 0 ? { to } : {}),
            ...(cc.length > 0 ? { cc } : {}),
            ...(bcc.length > 0 ? { bcc } : {}),
            ...(text ? { text } : {}),
            ...(html ? { html } : {}),
            ...(replyTo ? { reply_to: replyTo } : {}),
            ...(attachments.length > 0 ? { attachments } : {}),
            ...(headers ? { headers } : {}),
          }),
        })

        const envelope = (await response.json().catch(() => ({}))) as CloudflareEnvelope

        if (!response.ok || envelope.success === false || !envelope.result) {
          const detail = (envelope.errors ?? [])
            .map((error) => [error.code, error.message].filter(Boolean).join(' '))
            .filter(Boolean)
            .join('; ')
          throw new APIError(
            `Error sending email: ${response.status}${detail ? ` ${detail}` : ''}`,
            response.status,
          )
        }

        const result = envelope.result
        // A bounce arrives inside a 2xx body, so a caller that only watches for a
        // thrown error would record a dead address as a delivered one. Logged
        // rather than thrown: one bad address must not fail a blast to 200 good
        // ones, and the send genuinely did happen.
        if (result.permanent_bounces.length > 0) {
          payload.logger.warn(
            { messageId: result.message_id, bounced: result.permanent_bounces },
            'Cloudflare reported permanent bounces while sending email',
          )
        }

        return result
      },
    }
  }

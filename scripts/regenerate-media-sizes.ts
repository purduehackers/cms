/**
 * One-off, resumable backfill: generates the imageSizes (thumbnail/card/
 * gallery) for media uploaded before sizes were configured, by re-running
 * each doc's original file through Payload's upload pipeline.
 *
 * Run with real env (Turso + Blob token + PAYLOAD_SECRET) from the repo root:
 *
 *   bun run payload run scripts/regenerate-media-sizes.ts
 *
 * Safe to interrupt and re-run: docs that already have a thumbnail size are
 * skipped. Expect it to take a while (~1,700 docs, each downloaded, resized
 * by sharp, and re-uploaded to Blob).
 */
import { getPayload } from 'payload'
import config from '@payload-config'

const BATCH = 25
const DELAY_MS = 250

async function main() {
  const payload = await getPayload({ config })

  let page = 1
  let processed = 0
  let skipped = 0
  let failed = 0

  for (;;) {
    const res = await payload.find({
      collection: 'media',
      limit: BATCH,
      page,
      depth: 0,
      overrideAccess: true,
      sort: 'createdAt',
    })

    for (const doc of res.docs) {
      const hasSizes = Boolean(
        (doc as { sizes?: { thumbnail?: { url?: string | null } } }).sizes?.thumbnail?.url,
      )
      const isImage = typeof doc.mimeType === 'string' && doc.mimeType.startsWith('image/')
      if (hasSizes || !isImage || !doc.url) {
        skipped++
        continue
      }

      try {
        const fileRes = await fetch(doc.url)
        if (!fileRes.ok) throw new Error(`fetch ${doc.url} -> ${fileRes.status}`)
        const data = Buffer.from(await fileRes.arrayBuffer())

        await payload.update({
          collection: 'media',
          id: doc.id,
          data: {},
          file: {
            data,
            mimetype: doc.mimeType ?? 'application/octet-stream',
            name: doc.filename ?? `media-${doc.id}`,
            size: data.byteLength,
          },
          overwriteExistingFiles: true,
          overrideAccess: true,
        })
        processed++
        if (processed % 25 === 0) {
          console.log(`processed=${processed} skipped=${skipped} failed=${failed}`)
        }
      } catch (err) {
        failed++
        console.error(`media ${doc.id} failed:`, err)
      }

      await new Promise((r) => setTimeout(r, DELAY_MS))
    }

    if (!res.hasNextPage) break
    page++
  }

  console.log(`done. processed=${processed} skipped=${skipped} failed=${failed}`)
  process.exit(0)
}

void main()

import { describe, expect, test } from 'bun:test'
import { addDataAndFileToRequest } from 'payload'

const bytes = new Uint8Array([1, 2, 3, 4])

async function requestFor(
  storageResponse,
  { binary = false, chunked = false, length = false } = {},
) {
  const form = new FormData()
  form.set('_payload', JSON.stringify({ alt: 'Event photo', source: 'discord-drop' }))
  form.set(
    'file',
    binary
      ? new File([bytes], 'photo.jpg', { type: 'image/jpeg' })
      : JSON.stringify({
          clientUploadContext: { prefix: '' },
          collectionSlug: 'media',
          filename: 'photo.jpg',
          mimeType: 'image/jpeg',
          size: bytes.length,
        }),
  )
  const encoded = new Response(form)
  const contentType = encoded.headers.get('content-type')
  const body = new Uint8Array(await encoded.arrayBuffer())
  const headers = new Headers({ 'content-type': contentType })
  if (length) headers.set('content-length', String(body.length))
  if (chunked) headers.set('transfer-encoding', 'chunked')
  const stream = new ReadableStream({
    start(controller) {
      for (let offset = 0; offset < body.length; offset += 17)
        controller.enqueue(body.slice(offset, offset + 17))
      controller.close()
    },
  })
  return Object.assign(
    new Request('http://localhost/api/media', {
      method: 'POST',
      headers,
      body: stream,
      duplex: 'half',
    }),
    {
      payload: {
        config: {},
        logger: { error() {} },
        collections: {
          media: { config: { upload: { handlers: [async () => storageResponse()] } } },
        },
      },
    },
  )
}

describe('Payload client uploads', () => {
  for (const headers of [{}, { chunked: true }, { length: true }]) {
    test(`parses file metadata with headers ${JSON.stringify(headers)}`, async () => {
      const req = await requestFor(
        () => new Response(bytes, { headers: { 'content-type': 'image/jpeg' } }),
        headers,
      )
      await addDataAndFileToRequest(req)
      expect(req.data).toEqual({ alt: 'Event photo', source: 'discord-drop' })
      expect(req.file.name).toBe('photo.jpg')
      expect(new Uint8Array(req.file.data)).toEqual(bytes)
    })
  }

  for (const status of [204, 404, 503]) {
    test(`storage status ${status} is a retryable upstream error`, async () => {
      const req = await requestFor(() => new Response(null, { status }), { length: true })
      await expect(addDataAndFileToRequest(req)).rejects.toMatchObject({ status: 502 })
      expect(req.file).toBeUndefined()
    })
  }

  test('rejects a truncated storage response before image decoding', async () => {
    const req = await requestFor(() => new Response(bytes.slice(0, 2)), { length: true })
    await expect(addDataAndFileToRequest(req)).rejects.toMatchObject({ status: 502 })
    expect(req.file).toBeUndefined()
  })

  test('accepts a regular binary upload without Content-Length', async () => {
    const req = await requestFor(
      () => {
        throw new Error('Binary uploads must not read storage')
      },
      { binary: true },
    )
    await addDataAndFileToRequest(req)
    expect(req.data.alt).toBe('Event photo')
    expect(new Uint8Array(req.file.data)).toEqual(bytes)
  })
})

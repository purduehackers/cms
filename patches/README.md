# Payload client-upload patch

`payload@3.83.0.patch` fixes two problems in the multipart client-upload path:

- Parse a request when it has a body, including chunked requests without
  `Content-Length`. Payload otherwise skips a valid multipart body and reports
  `No files were uploaded.`
- Reject failed, empty `204`, or truncated storage responses with HTTP 502 before
  image decoding. The Vercel Blob adapter can return `204` for a failed read;
  Payload previously passed the empty buffer to image-size and returned a
  misleading, non-retryable HTTP 400. The image-drop bot already retries 502s.

Both failure modes were reproduced on Vercel while investigating image-drop
uploads on September 17, 2026. The original incident logs do not include enough
request detail to prove why those requests reached Payload without parsed files.
The patch does not address the underlying cause of intermittent Blob read errors.

Run `bun test tests/client-uploads.test.js` after installing dependencies. The
tests cover requests with and without length/transfer headers, storage errors,
partial responses, and regular binary uploads. A Vercel preview also verified
that a chunked request reaches field validation after applying the patch.

When upgrading Payload, check whether these fixes are included upstream before
removing or updating the patch and its `patchedDependencies` entry.

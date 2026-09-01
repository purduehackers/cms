declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PAYLOAD_SECRET: string
      TURSO_DATABASE_URL: string
      TURSO_AUTH_TOKEN: string
      BLOB_READ_WRITE_TOKEN: string
      CLOUDFLARE_API_TOKEN: string
      CLOUDFLARE_ACCOUNT_ID: string
      SENTRY_DSN: string
      NEXT_PUBLIC_SENTRY_DSN: string
      EMAIL_ASSETS_URL?: string
    }
  }
}

export {}

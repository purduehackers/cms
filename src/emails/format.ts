// Shared event-date formatting for outbound emails
const startFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZoneName: 'short',
  timeZone: 'America/New_York',
})

export function formatEventStart(start: Date | null): string {
  return startFormatter.format(start ?? new Date())
}

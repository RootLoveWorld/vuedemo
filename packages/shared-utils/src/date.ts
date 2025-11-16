/**
 * Date formatting utilities
 */

/**
 * Format date to ISO string
 */
export function formatDateISO(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toISOString()
}

/**
 * Format date to locale string
 */
export function formatDateLocale(date: Date | string, locale = 'en-US'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString(locale)
}

/**
 * Format date to locale time string
 */
export function formatTimeLocale(date: Date | string, locale = 'en-US'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleTimeString(locale)
}

/**
 * Format date to locale datetime string
 */
export function formatDateTimeLocale(date: Date | string, locale = 'en-US'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString(locale)
}

/**
 * Format date to relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) {
    return 'just now'
  } else if (diffMin < 60) {
    return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`
  } else if (diffHour < 24) {
    return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`
  } else if (diffDay < 30) {
    return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`
  } else {
    return formatDateLocale(d)
  }
}

/**
 * Format duration in milliseconds to human readable string
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`
  }

  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) {
    const remainingMinutes = minutes % 60
    const remainingSeconds = seconds % 60
    return `${hours}h ${remainingMinutes}m ${remainingSeconds}s`
  } else if (minutes > 0) {
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  } else {
    return `${seconds}s`
  }
}

/**
 * Check if date is valid
 */
export function isValidDate(date: any): boolean {
  if (date instanceof Date) {
    return !isNaN(date.getTime())
  }
  if (typeof date === 'string') {
    const d = new Date(date)
    return !isNaN(d.getTime())
  }
  return false
}

/**
 * Parse date string safely
 */
export function parseDate(dateString: string): Date | null {
  try {
    const date = new Date(dateString)
    return isValidDate(date) ? date : null
  } catch {
    return null
  }
}

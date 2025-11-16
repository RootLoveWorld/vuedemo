/**
 * Shared utility functions for AI Workflow Platform
 * Used by both frontend and BFF layers
 */

// Date utilities
export {
  formatDateISO,
  formatDateLocale,
  formatTimeLocale,
  formatDateTimeLocale,
  formatRelativeTime,
  formatDuration,
  isValidDate,
  parseDate,
} from './date'

// Validation utilities
export {
  isEmpty,
  isValidEmail,
  isValidUrl,
  isValidUUID,
  validatePassword,
  isValidJSON,
  isInRange,
  sanitizeString,
  validateRequiredFields,
} from './validation'

// Format utilities
export {
  formatFileSize,
  formatNumber,
  formatPercentage,
  truncate,
  capitalize,
  toTitleCase,
  camelToKebab,
  kebabToCamel,
  snakeToCamel,
  randomString,
  generateUUID,
  deepClone,
  debounce,
  throttle,
} from './format'

/**
 * Security Service
 * Provides utilities for input sanitization, validation, CSRF protection, and rate limiting
 * 
 * @module securityService
 * @example
 * // Sanitize user input
 * const safe = sanitizeInput(userInput, { maxLength: 500 });
 * 
 * @example
 * // Validate email
 * if (validateEmail(email)) {
 *   // Process valid email
 * }
 * 
 * @example
 * // Rate limiting
 * if (apiRateLimiter.isAllowed('user-123')) {
 *   // Process request
 * } else {
 *   // Rate limit exceeded
 * }
 */

/**
 * Sanitize HTML input to prevent XSS attacks
 * @param {*} input - Input to sanitize
 * @returns {string} Sanitized HTML-safe string
 */
export function sanitizeHTML(input) {
  if (typeof input !== 'string') return input;

  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
}

/**
 * Validate and sanitize user input
 */
export function sanitizeInput(input, options = {}) {
  if (typeof input !== 'string') return input;

  const {
    maxLength = 1000,
    allowedSpecialChars = [],
    trim = true,
  } = options;

  let sanitized = input;

  // Trim whitespace
  if (trim) {
    sanitized = sanitized.trim();
  }

  // Check length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  // Remove potentially dangerous characters
  sanitized = sanitized.replace(/[<>\"'`;]/g, (char) => {
    if (allowedSpecialChars.includes(char)) return char;
    return '';
  });

  return sanitized;
}

/**
 * Validate email format
 */
export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL format
 */
export function validateURL(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Create CSRF token
 */
export function generateCSRFToken() {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Store CSRF token in session storage
 */
export function storeCSRFToken() {
  const token = generateCSRFToken();
  sessionStorage.setItem('csrf_token', token);
  return token;
}

/**
 * Get CSRF token from session storage
 */
export function getCSRFToken() {
  let token = sessionStorage.getItem('csrf_token');
  if (!token) {
    token = storeCSRFToken();
  }
  return token;
}

/**
 * Rate limiting helper
 */
export class RateLimiter {
  constructor(maxRequests = 10, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = [];
  }

  isAllowed(key = 'default') {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Remove old requests outside the window
    this.requests = this.requests.filter(
      (req) => req.timestamp > windowStart && req.key === key,
    );

    if (this.requests.length < this.maxRequests) {
      this.requests.push({ key, timestamp: now });
      return true;
    }

    return false;
  }

  getRemainingTime(key = 'default') {
    const oldestRequest = this.requests.find((req) => req.key === key);
    if (!oldestRequest) return 0;
    return Math.max(0, this.windowMs - (Date.now() - oldestRequest.timestamp));
  }
}

/**
 * Validate notification data before processing
 */
export function validateNotification(notification) {
  const errors = [];

  if (!notification.title || typeof notification.title !== 'string') {
    errors.push('Invalid title');
  }

  if (!notification.message || typeof notification.message !== 'string') {
    errors.push('Invalid message');
  }

  if (notification.title.length > 200) {
    errors.push('Title too long (max 200 characters)');
  }

  if (notification.message.length > 1000) {
    errors.push('Message too long (max 1000 characters)');
  }

  if (notification.icon && !validateURL(notification.icon)) {
    errors.push('Invalid icon URL');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Export rate limiter instance
export const apiRateLimiter = new RateLimiter(20, 60000); // 20 requests per minute

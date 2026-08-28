import DOMPurify from 'dompurify'

export function sanitizeString(input) {
  if (typeof input !== 'string') return '';
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] }).trim();
}

export function sanitizeHTML(html) {
  if (typeof html !== 'string') return '';
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'ul', 'ol', 'li', 'br'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });
}

export function sanitizeFilename(filename) {
  if (typeof filename !== 'string') return '';
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '.')
    .replace(/^\.+/, '')
    .substring(0, 255);
}

export function sanitizeURL(url) {
  if (typeof url !== 'string') return null;
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export function sanitizeEmail(email) {
  if (typeof email !== 'string') return '';
  return email.toLowerCase().trim().replace(/[^\w@.+-]/g, '');
}

export function sanitizePhone(phone) {
  if (typeof phone !== 'string') return '';
  return phone.replace(/[^\d+\-() ]/g, '');
}

export function validateFileUpload(file, options = {}) {
  const {
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    maxSize = 5 * 1024 * 1024,
  } = options;

  const errors = [];

  if (!allowedTypes.includes(file.type)) {
    errors.push(`File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(', ')}`);
  }

  if (file.size > maxSize) {
    errors.push(`File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum ${(maxSize / 1024 / 1024).toFixed(2)}MB`);
  }

  const sanitizedName = sanitizeFilename(file.name);
  if (!sanitizedName) {
    errors.push('Invalid filename');
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitizedName,
  };
}

export function escapeSQLLike(input) {
  if (typeof input !== 'string') return '';
  return input.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

export function sanitizeObject(obj) {
  if (typeof obj !== 'object' || obj === null) return {};
  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      acc[key] = typeof value === 'string' ? sanitizeString(value) : value;
    }
    return acc;
  }, {});
}

export function rateLimit(fn, delay = 1000) {
  let lastCall = 0;
  let timeoutId = null;

  return function (...args) {
    const now = Date.now();
    const timeSinceLastCall = now - lastCall;

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    if (timeSinceLastCall >= delay) {
      lastCall = now;
      return fn.apply(this, args);
    } else {
      return new Promise((resolve) => {
        timeoutId = setTimeout(() => {
          lastCall = Date.now();
          resolve(fn.apply(this, args));
        }, delay - timeSinceLastCall);
      });
    }
  };
}

export function debounce(fn, delay = 300) {
  let timeoutId = null;
  return function (...args) {
    if (timeoutId) clearTimeout(timeoutId);
    return new Promise((resolve) => {
      timeoutId = setTimeout(() => {
        resolve(fn.apply(this, args));
      }, delay);
    });
  };
}

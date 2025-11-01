import validator from 'validator';

/**
 * Validate email address format
 * Security: Prevents injection attacks via email addresses
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }
  
  // Normalize and validate
  const normalized = email.trim().toLowerCase();
  
  if (!validator.isEmail(normalized)) {
    return false;
  }
  
  // Additional security: prevent extremely long emails
  if (normalized.length > 254) {
    return false;
  }
  
  return normalized;
}

/**
 * Validate inbox ID (UUID format)
 */
export function validateInboxId(id) {
  if (!id || typeof id !== 'string') {
    return false;
  }
  
  return validator.isUUID(id);
}

/**
 * Validate file size
 * Security: Prevent oversized files that could cause DoS
 */
export function validateFileSize(size, maxSizeBytes) {
  if (typeof size !== 'number' || size < 0) {
    return false;
  }
  
  if (size > maxSizeBytes) {
    return false;
  }
  
  return true;
}

/**
 * Sanitize filename to prevent directory traversal
 * Security: Critical for file upload handling
 */
export function sanitizeFilename(filename) {
  if (!filename || typeof filename !== 'string') {
    return 'unknown';
  }
  
  // Remove path separators and dangerous characters
  let sanitized = filename
    .replace(/[\/\\]/g, '_')
    .replace(/\.\./g, '_')
    .replace(/[<>:"|?*]/g, '_')
    .trim();
  
  // Limit length
  if (sanitized.length > 255) {
    const ext = sanitized.substring(sanitized.lastIndexOf('.'));
    sanitized = sanitized.substring(0, 255 - ext.length) + ext;
  }
  
  // Ensure it's not empty
  if (!sanitized) {
    sanitized = 'unknown';
  }
  
  return sanitized;
}

/**
 * Validate pagination parameters
 */
export function validatePagination(page, limit) {
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  
  if (isNaN(pageNum) || pageNum < 1) {
    return { page: 1, limit: 20 };
  }
  
  if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
    return { page: pageNum, limit: 20 };
  }
  
  return { page: pageNum, limit: limitNum };
}


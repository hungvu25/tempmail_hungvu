import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { validateInboxId, validateEmail, validatePagination } from '../utils/validation.js';

/**
 * Rate limiting middleware
 * Security: Prevents abuse and DoS attacks
 */
export const rateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Helmet security headers
 * Security: Adds various security headers
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: false, // Disable CSP for API
  crossOriginEmbedderPolicy: false,
});

/**
 * Validate inbox ID middleware
 * Security: Ensures inbox IDs are valid UUIDs
 */
export const validateInboxIdMiddleware = (req, res, next) => {
  const { inboxId } = req.params;
  
  if (!validateInboxId(inboxId)) {
    return res.status(400).json({ error: 'Invalid inbox ID format' });
  }
  
  next();
};

/**
 * Validate email parameter middleware
 */
export const validateEmailParam = (req, res, next) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'Email address is required' });
  }
  
  const validated = validateEmail(email);
  if (!validated) {
    return res.status(400).json({ error: 'Invalid email address format' });
  }
  
  req.body.email = validated;
  next();
};

/**
 * Validate pagination middleware
 */
export const validatePaginationMiddleware = (req, res, next) => {
  const { page, limit } = req.query;
  req.pagination = validatePagination(page, limit);
  next();
};


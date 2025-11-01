import {
  validateEmail,
  validateInboxId,
  validateFileSize,
  sanitizeFilename,
  validatePagination
} from '../../utils/validation.js';

describe('Validation Utils', () => {
  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      expect(validateEmail('test@example.com')).toBe('test@example.com');
      expect(validateEmail('user.name+tag@domain.co.uk')).toBe('user.name+tag@domain.co.uk');
    });
    
    it('should normalize email addresses to lowercase', () => {
      expect(validateEmail('Test@Example.COM')).toBe('test@example.com');
    });
    
    it('should reject invalid email addresses', () => {
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
      expect(validateEmail('')).toBe(false);
      expect(validateEmail(null)).toBe(false);
    });
    
    it('should reject emails longer than 254 characters', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      expect(validateEmail(longEmail)).toBe(false);
    });
  });
  
  describe('validateInboxId', () => {
    it('should validate correct UUIDs', () => {
      const validUUID = '123e4567-e89b-12d3-a456-426614174000';
      expect(validateInboxId(validUUID)).toBe(true);
    });
    
    it('should reject invalid UUIDs', () => {
      expect(validateInboxId('not-a-uuid')).toBe(false);
      expect(validateInboxId('123')).toBe(false);
      expect(validateInboxId('')).toBe(false);
      expect(validateInboxId(null)).toBe(false);
    });
  });
  
  describe('validateFileSize', () => {
    it('should validate file sizes within limit', () => {
      expect(validateFileSize(1000, 5000)).toBe(true);
      expect(validateFileSize(0, 5000)).toBe(true);
      expect(validateFileSize(5000, 5000)).toBe(true);
    });
    
    it('should reject file sizes exceeding limit', () => {
      expect(validateFileSize(6000, 5000)).toBe(false);
    });
    
    it('should reject negative file sizes', () => {
      expect(validateFileSize(-100, 5000)).toBe(false);
    });
    
    it('should reject invalid types', () => {
      expect(validateFileSize('1000', 5000)).toBe(false);
      expect(validateFileSize(null, 5000)).toBe(false);
    });
  });
  
  describe('sanitizeFilename', () => {
    it('should sanitize dangerous filenames', () => {
      expect(sanitizeFilename('../../../etc/passwd')).not.toContain('../');
      expect(sanitizeFilename('file<>:"|?*.txt')).not.toMatch(/[<>:"|?*]/);
    });
    
    it('should handle path separators', () => {
      expect(sanitizeFilename('path/to/file.txt')).not.toContain('/');
      expect(sanitizeFilename('path\\to\\file.txt')).not.toContain('\\');
    });
    
    it('should limit filename length', () => {
      const longName = 'a'.repeat(300) + '.txt';
      const sanitized = sanitizeFilename(longName);
      expect(sanitized.length).toBeLessThanOrEqual(255);
    });
    
    it('should return default for empty filenames', () => {
      expect(sanitizeFilename('')).toBe('unknown');
      expect(sanitizeFilename(null)).toBe('unknown');
    });
  });
  
  describe('validatePagination', () => {
    it('should validate correct pagination parameters', () => {
      expect(validatePagination(1, 20)).toEqual({ page: 1, limit: 20 });
      expect(validatePagination(5, 50)).toEqual({ page: 5, limit: 50 });
    });
    
    it('should default invalid page to 1', () => {
      expect(validatePagination(0, 20)).toEqual({ page: 1, limit: 20 });
      expect(validatePagination(-1, 20)).toEqual({ page: 1, limit: 20 });
      expect(validatePagination('invalid', 20)).toEqual({ page: 1, limit: 20 });
    });
    
    it('should limit maximum page size to 100', () => {
      expect(validatePagination(1, 200)).toEqual({ page: 1, limit: 20 });
      expect(validatePagination(1, 100)).toEqual({ page: 1, limit: 100 });
    });
  });
});


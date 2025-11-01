import { Inbox } from '../../models/Inbox.js';
import { initializeDatabase } from '../../config/database.js';
import db from '../../config/database.js';

describe('Inbox Model', () => {
  beforeAll(async () => {
    // Initialize test database
    await initializeDatabase();
  });
  
  afterEach(async () => {
    // Clean up test data
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM inboxes', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
  
  describe('create', () => {
    it('should create a new inbox', async () => {
      const email = 'test@example.com';
      const inbox = await Inbox.create(email);
      
      expect(inbox).toBeDefined();
      expect(inbox.email).toBe(email);
      expect(inbox.id).toBeDefined();
      expect(inbox.created_at).toBeDefined();
      expect(inbox.expires_at).toBeGreaterThan(inbox.created_at);
    });
    
    it('should assign unique IDs to inboxes', async () => {
      const inbox1 = await Inbox.create('test1@example.com');
      const inbox2 = await Inbox.create('test2@example.com');
      
      expect(inbox1.id).not.toBe(inbox2.id);
    });
  });
  
  describe('findById', () => {
    it('should find inbox by ID', async () => {
      const created = await Inbox.create('test@example.com');
      const found = await Inbox.findById(created.id);
      
      expect(found).toBeDefined();
      expect(found.id).toBe(created.id);
      expect(found.email).toBe('test@example.com');
    });
    
    it('should return null for non-existent inbox', async () => {
      const found = await Inbox.findById('non-existent-id');
      expect(found).toBeNull();
    });
  });
  
  describe('findByEmail', () => {
    it('should find inbox by email', async () => {
      const email = 'test@example.com';
      await Inbox.create(email);
      const found = await Inbox.findByEmail(email);
      
      expect(found).toBeDefined();
      expect(found.email).toBe(email);
    });
    
    it('should return null for non-existent email', async () => {
      const found = await Inbox.findByEmail('nonexistent@example.com');
      expect(found).toBeNull();
    });
  });
  
  describe('updateLastActivity', () => {
    it('should update last activity timestamp', async () => {
      const inbox = await Inbox.create('test@example.com');
      const originalActivity = inbox.last_activity;
      
      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await Inbox.updateLastActivity(inbox.id);
      const updated = await Inbox.findById(inbox.id);
      expect(updated.last_activity).toBeGreaterThan(originalActivity);
    });
  });
  
  describe('isValid', () => {
    it('should return true for valid inbox', async () => {
      const inbox = await Inbox.create('test@example.com');
      expect(Inbox.isValid(inbox)).toBe(true);
    });
    
    it('should return false for expired inbox', async () => {
      const inbox = await Inbox.create('test@example.com');
      // Manually set expires_at to past
      await new Promise((resolve, reject) => {
        db.run('UPDATE inboxes SET expires_at = ? WHERE id = ?', [Date.now() - 1000, inbox.id], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      
      const expired = await Inbox.findById(inbox.id);
      expect(Inbox.isValid(expired)).toBe(false);
    });
    
    it('should return false for null inbox', () => {
      expect(Inbox.isValid(null)).toBe(false);
    });
  });
  
  describe('deleteExpired', () => {
    it('should delete expired inboxes', async () => {
      // Create valid inbox
      await Inbox.create('valid@example.com');
      
      // Create expired inbox
      const expired = await Inbox.create('expired@example.com');
      await new Promise((resolve, reject) => {
        db.run('UPDATE inboxes SET expires_at = ? WHERE id = ?', [Date.now() - 1000, expired.id], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      
      const deleted = await Inbox.deleteExpired();
      expect(deleted).toBe(1);
      
      expect(await Inbox.findById(expired.id)).toBeNull();
      expect(await Inbox.findByEmail('valid@example.com')).toBeDefined();
    });
  });
});

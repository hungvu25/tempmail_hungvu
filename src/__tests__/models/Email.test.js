import { Email } from '../../models/Email.js';
import { Inbox } from '../../models/Inbox.js';
import { initializeDatabase } from '../../config/database.js';
import db from '../../config/database.js';

describe('Email Model', () => {
  let testInbox;
  
  beforeAll(async () => {
    await initializeDatabase();
  });
  
  beforeEach(async () => {
    testInbox = await Inbox.create('test@example.com');
  });
  
  afterEach(async () => {
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM emails', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM inboxes', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
  
  describe('create', () => {
    it('should create a new email', async () => {
      const email = await Email.create({
        inboxId: testInbox.id,
        fromAddress: 'sender@example.com',
        toAddress: 'test@example.com',
        subject: 'Test Subject',
        textContent: 'Test content',
        htmlContent: '<p>Test content</p>',
        rawMessage: 'Raw message'
      });
      
      expect(email).toBeDefined();
      expect(email.id).toBeDefined();
      expect(email.inbox_id).toBe(testInbox.id);
      expect(email.from_address).toBe('sender@example.com');
      expect(email.subject).toBe('Test Subject');
      expect(email.received_at).toBeDefined();
    });
    
    it('should update inbox last_activity', async () => {
      const originalActivity = testInbox.last_activity;
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await Email.create({
        inboxId: testInbox.id,
        fromAddress: 'sender@example.com',
        toAddress: 'test@example.com',
        subject: 'Test'
      });
      
      const updated = await Inbox.findById(testInbox.id);
      expect(updated.last_activity).toBeGreaterThan(originalActivity);
    });
  });
  
  describe('findById', () => {
    it('should find email by ID', async () => {
      const created = await Email.create({
        inboxId: testInbox.id,
        fromAddress: 'sender@example.com',
        toAddress: 'test@example.com',
        subject: 'Test'
      });
      
      const found = await Email.findById(created.id);
      expect(found).toBeDefined();
      expect(found.id).toBe(created.id);
    });
    
    it('should return null for non-existent email', async () => {
      const found = await Email.findById('non-existent-id');
      expect(found).toBeNull();
    });
  });
  
  describe('findByInboxId', () => {
    it('should find emails for an inbox', async () => {
      await Email.create({
        inboxId: testInbox.id,
        fromAddress: 'sender1@example.com',
        toAddress: 'test@example.com',
        subject: 'Email 1'
      });
      
      await Email.create({
        inboxId: testInbox.id,
        fromAddress: 'sender2@example.com',
        toAddress: 'test@example.com',
        subject: 'Email 2'
      });
      
      const result = await Email.findByInboxId(testInbox.id);
      
      expect(result.emails).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.page).toBe(1);
    });
    
    it('should paginate results correctly', async () => {
      // Create 5 emails
      for (let i = 0; i < 5; i++) {
        await Email.create({
          inboxId: testInbox.id,
          fromAddress: `sender${i}@example.com`,
          toAddress: 'test@example.com',
          subject: `Email ${i}`
        });
      }
      
      const page1 = await Email.findByInboxId(testInbox.id, { page: 1, limit: 2 });
      expect(page1.emails).toHaveLength(2);
      expect(page1.pagination.total).toBe(5);
      expect(page1.pagination.totalPages).toBe(3);
      
      const page2 = await Email.findByInboxId(testInbox.id, { page: 2, limit: 2 });
      expect(page2.emails).toHaveLength(2);
    });
    
    it('should order emails by received_at DESC', async () => {
      const email1 = await Email.create({
        inboxId: testInbox.id,
        fromAddress: 'sender1@example.com',
        toAddress: 'test@example.com',
        subject: 'First'
      });
      
      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const email2 = await Email.create({
        inboxId: testInbox.id,
        fromAddress: 'sender2@example.com',
        toAddress: 'test@example.com',
        subject: 'Second'
      });
      
      const result = await Email.findByInboxId(testInbox.id);
      expect(result.emails[0].id).toBe(email2.id); // Most recent first
      expect(result.emails[1].id).toBe(email1.id);
    });
  });
  
  describe('delete', () => {
    it('should delete an email', async () => {
      const email = await Email.create({
        inboxId: testInbox.id,
        fromAddress: 'sender@example.com',
        toAddress: 'test@example.com',
        subject: 'Test'
      });
      
      await Email.delete(email.id);
      expect(await Email.findById(email.id)).toBeNull();
    });
  });
});

/**
 * Integration tests for the inbound email pipeline
 * Tests the complete flow from SMTP reception to database storage
 */
import { simpleParser } from 'mailparser';
import { Inbox } from '../../models/Inbox.js';
import { Email } from '../../models/Email.js';
import { Attachment } from '../../models/Attachment.js';
import { initializeDatabase } from '../../config/database.js';
import db from '../../config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

describe('Email Pipeline Integration Tests', () => {
  let testInbox;
  
  beforeAll(async () => {
    await initializeDatabase();
  });
  
  beforeEach(async () => {
    testInbox = await Inbox.create('test@example.com');
  });
  
  afterEach(async () => {
    // Clean up attachments directory
    const attachmentsDir = path.join(__dirname, '../../data/attachments');
    if (fs.existsSync(attachmentsDir)) {
      const files = fs.readdirSync(attachmentsDir);
      files.forEach(file => {
        try {
          fs.unlinkSync(path.join(attachmentsDir, file));
        } catch (err) {
          // Ignore errors
        }
      });
    }
    
    await run('DELETE FROM attachments');
    await run('DELETE FROM emails');
    await run('DELETE FROM inboxes');
  });
  
  describe('Email Receiving and Parsing', () => {
    it('should parse and store a simple text email', async () => {
      const rawEmail = `From: sender@example.com
To: test@example.com
Subject: Test Email
Content-Type: text/plain

This is a test email.`;

      const parsed = await simpleParser(Buffer.from(rawEmail));
      
      const email = await Email.create({
        inboxId: testInbox.id,
        fromAddress: parsed.from?.value?.[0]?.address || 'unknown@unknown.com',
        toAddress: 'test@example.com',
        subject: parsed.subject || '',
        textContent: parsed.text || '',
        htmlContent: parsed.html || '',
        rawMessage: rawEmail
      });
      
      expect(email).toBeDefined();
      expect(email.from_address).toBe('sender@example.com');
      expect(email.to_address).toBe('test@example.com');
      expect(email.subject).toBe('Test Email');
      
      // Verify stored in database
      const stored = await Email.findById(email.id);
      expect(stored).toBeDefined();
      expect(stored.text_content).toContain('test email');
    });
    
    it('should parse and store an HTML email', async () => {
      const rawEmail = `From: sender@example.com
To: test@example.com
Subject: HTML Email
Content-Type: text/html

<html><body><h1>Hello World</h1></body></html>`;

      const parsed = await simpleParser(Buffer.from(rawEmail));
      
      const email = await Email.create({
        inboxId: testInbox.id,
        fromAddress: parsed.from?.value?.[0]?.address || 'unknown@unknown.com',
        toAddress: 'test@example.com',
        subject: parsed.subject || '',
        textContent: parsed.text || '',
        htmlContent: parsed.html || '',
        rawMessage: rawEmail
      });
      
      expect(email.html_content).toContain('Hello World');
    });
    
    it('should handle email with attachments', async () => {
      const rawEmail = `From: sender@example.com
To: test@example.com
Subject: Email with Attachment
Content-Type: multipart/mixed; boundary="boundary123"

--boundary123
Content-Type: text/plain

Email body

--boundary123
Content-Disposition: attachment; filename="test.txt"
Content-Type: text/plain

Attachment content
--boundary123--`;

      const parsed = await simpleParser(Buffer.from(rawEmail));
      
      const email = await Email.create({
        inboxId: testInbox.id,
        fromAddress: parsed.from?.value?.[0]?.address || 'unknown@unknown.com',
        toAddress: 'test@example.com',
        subject: parsed.subject || '',
        textContent: parsed.text || '',
        htmlContent: parsed.html || '',
        rawMessage: rawEmail
      });
      
      // Process attachments
      if (parsed.attachments && parsed.attachments.length > 0) {
        for (const attachment of parsed.attachments) {
          try {
            await Attachment.create({
              emailId: email.id,
              filename: attachment.filename || 'unnamed',
              contentType: attachment.contentType || 'application/octet-stream',
              buffer: attachment.content || Buffer.alloc(0)
            });
          } catch (error) {
            // Ignore attachment errors for this test
          }
        }
      }
      
      const attachments = await Attachment.findByEmailId(email.id);
      expect(attachments.length).toBeGreaterThan(0);
      
      // Verify attachment file exists and content is correct
      const attachment = attachments[0];
      expect(attachment.filename).toBeDefined();
      expect(fs.existsSync(attachment.file_path)).toBe(true);
      
      const fileContent = Attachment.readFile(attachment);
      expect(fileContent.toString()).toContain('Attachment');
    });
  });
  
  describe('Email Retrieval Flow', () => {
    it('should retrieve emails for an inbox with attachments', async () => {
      // Create email with attachment
      const email = await Email.create({
        inboxId: testInbox.id,
        fromAddress: 'sender@example.com',
        toAddress: 'test@example.com',
        subject: 'Test'
      });
      
      await Attachment.create({
        emailId: email.id,
        filename: 'test.txt',
        contentType: 'text/plain',
        buffer: Buffer.from('test content')
      });
      
      // Retrieve emails
      const result = await Email.findByInboxId(testInbox.id);
      expect(result.emails).toHaveLength(1);
      
      // Verify attachment is linked
      const attachments = await Attachment.findByEmailId(email.id);
      expect(attachments).toHaveLength(1);
      expect(attachments[0].filename).toBe('test.txt');
    });
    
    it('should handle multiple emails for same inbox', async () => {
      // Create multiple emails
      for (let i = 0; i < 3; i++) {
        await Email.create({
          inboxId: testInbox.id,
          fromAddress: `sender${i}@example.com`,
          toAddress: 'test@example.com',
          subject: `Email ${i}`
        });
      }
      
      const result = await Email.findByInboxId(testInbox.id);
      expect(result.emails).toHaveLength(3);
      expect(result.pagination.total).toBe(3);
    });
  });
  
  describe('Security and Validation', () => {
    it('should sanitize attachment filenames', async () => {
      const email = await Email.create({
        inboxId: testInbox.id,
        fromAddress: 'sender@example.com',
        toAddress: 'test@example.com',
        subject: 'Test'
      });
      
      const dangerousFilename = '../../../etc/passwd';
      const attachment = await Attachment.create({
        emailId: email.id,
        filename: dangerousFilename,
        contentType: 'text/plain',
        buffer: Buffer.from('content')
      });
      
      expect(attachment.filename).not.toContain('../');
      expect(attachment.filename).not.toContain('/');
    });
    
    it('should reject oversized attachments', async () => {
      const email = await Email.create({
        inboxId: testInbox.id,
        fromAddress: 'sender@example.com',
        toAddress: 'test@example.com',
        subject: 'Test'
      });
      
      // Create buffer larger than 5MB (default limit)
      const largeBuffer = Buffer.alloc(6 * 1024 * 1024);
      
      await expect(
        Attachment.create({
          emailId: email.id,
          filename: 'large.txt',
          contentType: 'text/plain',
          buffer: largeBuffer
        })
      ).rejects.toThrow();
    });
    
    it('should prevent directory traversal in file reads', () => {
      const fakeAttachment = {
        id: 'fake-id',
        file_path: '../../etc/passwd'
      };
      
      expect(() => {
        Attachment.readFile(fakeAttachment);
      }).toThrow();
    });
  });
  
  describe('Cleanup and Expiration', () => {
    it('should handle expired inbox correctly', async () => {
      const inbox = await Inbox.create('expired@example.com');
      
      // Manually expire it
      await run('UPDATE inboxes SET expires_at = ? WHERE id = ?', [Date.now() - 1000, inbox.id]);
      
      const expired = await Inbox.findById(inbox.id);
      expect(Inbox.isValid(expired)).toBe(false);
      
      // Should not accept emails for expired inbox (but email creation doesn't check this)
      const email = await Email.create({
        inboxId: inbox.id,
        fromAddress: 'sender@example.com',
        toAddress: 'expired@example.com',
        subject: 'Test'
      });
      
      // Email is created but inbox is expired, so it should be cleaned up
      const deleted = await Inbox.deleteExpired();
      expect(deleted).toBeGreaterThan(0);
    });
  });
});

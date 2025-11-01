import { Inbox } from '../models/Inbox.js';
import { Email } from '../models/Email.js';
import { Attachment } from '../models/Attachment.js';
import db from '../config/database.js';

// Helper function
const all = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
};

/**
 * Cleanup Service
 * Removes expired inboxes and their associated data
 * Security: Ensures proper cleanup of sensitive data
 */
class CleanupService {
  constructor() {
    this.intervalId = null;
  }
  
  start(intervalMinutes = 60) {
    const intervalMs = intervalMinutes * 60 * 1000;
    
    // Run cleanup immediately
    this.run();
    
    // Schedule periodic cleanup
    this.intervalId = setInterval(() => {
      this.run();
    }, intervalMs);
    
    console.log(`Cleanup service started (interval: ${intervalMinutes} minutes)`);
  }
  
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Cleanup service stopped');
    }
  }
  
  async run() {
    try {
      console.log('Running cleanup...');
      
      // Get expired inboxes
      const expiredInboxes = await all('SELECT id FROM inboxes WHERE expires_at < ?', [Date.now()]);
      
      let deletedInboxes = 0;
      let deletedEmails = 0;
      let deletedAttachments = 0;
      
      for (const inbox of expiredInboxes) {
        // Get emails for this inbox
        const emails = await all('SELECT id FROM emails WHERE inbox_id = ?', [inbox.id]);
        
        // Delete attachments
        for (const email of emails) {
          const attachments = await Attachment.findByEmailId(email.id);
          for (const attachment of attachments) {
            await Attachment.delete(attachment.id);
            deletedAttachments++;
          }
        }
        
        // Delete emails (cascade should handle this, but we do it explicitly)
        await Email.deleteByInboxId(inbox.id);
        deletedEmails += emails.length;
        
        // Delete inbox
        await Inbox.delete(inbox.id);
        deletedInboxes++;
      }
      
      // Also clean up orphaned attachments (safety measure)
      const orphanedAttachments = await all(`
        SELECT a.* FROM attachments a
        LEFT JOIN emails e ON a.email_id = e.id
        WHERE e.id IS NULL
      `);
      
      for (const attachment of orphanedAttachments) {
        await Attachment.delete(attachment.id);
        deletedAttachments++;
      }
      
      console.log(`Cleanup completed: ${deletedInboxes} inboxes, ${deletedEmails} emails, ${deletedAttachments} attachments`);
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
}

export default new CleanupService();

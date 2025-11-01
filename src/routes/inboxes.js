import express from 'express';
import { Inbox } from '../models/Inbox.js';
import { Email } from '../models/Email.js';
import { Attachment } from '../models/Attachment.js';
import { validateInboxIdMiddleware, validateEmailParam, validatePaginationMiddleware } from '../middleware/security.js';

const router = express.Router();

/**
 * POST /api/inboxes
 * Create a new inbox
 * Security: Email validation is done via middleware
 */
router.post('/', validateEmailParam, async (req, res) => {
  try {
    const { email } = req.body;
    
    // Check if inbox already exists
    const existing = await Inbox.findByEmail(email);
    if (existing) {
      // Return existing inbox if still valid
      if (Inbox.isValid(existing)) {
        return res.json({
          id: existing.id,
          email: existing.email,
          createdAt: existing.created_at,
          expiresAt: existing.expires_at
        });
      } else {
        // Delete expired inbox
        await Inbox.delete(existing.id);
      }
    }
    
    // Create new inbox
    const inbox = await Inbox.create(email);
    
    res.status(201).json({
      id: inbox.id,
      email: inbox.email,
      createdAt: inbox.created_at,
      expiresAt: inbox.expires_at
    });
  } catch (error) {
    console.error('Error creating inbox:', error);
    res.status(500).json({ error: 'Failed to create inbox' });
  }
});

/**
 * GET /api/inboxes/:inboxId
 * Get inbox details
 * Security: Inbox ID validation via middleware
 */
router.get('/:inboxId', validateInboxIdMiddleware, async (req, res) => {
  try {
    const { inboxId } = req.params;
    const inbox = await Inbox.findById(inboxId);
    
    if (!inbox) {
      return res.status(404).json({ error: 'Inbox not found' });
    }
    
    if (!Inbox.isValid(inbox)) {
      return res.status(410).json({ error: 'Inbox has expired' });
    }
    
    res.json({
      id: inbox.id,
      email: inbox.email,
      createdAt: inbox.created_at,
      expiresAt: inbox.expires_at,
      lastActivity: inbox.last_activity
    });
  } catch (error) {
    console.error('Error getting inbox:', error);
    res.status(500).json({ error: 'Failed to get inbox' });
  }
});

/**
 * GET /api/inboxes/:inboxId/emails
 * Get emails for an inbox
 * Security: Inbox ID validation, pagination limits
 */
router.get('/:inboxId/emails', validateInboxIdMiddleware, validatePaginationMiddleware, async (req, res) => {
  try {
    const { inboxId } = req.params;
    const { page, limit } = req.pagination;
    
    // Verify inbox exists and is valid
    const inbox = await Inbox.findById(inboxId);
    if (!inbox) {
      return res.status(404).json({ error: 'Inbox not found' });
    }
    
    if (!Inbox.isValid(inbox)) {
      return res.status(410).json({ error: 'Inbox has expired' });
    }
    
    // Update last activity
    await Inbox.updateLastActivity(inboxId);
    
    // Get emails
    const result = await Email.findByInboxId(inboxId, { page, limit });
    
    // Format response (exclude raw_message for list view)
    const emails = result.emails.map(email => ({
      id: email.id,
      from: email.from_address,
      to: email.to_address,
      subject: email.subject,
      textContent: email.text_content,
      htmlContent: email.html_content,
      receivedAt: email.received_at,
      hasAttachments: false // Will be set below
    }));
    
    // Check for attachments
    for (const email of emails) {
      const attachments = await Attachment.findByEmailId(email.id);
      email.hasAttachments = attachments.length > 0;
      email.attachmentCount = attachments.length;
    }
    
    res.json({
      emails,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error getting emails:', error);
    res.status(500).json({ error: 'Failed to get emails' });
  }
});

/**
 * GET /api/inboxes/:inboxId/emails/:emailId
 * Get a specific email
 * Security: Inbox and email ID validation
 */
router.get('/:inboxId/emails/:emailId', validateInboxIdMiddleware, async (req, res) => {
  try {
    const { inboxId, emailId } = req.params;
    
    // Verify inbox exists and is valid
    const inbox = await Inbox.findById(inboxId);
    if (!inbox) {
      return res.status(404).json({ error: 'Inbox not found' });
    }
    
    if (!Inbox.isValid(inbox)) {
      return res.status(410).json({ error: 'Inbox has expired' });
    }
    
    // Get email
    const email = await Email.findById(emailId);
    if (!email) {
      return res.status(404).json({ error: 'Email not found' });
    }
    
    // Verify email belongs to inbox
    if (email.inbox_id !== inboxId) {
      return res.status(403).json({ error: 'Email does not belong to this inbox' });
    }
    
    // Update inbox last activity
    await Inbox.updateLastActivity(inboxId);
    
    // Get attachments
    const attachments = await Attachment.findByEmailId(emailId);
    
    res.json({
      id: email.id,
      from: email.from_address,
      to: email.to_address,
      subject: email.subject,
      textContent: email.text_content,
      htmlContent: email.html_content,
      receivedAt: email.received_at,
      attachments: attachments.map(att => ({
        id: att.id,
        filename: att.filename,
        contentType: att.content_type,
        size: att.size
      }))
    });
  } catch (error) {
    console.error('Error getting email:', error);
    res.status(500).json({ error: 'Failed to get email' });
  }
});

/**
 * GET /api/inboxes/:inboxId/emails/:emailId/attachments/:attachmentId
 * Download an attachment
 * Security: Path validation, file size limits enforced
 */
router.get('/:inboxId/emails/:emailId/attachments/:attachmentId', validateInboxIdMiddleware, async (req, res) => {
  try {
    const { inboxId, emailId, attachmentId } = req.params;
    
    // Verify inbox exists and is valid
    const inbox = await Inbox.findById(inboxId);
    if (!inbox) {
      return res.status(404).json({ error: 'Inbox not found' });
    }
    
    if (!Inbox.isValid(inbox)) {
      return res.status(410).json({ error: 'Inbox has expired' });
    }
    
    // Verify email belongs to inbox
    const email = await Email.findById(emailId);
    if (!email || email.inbox_id !== inboxId) {
      return res.status(404).json({ error: 'Email not found' });
    }
    
    // Get attachment
    const attachment = await Attachment.findById(attachmentId);
    if (!attachment || attachment.email_id !== emailId) {
      return res.status(404).json({ error: 'Attachment not found' });
    }
    
    // Update inbox last activity
    await Inbox.updateLastActivity(inboxId);
    
    // Security: Read file with path validation
    try {
      const fileBuffer = Attachment.readFile(attachment);
      
      res.setHeader('Content-Type', attachment.content_type);
      res.setHeader('Content-Disposition', `attachment; filename="${attachment.filename}"`);
      res.setHeader('Content-Length', attachment.size);
      
      res.send(fileBuffer);
    } catch (error) {
      console.error('Error reading attachment file:', error);
      res.status(500).json({ error: 'Failed to read attachment file' });
    }
  } catch (error) {
    console.error('Error getting attachment:', error);
    res.status(500).json({ error: 'Failed to get attachment' });
  }
});

export default router;

import { SMTPServer } from 'smtp-server';
import { simpleParser } from 'mailparser';
import { Inbox } from '../models/Inbox.js';
import { Email } from '../models/Email.js';
import { Attachment } from '../models/Attachment.js';
import { validateEmail } from '../utils/validation.js';

const MAX_EMAIL_SIZE = parseInt(process.env.MAX_EMAIL_SIZE_MB || '10', 10) * 1024 * 1024;

/**
 * Email Receiver Service
 * Security: Validates email size, sanitizes inputs, handles attachments safely
 */
class EmailReceiver {
  constructor() {
    this.server = null;
  }
  
  async start(port = 2525) {
    this.server = new SMTPServer({
      size: MAX_EMAIL_SIZE,
      authOptional: true,
      
      onConnect(session, callback) {
        // Allow all connections (for public temp mail service)
        callback();
      },
      
      onMailFrom(address, session, callback) {
        // Security: Validate sender address format
        const validated = validateEmail(address.address);
        if (!validated) {
          return callback(new Error('Invalid sender address'));
        }
        callback();
      },
      
      onRcptTo(address, session, callback) {
        // Security: Validate recipient address format
        const validated = validateEmail(address.address);
        if (!validated) {
          return callback(new Error('Invalid recipient address'));
        }
        callback();
      },
      
      onData(stream, session, callback) {
        let rawMessage = '';
        let totalSize = 0;
        
        // Security: Prevent oversized emails
        stream.on('data', (chunk) => {
          totalSize += chunk.length;
          if (totalSize > MAX_EMAIL_SIZE) {
            stream.destroy();
            return callback(new Error('Email size exceeds maximum'));
          }
          rawMessage += chunk.toString('binary');
        });
        
        stream.on('end', async () => {
          try {
            await this.processEmail(rawMessage, session);
            callback();
          } catch (error) {
            console.error('Error processing email:', error);
            callback(error);
          }
        });
        
        stream.on('error', (error) => {
          console.error('Stream error:', error);
          callback(error);
        });
      }
    });
    
    this.server.on('error', (error) => {
      console.error('SMTP server error:', error);
    });
    
    return new Promise((resolve, reject) => {
      this.server.listen(port, (error) => {
        if (error) {
          reject(error);
        } else {
          console.log(`SMTP server listening on port ${port}`);
          resolve();
        }
      });
    });
  }
  
  async processEmail(rawMessage, session) {
    try {
      // Parse email
      const parsed = await simpleParser(Buffer.from(rawMessage, 'binary'));
      
      // Extract recipient (to address)
      const toAddress = parsed.to?.value?.[0]?.address;
      if (!toAddress) {
        throw new Error('No recipient address found');
      }
      
      // Security: Validate and normalize recipient
      const normalizedTo = validateEmail(toAddress);
      if (!normalizedTo) {
        throw new Error('Invalid recipient address format');
      }
      
      // Find or create inbox
      let inbox = await Inbox.findByEmail(normalizedTo);
      if (!inbox) {
        // Inbox doesn't exist, silently ignore (or log for debugging)
        console.log(`No inbox found for ${normalizedTo}`);
        return;
      }
      
      // Check if inbox is still valid
      if (!Inbox.isValid(inbox)) {
        console.log(`Inbox ${inbox.id} has expired`);
        return;
      }
      
      // Extract sender
      const fromAddress = parsed.from?.value?.[0]?.address || 'unknown@unknown.com';
      const normalizedFrom = validateEmail(fromAddress) || fromAddress;
      
      // Create email record
      const email = await Email.create({
        inboxId: inbox.id,
        fromAddress: normalizedFrom,
        toAddress: normalizedTo,
        subject: parsed.subject || '',
        textContent: parsed.text || '',
        htmlContent: parsed.html || '',
        rawMessage: rawMessage
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
            console.error(`Error saving attachment: ${error.message}`);
            // Continue processing other attachments
          }
        }
      }
      
      console.log(`Email received: ${email.id} for inbox ${inbox.id}`);
    } catch (error) {
      console.error('Error processing email:', error);
      throw error;
    }
  }
  
  stop() {
    if (this.server) {
      return new Promise((resolve) => {
        this.server.close(() => {
          console.log('SMTP server stopped');
          resolve();
        });
      });
    }
  }
}

export default new EmailReceiver();


import db from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { sanitizeFilename } from '../utils/validation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ATTACHMENTS_DIR = path.join(__dirname, '../../data/attachments');

// Ensure attachments directory exists
if (!fs.existsSync(ATTACHMENTS_DIR)) {
  fs.mkdirSync(ATTACHMENTS_DIR, { recursive: true });
}

// Helper functions
const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ changes: this.changes, lastID: this.lastID });
    });
  });
};

const get = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row || null);
    });
  });
};

const all = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
};

export class Attachment {
  /**
   * Save attachment to disk and database
   * Security: Validates file size and sanitizes filename
   */
  static async create({ emailId, filename, contentType, buffer }) {
    // Security: Validate and sanitize filename
    const sanitizedFilename = sanitizeFilename(filename);
    const id = uuidv4();
    const fileExt = path.extname(sanitizedFilename);
    const filePath = path.join(ATTACHMENTS_DIR, `${id}${fileExt}`);
    
    // Security: Validate file size
    const MAX_ATTACHMENT_SIZE = parseInt(process.env.MAX_ATTACHMENT_SIZE_MB || '5', 10) * 1024 * 1024;
    if (buffer.length > MAX_ATTACHMENT_SIZE) {
      throw new Error(`Attachment size exceeds maximum of ${MAX_ATTACHMENT_SIZE / 1024 / 1024}MB`);
    }
    
    // Security: Write file with proper error handling
    try {
      fs.writeFileSync(filePath, buffer);
    } catch (error) {
      throw new Error(`Failed to save attachment: ${error.message}`);
    }
    
    const createdAt = Date.now();
    
    await run(
      'INSERT INTO attachments (id, email_id, filename, content_type, size, file_path, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, emailId, sanitizedFilename, contentType, buffer.length, filePath, createdAt]
    );
    
    return await this.findById(id);
  }
  
  static async findById(id) {
    return await get('SELECT * FROM attachments WHERE id = ?', [id]);
  }
  
  static async findByEmailId(emailId) {
    return await all('SELECT * FROM attachments WHERE email_id = ? ORDER BY created_at', [emailId]);
  }
  
  /**
   * Read attachment file from disk
   * Security: Validate file path to prevent directory traversal
   */
  static readFile(attachment) {
    if (!attachment || !attachment.file_path) {
      throw new Error('Invalid attachment');
    }
    
    // Security: Ensure file path is within attachments directory
    const resolvedPath = path.resolve(attachment.file_path);
    const resolvedDir = path.resolve(ATTACHMENTS_DIR);
    
    if (!resolvedPath.startsWith(resolvedDir)) {
      throw new Error('Invalid file path');
    }
    
    if (!fs.existsSync(resolvedPath)) {
      throw new Error('Attachment file not found');
    }
    
    return fs.readFileSync(resolvedPath);
  }
  
  static async delete(id) {
    const attachment = await this.findById(id);
    if (attachment && attachment.file_path) {
      try {
        // Security: Validate path before deletion
        const resolvedPath = path.resolve(attachment.file_path);
        const resolvedDir = path.resolve(ATTACHMENTS_DIR);
        
        if (resolvedPath.startsWith(resolvedDir) && fs.existsSync(resolvedPath)) {
          fs.unlinkSync(resolvedPath);
        }
      } catch (error) {
        console.error(`Error deleting attachment file: ${error.message}`);
      }
    }
    
    await run('DELETE FROM attachments WHERE id = ?', [id]);
  }
  
  static async deleteByEmailId(emailId) {
    const attachments = await this.findByEmailId(emailId);
    for (const attachment of attachments) {
      await this.delete(attachment.id);
    }
  }
}

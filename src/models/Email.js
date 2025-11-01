import db from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

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

export class Email {
  static async create({ inboxId, fromAddress, toAddress, subject, textContent, htmlContent, rawMessage }) {
    const id = uuidv4();
    const receivedAt = Date.now();
    
    await run(
      `INSERT INTO emails (id, inbox_id, from_address, to_address, subject, text_content, html_content, received_at, raw_message)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, inboxId, fromAddress, toAddress, subject || '', textContent || '', htmlContent || '', receivedAt, rawMessage || '']
    );
    
    // Update inbox last activity
    await run('UPDATE inboxes SET last_activity = ? WHERE id = ?', [receivedAt, inboxId]);
    
    return await this.findById(id);
  }
  
  static async findById(id) {
    return await get('SELECT * FROM emails WHERE id = ?', [id]);
  }
  
  static async findByInboxId(inboxId, { page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;
    
    const emails = await all(
      'SELECT * FROM emails WHERE inbox_id = ? ORDER BY received_at DESC LIMIT ? OFFSET ?',
      [inboxId, limit, offset]
    );
    
    const totalResult = await get('SELECT COUNT(*) as count FROM emails WHERE inbox_id = ?', [inboxId]);
    const total = totalResult ? totalResult.count : 0;
    
    return {
      emails,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
  
  static async delete(id) {
    await run('DELETE FROM emails WHERE id = ?', [id]);
  }
  
  static async deleteByInboxId(inboxId) {
    await run('DELETE FROM emails WHERE inbox_id = ?', [inboxId]);
  }
}

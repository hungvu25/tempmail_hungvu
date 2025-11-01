import db from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

const MAX_INBOX_LIFETIME_HOURS = parseInt(process.env.MAX_INBOX_LIFETIME_HOURS || '24', 10);
const INBOX_LIFETIME_MS = MAX_INBOX_LIFETIME_HOURS * 60 * 60 * 1000;

// Helper to promisify sqlite3 operations
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

export class Inbox {
  static async create(email) {
    const now = Date.now();
    const expiresAt = now + INBOX_LIFETIME_MS;
    const id = uuidv4();
    
    await run(
      'INSERT INTO inboxes (id, email, created_at, expires_at, last_activity) VALUES (?, ?, ?, ?, ?)',
      [id, email, now, expiresAt, now]
    );
    
    return await this.findById(id);
  }
  
  static async findById(id) {
    return await get('SELECT * FROM inboxes WHERE id = ?', [id]);
  }
  
  static async findByEmail(email) {
    return await get('SELECT * FROM inboxes WHERE email = ?', [email]);
  }
  
  static async updateLastActivity(id) {
    await run('UPDATE inboxes SET last_activity = ? WHERE id = ?', [Date.now(), id]);
  }
  
  static async delete(id) {
    await run('DELETE FROM inboxes WHERE id = ?', [id]);
  }
  
  static async deleteExpired() {
    const now = Date.now();
    const result = await run('DELETE FROM inboxes WHERE expires_at < ?', [now]);
    return result.changes;
  }
  
  static isValid(inbox) {
    if (!inbox) return false;
    return inbox.expires_at > Date.now();
  }
}

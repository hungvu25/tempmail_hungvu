import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/tempmail.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(DB_PATH);

// Promisify database methods
db.run = promisify(db.run.bind(db));
db.get = promisify(db.get.bind(db));
db.all = promisify(db.all.bind(db));
db.exec = promisify(db.exec.bind(db));

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON').catch(err => console.error('Error enabling foreign keys:', err));

// Initialize schema
export function initializeDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Inboxes table
      db.run(`
        CREATE TABLE IF NOT EXISTS inboxes (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          created_at INTEGER NOT NULL,
          expires_at INTEGER NOT NULL,
          last_activity INTEGER NOT NULL
        )
      `, (err) => {
        if (err) return reject(err);
      });

      // Emails table
      db.run(`
        CREATE TABLE IF NOT EXISTS emails (
          id TEXT PRIMARY KEY,
          inbox_id TEXT NOT NULL,
          from_address TEXT NOT NULL,
          to_address TEXT NOT NULL,
          subject TEXT,
          text_content TEXT,
          html_content TEXT,
          received_at INTEGER NOT NULL,
          raw_message TEXT,
          FOREIGN KEY (inbox_id) REFERENCES inboxes(id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) return reject(err);
      });

      // Attachments table
      db.run(`
        CREATE TABLE IF NOT EXISTS attachments (
          id TEXT PRIMARY KEY,
          email_id TEXT NOT NULL,
          filename TEXT NOT NULL,
          content_type TEXT NOT NULL,
          size INTEGER NOT NULL,
          file_path TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          FOREIGN KEY (email_id) REFERENCES emails(id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) return reject(err);
      });

      // Indexes for performance
      db.run(`
        CREATE INDEX IF NOT EXISTS idx_emails_inbox_id ON emails(inbox_id);
        CREATE INDEX IF NOT EXISTS idx_emails_received_at ON emails(received_at);
        CREATE INDEX IF NOT EXISTS idx_inboxes_email ON inboxes(email);
        CREATE INDEX IF NOT EXISTS idx_inboxes_expires_at ON inboxes(expires_at);
        CREATE INDEX IF NOT EXISTS idx_attachments_email_id ON attachments(email_id);
      `, (err) => {
        if (err) return reject(err);
        console.log('Database initialized successfully');
        resolve();
      });
    });
  });
}

export default db;


import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeDatabase } from './config/database.js';
import emailReceiver from './services/emailReceiver.js';
import cleanupService from './services/cleanup.js';
import inboxRoutes from './routes/inboxes.js';
import { rateLimiter, securityHeaders } from './middleware/security.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const SMTP_PORT = process.env.SMTP_PORT || 2525;

// Security middleware
app.use(securityHeaders);
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(rateLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/inboxes', inboxRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Initialize and start server
async function start() {
  try {
    // Initialize database
    await initializeDatabase();
    
    // Start SMTP server
    await emailReceiver.start(SMTP_PORT);
    
    // Start cleanup service
    const cleanupInterval = parseInt(process.env.CLEANUP_INTERVAL_MINUTES || '60', 10);
    cleanupService.start(cleanupInterval);
    
    // Start HTTP server
    app.listen(PORT, () => {
      console.log(`HTTP server listening on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
    
    // Graceful shutdown
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

async function shutdown() {
  console.log('Shutting down gracefully...');
  
  try {
    await emailReceiver.stop();
    cleanupService.stop();
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
}

start();


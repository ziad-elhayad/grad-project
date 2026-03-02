const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const schedulerService = require('./services/schedulerService');

// Load environment variables
dotenv.config({ path: './config.env' });

const app = express();

// Middleware
// Middleware - Allow all origins for CORS to fix production connectivity issues
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  credentials: true
}));
app.use(express.json());

// Database connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/hr', require('./routes/hr'));
app.use('/api/manufacturing', require('./routes/manufacturing'));
app.use('/api/scm', require('./routes/scm'));
app.use('/api/crm', require('./routes/crm'));
app.use('/api/sales', require('./routes/sales'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/purchasing', require('./routes/purchasing'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/finance', require('./routes/finance'));
app.use('/api/forecast', require('./routes/forecast'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'ERP System API is running' });
});

// Vercel Cron Trigger for Auto Purchase Orders
app.get('/api/cron/auto-purchase-orders', async (req, res) => {
  try {
    // Basic protection (optional: check for a secret header from Vercel)
    console.log('Vercel Cron: Triggering Auto Purchase Orders');
    await schedulerService.generateAutoPurchaseOrders();
    res.json({ success: true, message: 'Cron job executed successfully' });
  } catch (error) {
    console.error('Cron job error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Export for Vercel & Standard Start for Railway
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  try {
    // Only start scheduler locally or if specifically asked
    if (process.env.NODE_ENV !== 'production') {
      schedulerService.start();
    }
  } catch (error) {
    console.error('Error starting scheduler service:', error);
  }
});

module.exports = app;

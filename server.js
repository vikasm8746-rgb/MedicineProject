const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const { testConnection } = require('./config/database');
const { connectMongoDB, getMongoStatus } = require('./config/mongodb');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

// Route Imports
const authRoutes = require('./routes/authRoutes');
const medicineRoutes = require('./routes/medicineRoutes');
const pharmacyRoutes = require('./routes/pharmacyRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const reservationRoutes = require('./routes/reservationRoutes');
const favoriteRoutes = require('./routes/favoriteRoutes');
const searchHistoryRoutes = require('./routes/searchHistoryRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for mobile app & local dev
app.use(cors());

// Parse JSON and URL-encoded request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files (Interactive MediFind Mobile Web Simulator)
app.use(express.static(path.join(__dirname, 'public')));

// HTTP Request Logger
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// API Sitemaps
app.get('/api', (req, res) => {
  res.json({
    name: 'MediFind API',
    tagline: 'Medicine Availability Finder RESTful API',
    version: '1.0.0',
    status: 'online',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: 'GET /api/health',
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        profile: 'GET /api/auth/profile',
        updateProfile: 'PUT /api/auth/profile',
      },
      medicines: {
        list: 'GET /api/medicines',
        search: 'GET /api/medicines/search?query=:name',
        categories: 'GET /api/medicines/categories',
        popular: 'GET /api/medicines/popular',
        details: 'GET /api/medicines/:id',
      },
      pharmacies: {
        list: 'GET /api/pharmacies',
        details: 'GET /api/pharmacies/:id',
        medicines: 'GET /api/pharmacies/:id/medicines',
      },
      inventory: {
        pharmacyInventory: 'GET /api/inventory/pharmacy/:pharmacyId',
        myInventory: 'GET /api/inventory/my',
        stats: 'GET /api/inventory/stats',
        add: 'POST /api/inventory',
        update: 'PUT /api/inventory/:id',
        delete: 'DELETE /api/inventory/:id',
      },
      reservations: {
        create: 'POST /api/reservations',
        myReservations: 'GET /api/reservations/my',
        pharmacyReservations: 'GET /api/reservations/pharmacy',
        updateStatus: 'PUT /api/reservations/:id/status',
      },
      favorites: {
        list: 'GET /api/favorites',
        toggle: 'POST /api/favorites',
        delete: 'DELETE /api/favorites/:id',
      },
      searchHistory: {
        list: 'GET /api/search-history',
        add: 'POST /api/search-history',
        deleteItem: 'DELETE /api/search-history/:id',
        clearAll: 'DELETE /api/search-history',
      },
    },
  });
});

// Route to download the Android APK directly onto phone from mobile browser
app.get('/download-apk', (req, res) => {
  const apkPath = path.join(__dirname, '../frontend/build/app/outputs/flutter-apk/app-debug.apk');
  const fs = require('fs');
  if (fs.existsSync(apkPath)) {
    res.download(apkPath, 'MediFind-App.apk');
  } else {
    res.status(404).send(`
      <!DOCTYPE html>
      <html>
      <head><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Building APK</title></head>
      <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; text-align:center; padding:50px 20px; background:#f8fafc; color:#1e293b;">
        <div style="font-size:48px; margin-bottom:16px;">⏳</div>
        <h2 style="margin:0 0 8px;">APK is currently compiling...</h2>
        <p style="color:#64748b; font-size:15px;">Please wait a moment and refresh this page to download <strong>MediFind-App.apk</strong>.</p>
        <button onclick="window.location.reload()" style="background:#2563eb; color:white; border:none; padding:12px 24px; border-radius:10px; font-weight:700; cursor:pointer; margin-top:16px;">Refresh Page</button>
      </body>
      </html>
    `);
  }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  const dbConnected = await testConnection();
  const mongoConnected = getMongoStatus();
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database: {
      mysql_or_mock: dbConnected ? 'connected' : 'mock_demo_active',
      mongodb: mongoConnected ? 'connected' : 'ready (check MONGODB_URI in .env)',
    },
    environment: process.env.NODE_ENV || 'development',
  });
});

// API Routes Mounting
app.use('/api/auth', authRoutes);
app.use('/api/medicines', medicineRoutes);
app.use('/api/pharmacies', pharmacyRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/search-history', searchHistoryRoutes);

// Fallback 404 handler
app.use(notFound);

// Centralized error handler
app.use(errorHandler);

// Start server on all network interfaces (0.0.0.0) so phone on local Wi-Fi can connect
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', async () => {
    console.log(`====================================================`);
    console.log(` MediFind Backend Server running on port ${PORT}`);
    console.log(` PC Web App:     http://localhost:${PORT}`);
    console.log(` Phone Web App:  http://10.13.207.68:${PORT}`);
    console.log(` Download APK:   http://10.13.207.68:${PORT}/download-apk`);
    console.log(` Base API:       http://localhost:${PORT}/api`);
    console.log(` Health Status:  http://localhost:${PORT}/api/health`);
    console.log(`====================================================`);
    await testConnection();
    await connectMongoDB();
  });
}

module.exports = app;

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const pinoHttp = require('pino-http');
const pino = require('pino');

const db = require('./db');
const { register, metricsMiddleware, updateLowStockGauge } = require('./metrics');

// Route imports
const authRoutes = require('./routes/auth');
const medicinesRoutes = require('./routes/medicines');
const prescriptionsRoutes = require('./routes/prescriptions');
const dashboardRoutes = require('./routes/dashboard');

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const app = express();
const PORT = parseInt(process.env.PORT, 10) || 3001;

// ── Core middleware ──────────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(pinoHttp({ logger }));
app.use(metricsMiddleware);

// ── Health & readiness checks ────────────────────────────────
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/ready', async (_req, res) => {
  try {
    await db.raw('SELECT 1');
    res.status(200).json({ status: 'ready', database: 'connected' });
  } catch (err) {
    logger.error({ err: err.message }, 'Readiness check failed — database unreachable');
    res.status(503).json({ status: 'not ready', database: 'disconnected', error: err.message });
  }
});

// ── Prometheus metrics endpoint ──────────────────────────────
app.get('/metrics', async (_req, res) => {
  try {
    // Refresh the low-stock gauge before scraping
    await updateLowStockGauge(db);
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    logger.error({ err: err.message }, 'Failed to generate metrics');
    res.status(500).json({ error: 'Failed to generate metrics' });
  }
});

// ── API routes ───────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/medicines', medicinesRoutes);
app.use('/api/prescriptions', prescriptionsRoutes);
app.use('/api/dashboard', dashboardRoutes);

// ── 404 handler ──────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Global error handler ────────────────────────────────────
app.use((err, _req, res, _next) => {
  logger.error({ err: err.message, stack: err.stack }, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start server (only when not imported for tests) ─────────
if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    logger.info({ port: PORT }, `Pharmacy backend listening on port ${PORT}`);
  });
}

module.exports = app;

const promClient = require('prom-client');
const pino = require('pino');

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

// Create a custom registry
const register = new promClient.Registry();

// Add default metrics (CPU, memory, event loop, etc.)
promClient.collectDefaultMetrics({ register });

// Counter: total HTTP requests
const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
});

// Histogram: HTTP request duration in seconds
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

// Gauge: count of medicines below reorder threshold
const lowStockMedicinesCount = new promClient.Gauge({
  name: 'low_stock_medicines_count',
  help: 'Number of medicines with quantity at or below reorder threshold',
  registers: [register],
});

/**
 * Express middleware to track request metrics.
 */
function metricsMiddleware(req, res, next) {
  // Skip metrics endpoint itself to avoid recursion
  if (req.path === '/metrics') {
    return next();
  }

  const end = httpRequestDuration.startTimer();

  res.on('finish', () => {
    const route = req.route ? req.route.path : req.path;
    const labels = {
      method: req.method,
      route: route,
      status: res.statusCode,
    };

    httpRequestsTotal.inc(labels);
    end({ method: req.method, route: route });
  });

  next();
}

/**
 * Update the low_stock_medicines_count gauge by querying the database.
 * @param {import('knex').Knex} db - Knex database instance
 */
async function updateLowStockGauge(db) {
  try {
    const result = await db('medicines')
      .whereRaw('quantity <= reorder_threshold')
      .count('id as count')
      .first();

    const count = parseInt(result.count, 10) || 0;
    lowStockMedicinesCount.set(count);
  } catch (err) {
    logger.error({ err: err.message }, 'Failed to update low stock gauge');
  }
}

module.exports = {
  register,
  httpRequestsTotal,
  httpRequestDuration,
  lowStockMedicinesCount,
  metricsMiddleware,
  updateLowStockGauge,
};

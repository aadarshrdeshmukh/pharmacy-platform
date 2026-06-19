const express = require('express');
const pino = require('pino');

const db = require('../db');

const router = express.Router();
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

// ── GET /api/dashboard/summary ───────────────────────────────
router.get('/summary', async (_req, res) => {
  try {
    // Total medicines
    const totalMedicinesResult = await db('medicines').count('id as count').first();
    const totalMedicines = parseInt(totalMedicinesResult.count, 10);

    // Low stock count
    const lowStockResult = await db('medicines')
      .whereRaw('quantity <= reorder_threshold')
      .count('id as count')
      .first();
    const lowStockCount = parseInt(lowStockResult.count, 10);

    // Total prescriptions
    const totalPrescriptionsResult = await db('prescriptions').count('id as count').first();
    const totalPrescriptions = parseInt(totalPrescriptionsResult.count, 10);

    // Pending prescriptions
    const pendingResult = await db('prescriptions')
      .where({ status: 'pending' })
      .count('id as count')
      .first();
    const pendingPrescriptions = parseInt(pendingResult.count, 10);

    // Fulfilled today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const fulfilledTodayResult = await db('prescriptions')
      .where({ status: 'fulfilled' })
      .where('created_at', '>=', today)
      .count('id as count')
      .first();
    const fulfilledToday = parseInt(fulfilledTodayResult.count, 10);

    // Recent transactions (last 10)
    const recentTransactions = await db('stock_transactions')
      .leftJoin('medicines', 'stock_transactions.medicine_id', 'medicines.id')
      .select(
        'stock_transactions.*',
        'medicines.name as medicine_name',
        'medicines.sku as medicine_sku'
      )
      .orderBy('stock_transactions.created_at', 'desc')
      .limit(10);

    res.json({
      data: {
        totalMedicines,
        lowStockCount,
        totalPrescriptions,
        pendingPrescriptions,
        fulfilledToday,
        recentTransactions,
      },
    });
  } catch (err) {
    logger.error({ err: err.message }, 'Failed to fetch dashboard summary');
    res.status(500).json({ error: 'Failed to fetch dashboard summary' });
  }
});

module.exports = router;

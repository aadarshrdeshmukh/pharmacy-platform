const express = require('express');
const { body, query, validationResult } = require('express-validator');
const pino = require('pino');

const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

// ── GET /api/medicines ───────────────────────────────────────
// List all medicines with optional search/filter query params
router.get('/', async (req, res) => {
  try {
    let qb = db('medicines')
      .leftJoin('suppliers', 'medicines.supplier_id', 'suppliers.id')
      .select(
        'medicines.*',
        'suppliers.name as supplier_name'
      );

    // Search by name or SKU
    if (req.query.search) {
      const search = `%${req.query.search}%`;
      qb = qb.where(function () {
        this.whereILike('medicines.name', search).orWhereILike('medicines.sku', search);
      });
    }

    // Filter by supplier
    if (req.query.supplier_id) {
      qb = qb.where('medicines.supplier_id', req.query.supplier_id);
    }

    // Filter by expiry (medicines expiring before a date)
    if (req.query.expiry_before) {
      qb = qb.where('medicines.expiry_date', '<=', req.query.expiry_before);
    }

    // Sort
    const sortBy = req.query.sort_by || 'medicines.name';
    const sortOrder = req.query.sort_order === 'desc' ? 'desc' : 'asc';
    qb = qb.orderBy(sortBy, sortOrder);

    const medicines = await qb;
    res.json({ data: medicines, count: medicines.length });
  } catch (err) {
    logger.error({ err: err.message }, 'Failed to fetch medicines');
    res.status(500).json({ error: 'Failed to fetch medicines' });
  }
});

// ── GET /api/medicines/low-stock ─────────────────────────────
// Medicines where quantity <= reorder_threshold
router.get('/low-stock', async (_req, res) => {
  try {
    const medicines = await db('medicines')
      .leftJoin('suppliers', 'medicines.supplier_id', 'suppliers.id')
      .select('medicines.*', 'suppliers.name as supplier_name')
      .whereRaw('medicines.quantity <= medicines.reorder_threshold')
      .orderBy('medicines.quantity', 'asc');

    res.json({ data: medicines, count: medicines.length });
  } catch (err) {
    logger.error({ err: err.message }, 'Failed to fetch low-stock medicines');
    res.status(500).json({ error: 'Failed to fetch low-stock medicines' });
  }
});

// ── POST /api/medicines ──────────────────────────────────────
router.post(
  '/',
  authenticate,
  [
    body('name').trim().notEmpty().withMessage('Medicine name is required'),
    body('sku').trim().notEmpty().withMessage('SKU is required'),
    body('batch_no').trim().notEmpty().withMessage('Batch number is required'),
    body('expiry_date').isISO8601().withMessage('Valid expiry date (ISO 8601) is required'),
    body('quantity').isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer'),
    body('reorder_threshold').optional().isInt({ min: 0 }),
    body('unit_price').isDecimal().withMessage('Unit price must be a decimal number'),
    body('supplier_id').optional().isInt({ min: 1 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      name, sku, batch_no, expiry_date, quantity,
      reorder_threshold, unit_price, supplier_id,
    } = req.body;

    try {
      // Check for duplicate SKU
      const existing = await db('medicines').where({ sku }).first();
      if (existing) {
        return res.status(409).json({ error: `Medicine with SKU '${sku}' already exists` });
      }

      const [insertId] = await db('medicines')
        .insert({
          name,
          sku,
          batch_no,
          expiry_date,
          quantity: quantity || 0,
          reorder_threshold: reorder_threshold ?? 10,
          unit_price,
          supplier_id: supplier_id || null,
          updated_at: db.fn.now(),
        });

      const medicine = await db('medicines').where({ id: insertId }).first();

      logger.info({ medicineId: medicine.id, sku }, 'Medicine created');
      res.status(201).json({ data: medicine });
    } catch (err) {
      logger.error({ err: err.message }, 'Failed to create medicine');
      res.status(500).json({ error: 'Failed to create medicine' });
    }
  }
);

// ── PUT /api/medicines/:id ───────────────────────────────────
router.put(
  '/:id',
  authenticate,
  [
    body('name').optional().trim().notEmpty(),
    body('sku').optional().trim().notEmpty(),
    body('batch_no').optional().trim().notEmpty(),
    body('expiry_date').optional().isISO8601(),
    body('quantity').optional().isInt({ min: 0 }),
    body('reorder_threshold').optional().isInt({ min: 0 }),
    body('unit_price').optional().isDecimal(),
    body('supplier_id').optional().isInt({ min: 1 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;

    try {
      const existing = await db('medicines').where({ id }).first();
      if (!existing) {
        return res.status(404).json({ error: 'Medicine not found' });
      }

      // If SKU is being changed, check for duplicates
      if (req.body.sku && req.body.sku !== existing.sku) {
        const duplicate = await db('medicines').where({ sku: req.body.sku }).whereNot({ id }).first();
        if (duplicate) {
          return res.status(409).json({ error: `SKU '${req.body.sku}' is already taken` });
        }
      }

      const updateData = { ...req.body, updated_at: db.fn.now() };

      await db('medicines')
        .where({ id })
        .update(updateData);

      const updated = await db('medicines').where({ id }).first();

      logger.info({ medicineId: id }, 'Medicine updated');
      res.json({ data: updated });
    } catch (err) {
      logger.error({ err: err.message }, 'Failed to update medicine');
      res.status(500).json({ error: 'Failed to update medicine' });
    }
  }
);

// ── DELETE /api/medicines/:id ────────────────────────────────
router.delete('/:id', authenticate, async (req, res) => {
  const { id } = req.params;

  try {
    const existing = await db('medicines').where({ id }).first();
    if (!existing) {
      return res.status(404).json({ error: 'Medicine not found' });
    }

    await db('medicines').where({ id }).del();

    logger.info({ medicineId: id }, 'Medicine deleted');
    res.json({ message: 'Medicine deleted successfully' });
  } catch (err) {
    logger.error({ err: err.message }, 'Failed to delete medicine');
    res.status(500).json({ error: 'Failed to delete medicine' });
  }
});

module.exports = router;

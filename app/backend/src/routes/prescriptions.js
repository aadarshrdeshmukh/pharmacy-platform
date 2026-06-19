const express = require('express');
const { body, validationResult } = require('express-validator');
const pino = require('pino');

const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

// ── GET /api/prescriptions ───────────────────────────────────
// List all prescriptions with their items
router.get('/', async (_req, res) => {
  try {
    const prescriptions = await db('prescriptions')
      .leftJoin('users', 'prescriptions.created_by', 'users.id')
      .select(
        'prescriptions.*',
        'users.name as created_by_name'
      )
      .orderBy('prescriptions.created_at', 'desc');

    // Fetch items for each prescription
    const prescriptionIds = prescriptions.map((p) => p.id);
    const items = prescriptionIds.length
      ? await db('prescription_items')
          .whereIn('prescription_id', prescriptionIds)
          .leftJoin('medicines', 'prescription_items.medicine_id', 'medicines.id')
          .select(
            'prescription_items.*',
            'medicines.name as medicine_name',
            'medicines.sku as medicine_sku'
          )
      : [];

    // Group items by prescription_id
    const itemsByPrescription = items.reduce((acc, item) => {
      if (!acc[item.prescription_id]) acc[item.prescription_id] = [];
      acc[item.prescription_id].push(item);
      return acc;
    }, {});

    const result = prescriptions.map((p) => ({
      ...p,
      items: itemsByPrescription[p.id] || [],
    }));

    res.json({ data: result, count: result.length });
  } catch (err) {
    logger.error({ err: err.message }, 'Failed to fetch prescriptions');
    res.status(500).json({ error: 'Failed to fetch prescriptions' });
  }
});

// ── POST /api/prescriptions ──────────────────────────────────
// Create a prescription with items array and create stock_transactions
router.post(
  '/',
  authenticate,
  [
    body('patient_name').trim().notEmpty().withMessage('Patient name is required'),
    body('doctor_name').trim().notEmpty().withMessage('Doctor name is required'),
    body('items').isArray({ min: 1 }).withMessage('At least one prescription item is required'),
    body('items.*.medicine_id').isInt({ min: 1 }).withMessage('Valid medicine_id is required'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { patient_name, doctor_name, items } = req.body;
    const trx = await db.transaction();

    try {
      // Create the prescription
      const [prescriptionId] = await trx('prescriptions')
        .insert({
          patient_name,
          doctor_name,
          status: 'pending',
          created_by: req.user.id,
        });

      const prescription = await trx('prescriptions').where({ id: prescriptionId }).first();

      // Insert prescription items and create stock transactions
      const itemInserts = [];
      const stockTransactions = [];

      for (const item of items) {
        // Verify medicine exists
        const medicine = await trx('medicines').where({ id: item.medicine_id }).first();
        if (!medicine) {
          await trx.rollback();
          return res.status(400).json({
            error: `Medicine with id ${item.medicine_id} not found`,
          });
        }

        itemInserts.push({
          prescription_id: prescription.id,
          medicine_id: item.medicine_id,
          quantity: item.quantity,
        });

        // Create a stock transaction record (dispense)
        stockTransactions.push({
          medicine_id: item.medicine_id,
          change_qty: -item.quantity,
          reason: 'dispense',
        });
      }

      await trx('prescription_items').insert(itemInserts);
      await trx('stock_transactions').insert(stockTransactions);

      await trx.commit();

      // Fetch the complete prescription with items
      const fullPrescription = await db('prescriptions').where({ id: prescription.id }).first();
      const prescriptionItems = await db('prescription_items')
        .where({ prescription_id: prescription.id })
        .leftJoin('medicines', 'prescription_items.medicine_id', 'medicines.id')
        .select(
          'prescription_items.*',
          'medicines.name as medicine_name',
          'medicines.sku as medicine_sku'
        );

      logger.info({ prescriptionId: prescription.id }, 'Prescription created');

      res.status(201).json({
        data: {
          ...fullPrescription,
          items: prescriptionItems,
        },
      });
    } catch (err) {
      await trx.rollback();
      logger.error({ err: err.message }, 'Failed to create prescription');
      res.status(500).json({ error: 'Failed to create prescription' });
    }
  }
);

// ── PUT /api/prescriptions/:id ───────────────────────────────
// Update status (e.g., mark fulfilled → deduct stock)
router.put(
  '/:id',
  authenticate,
  [
    body('status')
      .isIn(['pending', 'fulfilled', 'cancelled'])
      .withMessage('Status must be pending, fulfilled, or cancelled'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { status } = req.body;
    const trx = await db.transaction();

    try {
      const prescription = await trx('prescriptions').where({ id }).first();
      if (!prescription) {
        await trx.rollback();
        return res.status(404).json({ error: 'Prescription not found' });
      }

      if (prescription.status === status) {
        await trx.rollback();
        return res.status(400).json({ error: `Prescription is already ${status}` });
      }

      if (prescription.status !== 'pending') {
        await trx.rollback();
        return res.status(400).json({
          error: `Cannot change status from '${prescription.status}'. Only pending prescriptions can be updated.`,
        });
      }

      // If fulfilling → deduct stock for each item
      if (status === 'fulfilled') {
        const items = await trx('prescription_items')
          .where({ prescription_id: id });

        for (const item of items) {
          const medicine = await trx('medicines').where({ id: item.medicine_id }).first();
          if (!medicine) {
            await trx.rollback();
            return res.status(400).json({
              error: `Medicine with id ${item.medicine_id} no longer exists`,
            });
          }

          if (medicine.quantity < item.quantity) {
            await trx.rollback();
            return res.status(400).json({
              error: `Insufficient stock for '${medicine.name}'. Available: ${medicine.quantity}, Required: ${item.quantity}`,
            });
          }

          // Deduct stock
          await trx('medicines')
            .where({ id: item.medicine_id })
            .update({
              quantity: medicine.quantity - item.quantity,
              updated_at: trx.fn.now(),
            });
        }
      }

      // Update prescription status
      await trx('prescriptions')
        .where({ id })
        .update({ status });

      const updated = await trx('prescriptions').where({ id }).first();

      await trx.commit();

      logger.info({ prescriptionId: id, status }, 'Prescription status updated');
      res.json({ data: updated });
    } catch (err) {
      await trx.rollback();
      logger.error({ err: err.message }, 'Failed to update prescription');
      res.status(500).json({ error: 'Failed to update prescription' });
    }
  }
);

// ── DELETE /api/prescriptions/:id ────────────────────────────
// Cancel prescription
router.delete('/:id', authenticate, async (req, res) => {
  const { id } = req.params;

  try {
    const prescription = await db('prescriptions').where({ id }).first();
    if (!prescription) {
      return res.status(404).json({ error: 'Prescription not found' });
    }

    if (prescription.status === 'fulfilled') {
      return res.status(400).json({
        error: 'Cannot delete a fulfilled prescription. Consider creating a return instead.',
      });
    }

    // Delete will cascade to prescription_items
    await db('prescriptions').where({ id }).del();

    logger.info({ prescriptionId: id }, 'Prescription cancelled/deleted');
    res.json({ message: 'Prescription cancelled successfully' });
  } catch (err) {
    logger.error({ err: err.message }, 'Failed to delete prescription');
    res.status(500).json({ error: 'Failed to delete prescription' });
  }
});

module.exports = router;

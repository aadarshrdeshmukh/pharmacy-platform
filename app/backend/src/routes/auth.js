const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const pino = require('pino');

const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// ── POST /api/auth/login ─────────────────────────────────────
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('A valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      const user = await db('users').where({ email: email.toLowerCase() }).first();

      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const payload = {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      };

      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

      logger.info({ userId: user.id, email: user.email }, 'User logged in successfully');

      res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (err) {
      logger.error({ err: err.message }, 'Login failed');
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ── POST /api/auth/register (admin-only) ─────────────────────
router.post(
  '/register',
  authenticate,
  requireRole('admin'),
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('A valid email is required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    body('role')
      .isIn(['admin', 'pharmacist'])
      .withMessage('Role must be admin or pharmacist'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, role } = req.body;

    try {
      // Check if user already exists
      const existing = await db('users').where({ email: email.toLowerCase() }).first();
      if (existing) {
        return res.status(409).json({ error: 'A user with this email already exists' });
      }

      const salt = await bcrypt.genSalt(12);
      const password_hash = await bcrypt.hash(password, salt);

      const [insertId] = await db('users')
        .insert({
          name,
          email: email.toLowerCase(),
          password_hash,
          role,
        });

      const newUser = await db('users')
        .select('id', 'name', 'email', 'role', 'created_at')
        .where({ id: insertId })
        .first();

      logger.info({ userId: newUser.id, email: newUser.email }, 'New user registered');

      res.status(201).json({ user: newUser });
    } catch (err) {
      logger.error({ err: err.message }, 'Registration failed');
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

module.exports = router;

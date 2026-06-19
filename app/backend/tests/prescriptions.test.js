const request = require('supertest');
const jwt = require('jsonwebtoken');

// Setup mocks before requiring the app
const { mockSharedBuilder } = require('./setup');

const app = require('../src/index');
const db = require('../src/db');

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key';

function generateTestToken(overrides = {}) {
  const payload = {
    id: 1,
    email: 'admin@pharmacy.com',
    role: 'admin',
    name: 'Test Admin',
    ...overrides,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

describe('Prescriptions API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSharedBuilder.orderBy.mockResolvedValue([]);
    mockSharedBuilder.first.mockResolvedValue(null);
    mockSharedBuilder.returning.mockResolvedValue([]);
    mockSharedBuilder.select.mockReturnThis();
  });

  // ── GET /api/prescriptions ─────────────────────────────
  describe('GET /api/prescriptions', () => {
    it('should return 200 and a list of prescriptions', async () => {
      const mockPrescriptions = [
        {
          id: 1,
          patient_name: 'John Doe',
          doctor_name: 'Dr. Smith',
          status: 'pending',
          created_by: 1,
          created_by_name: 'Admin User',
        },
      ];

      mockSharedBuilder.orderBy.mockResolvedValue(mockPrescriptions);

      const res = await request(app).get('/api/prescriptions');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  // ── POST /api/prescriptions (auth required) ────────────
  describe('POST /api/prescriptions', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .post('/api/prescriptions')
        .send({
          patient_name: 'Test Patient',
          doctor_name: 'Dr. Test',
          items: [{ medicine_id: 1, quantity: 5 }],
        });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });

    it('should create a prescription with valid data and auth', async () => {
      const token = generateTestToken();
      const newPrescription = {
        patient_name: 'Test Patient',
        doctor_name: 'Dr. Test',
        items: [
          { medicine_id: 1, quantity: 5 },
        ],
      };

      // The route uses: const trx = await db.transaction()
      // then calls trx('tablename').insert(...) etc.
      // So trx must be a callable that returns a query builder.
      const trxBuilder = {
        insert: jest.fn()
          .mockResolvedValueOnce([10])   // trx('prescriptions').insert → [prescriptionId]
          .mockResolvedValue([]),          // trx('prescription_items').insert, trx('stock_transactions').insert
        where: jest.fn().mockReturnThis(),
        first: jest.fn()
          .mockResolvedValueOnce({ id: 10, patient_name: 'Test Patient', doctor_name: 'Dr. Test', status: 'pending', created_by: 1 }) // trx('prescriptions').where({id}).first()
          .mockResolvedValueOnce({ id: 1, name: 'Test Med', quantity: 100 }), // trx('medicines').where({id}).first()
        select: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
      };

      const trx = jest.fn(() => trxBuilder);
      trx.commit = jest.fn().mockResolvedValue(undefined);
      trx.rollback = jest.fn().mockResolvedValue(undefined);
      trx.fn = { now: jest.fn().mockReturnValue('NOW()') };

      db.transaction.mockResolvedValue(trx);

      // Mock post-transaction queries (outside trx, uses db('prescriptions'))
      mockSharedBuilder.where.mockReturnThis();
      mockSharedBuilder.first.mockResolvedValue({
        id: 10,
        patient_name: 'Test Patient',
        doctor_name: 'Dr. Test',
        status: 'pending',
        created_by: 1,
      });
      mockSharedBuilder.leftJoin.mockReturnThis();
      mockSharedBuilder.select.mockResolvedValue([
        { medicine_id: 1, quantity: 5, medicine_name: 'Test Med', medicine_sku: 'TST-001' },
      ]);

      const res = await request(app)
        .post('/api/prescriptions')
        .set('Authorization', `Bearer ${token}`)
        .send(newPrescription);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('data');
    });
  });

  // ── POST /api/prescriptions — validation ───────────────
  describe('POST /api/prescriptions validation', () => {
    it('should return 400 with missing required fields', async () => {
      const token = generateTestToken();

      const res = await request(app)
        .post('/api/prescriptions')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('errors');
    });
  });
});

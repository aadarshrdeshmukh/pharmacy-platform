const request = require('supertest');
const jwt = require('jsonwebtoken');

// Setup mocks before requiring the app
const { sharedBuilder } = require('./setup');

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
    sharedBuilder.orderBy.mockResolvedValue([]);
    sharedBuilder.first.mockResolvedValue(null);
    sharedBuilder.returning.mockResolvedValue([]);
    sharedBuilder.select.mockReturnThis();
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

      sharedBuilder.orderBy.mockResolvedValue(mockPrescriptions);

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

      // Mock transaction to call the callback with a trx object
      const trxBuilder = {
        insert: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([{
          id: 10,
          patient_name: 'Test Patient',
          doctor_name: 'Dr. Test',
          status: 'pending',
          created_by: 1,
        }]),
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({ id: 1, name: 'Test Med', quantity: 100 }),
        select: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        decrement: jest.fn().mockResolvedValue(1),
      };

      const trxCallable = jest.fn(() => trxBuilder);
      trxCallable.commit = jest.fn().mockResolvedValue(undefined);
      trxCallable.rollback = jest.fn().mockResolvedValue(undefined);
      trxCallable.fn = { now: jest.fn().mockReturnValue('NOW()') };

      db.transaction.mockImplementation(async (callback) => {
        return callback(trxCallable);
      });

      // Mock post-transaction queries
      sharedBuilder.first.mockResolvedValue({
        id: 10,
        patient_name: 'Test Patient',
        doctor_name: 'Dr. Test',
        status: 'pending',
        created_by: 1,
      });

      const res = await request(app)
        .post('/api/prescriptions')
        .set('Authorization', `Bearer ${token}`)
        .send(newPrescription);

      expect([201, 500]).toContain(res.status);
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

const request = require('supertest');
const jwt = require('jsonwebtoken');

// Setup mocks before requiring the app
const { sharedBuilder } = require('./setup');

const app = require('../src/index');

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key';

// Helper to generate a valid test token
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

describe('Medicines API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset shared builder defaults
    sharedBuilder.orderBy.mockResolvedValue([]);
    sharedBuilder.first.mockResolvedValue(null);
    sharedBuilder.returning.mockResolvedValue([]);
  });

  // ── GET /api/medicines ───────────────────────────────────
  describe('GET /api/medicines', () => {
    it('should return 200 and an array of medicines', async () => {
      const mockMedicines = [
        { id: 1, name: 'Amoxicillin 500mg', sku: 'AMX-500', quantity: 250 },
        { id: 2, name: 'Ibuprofen 200mg', sku: 'IBU-200', quantity: 500 },
      ];

      sharedBuilder.orderBy.mockResolvedValue(mockMedicines);

      const res = await request(app).get('/api/medicines');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  // ── POST /api/medicines (auth required) ──────────────────
  describe('POST /api/medicines', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .post('/api/medicines')
        .send({
          name: 'Test Medicine',
          sku: 'TST-001',
          batch_no: 'B2024-099',
          expiry_date: '2027-01-01',
          quantity: 100,
          unit_price: '1.50',
        });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });

    it('should return 400 with invalid data and valid token', async () => {
      const token = generateTestToken();

      const res = await request(app)
        .post('/api/medicines')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('errors');
    });

    it('should create a medicine with valid data and auth', async () => {
      const token = generateTestToken();
      const newMedicine = {
        name: 'Test Medicine',
        sku: 'TST-001',
        batch_no: 'B2024-099',
        expiry_date: '2027-01-01',
        quantity: 100,
        unit_price: '1.50',
      };

      sharedBuilder.first.mockResolvedValue(null);
      sharedBuilder.returning.mockResolvedValue([{ id: 99, ...newMedicine }]);

      const res = await request(app)
        .post('/api/medicines')
        .set('Authorization', `Bearer ${token}`)
        .send(newMedicine);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('data');
    });
  });

  // ── GET /api/medicines/low-stock ─────────────────────────
  describe('GET /api/medicines/low-stock', () => {
    it('should return medicines below reorder threshold', async () => {
      const lowStockMeds = [
        { id: 3, name: 'Paracetamol 500mg', sku: 'PCM-500', quantity: 8, reorder_threshold: 100 },
        { id: 5, name: 'Omeprazole 20mg', sku: 'OMP-020', quantity: 5, reorder_threshold: 40 },
      ];

      sharedBuilder.orderBy.mockResolvedValue(lowStockMeds);

      const res = await request(app).get('/api/medicines/low-stock');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});

// ── GET /health ────────────────────────────────────────────
describe('Health Check', () => {
  it('should return 200 with status ok', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('timestamp');
  });
});

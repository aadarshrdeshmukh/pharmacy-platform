/**
 * Test setup — mock the database connection so unit tests
 * run without a real PostgreSQL instance.
 */

// Mock the knex db module
jest.mock('../src/db', () => {
  const knex = jest.fn();

  // Helper to create a chainable query builder mock
  const createQueryBuilder = () => {
    const builder = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      whereNot: jest.fn().mockReturnThis(),
      whereIn: jest.fn().mockReturnThis(),
      whereRaw: jest.fn().mockReturnThis(),
      whereILike: jest.fn().mockReturnThis(),
      orWhereILike: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      count: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      del: jest.fn().mockResolvedValue(1),
      first: jest.fn().mockResolvedValue(null),
      returning: jest.fn().mockResolvedValue([]),
      then: jest.fn(),
    };
    return builder;
  };

  // Make knex callable as a function (table name) that returns a query builder
  const mockDb = jest.fn(() => createQueryBuilder());
  mockDb.raw = jest.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] });
  mockDb.fn = { now: jest.fn().mockReturnValue('NOW()') };
  mockDb.transaction = jest.fn().mockResolvedValue({
    commit: jest.fn(),
    rollback: jest.fn(),
    ...createQueryBuilder(),
  });

  return mockDb;
});

// Mock prom-client to avoid metric registration conflicts across test suites
jest.mock('prom-client', () => {
  const original = jest.requireActual('prom-client');
  return {
    ...original,
    Registry: jest.fn().mockImplementation(() => ({
      metrics: jest.fn().mockResolvedValue(''),
      contentType: 'text/plain',
      registerMetric: jest.fn(),
    })),
    Counter: jest.fn().mockImplementation(() => ({
      inc: jest.fn(),
    })),
    Histogram: jest.fn().mockImplementation(() => ({
      startTimer: jest.fn().mockReturnValue(jest.fn()),
      observe: jest.fn(),
    })),
    Gauge: jest.fn().mockImplementation(() => ({
      set: jest.fn(),
    })),
    collectDefaultMetrics: jest.fn(),
  };
});

// Suppress pino logging during tests
process.env.LOG_LEVEL = 'silent';
process.env.JWT_SECRET = 'test-jwt-secret-key';

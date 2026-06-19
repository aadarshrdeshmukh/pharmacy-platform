const jwt = require('jsonwebtoken');
const pino = require('pino');

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-me';

/**
 * Middleware to verify JWT token and attach user to request.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Provide a valid Bearer token.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      name: decoded.name,
    };
    next();
  } catch (err) {
    logger.warn({ err: err.message }, 'JWT verification failed');
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token has expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid token.' });
  }
}

/**
 * Middleware factory for role-based authorization.
 * @param  {...string} roles - Allowed roles
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (!roles.includes(req.user.role)) {
      logger.warn(
        { userId: req.user.id, userRole: req.user.role, requiredRoles: roles },
        'Access denied: insufficient role'
      );
      return res.status(403).json({
        error: `Access denied. Required role(s): ${roles.join(', ')}`,
      });
    }

    next();
  };
}

module.exports = { authenticate, requireRole };

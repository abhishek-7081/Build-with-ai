import jwt from 'jsonwebtoken';

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. Authentication required.' });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET || 'delhi_civic_security_secret_token_12345');
    req.userId = verified.userId;
    req.userName = verified.name;
    req.userPhone = verified.phone;
    req.userRole = verified.role || 'citizen';
    req.userDepartment = verified.department || null;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Session expired or invalid token. Please log in again.' });
  }
}

export function optionalAuthenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const verified = jwt.verify(token, process.env.JWT_SECRET || 'delhi_civic_security_secret_token_12345');
      req.userId = verified.userId;
      req.userName = verified.name;
      req.userPhone = verified.phone;
      req.userRole = verified.role || 'citizen';
      req.userDepartment = verified.department || null;
    } catch (err) {
      console.warn('Optional auth token invalid, proceeding anonymously:', err.message);
    }
  }
  next();
}

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required for administrative access.' });
    }

    const role = req.userRole || 'citizen';
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({
        error: `Access denied. Requiring [${allowedRoles.join(', ')}] role, but account role is '${role}'.`
      });
    }

    next();
  };
}

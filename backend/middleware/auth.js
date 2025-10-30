import jwt from 'jsonwebtoken';

// Middleware to verify JWT token
export const verifyToken = (req, res, next) => {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token.' });
  }
};

// Middleware to check if user has DBA role
export const requireDBA = (req, res, next) => {
  if (req.user.role !== 'dba') {
    return res.status(403).json({ message: 'Access denied. DBA role required.' });
  }
  next();
};

// Middleware to check if user has admin role
export const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin role required.' });
  }
  next();
};

// Middleware to check if user has admin or DBA role
export const requireAdminOrDBA = (req, res, next) => {
  if (req.user.role !== 'dba' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin or DBA role required.' });
  }
  next();
};

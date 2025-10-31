import express from 'express';
import jwt from 'jsonwebtoken';

export default function createAuthRouter(connectToMongo) {
  const router = express.Router();

  async function getUsersCollection(db) {
    const configured = (process.env.MONGODB_LOGIN_COLLECTION || process.env.MONGODB_USERS_COLLECTION || process.env.MONGODB_COLLECTION || '').trim();
    const candidates = [];
    if (configured) candidates.push(configured);
    candidates.push('login', 'Login', 'users', 'Users');
    const available = await db.listCollections({}, { nameOnly: true }).toArray().catch(() => []);
    const names = available.map(entry => entry.name);
    for (const candidate of candidates) {
      if (names.includes(candidate)) {
        return db.collection(candidate);
      }
    }
    const normalized = new Map(names.map(name => [name.replace(/[\s_]/g, '').toLowerCase(), name]));
    for (const candidate of candidates) {
      const match = normalized.get(candidate.replace(/[\s_]/g, '').toLowerCase());
      if (match) {
        return db.collection(match);
      }
    }
    return db.collection(candidates[0] || 'login');
  }

  function sanitizeEmailValue(value) {
    const str = String(value || '').trim();
    return str;
  }

  function escapeRegex(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function findFieldValue(source, fields) {
    for (const field of fields) {
      if (source[field] !== undefined && source[field] !== null && source[field] !== '') {
        return source[field];
      }
    }
    const lookup = new Map();
    for (const key of Object.keys(source)) {
      lookup.set(key.replace(/[\s_]/g, '').toLowerCase(), source[key]);
    }
    for (const field of fields) {
      const key = field.replace(/[\s_]/g, '').toLowerCase();
      if (lookup.has(key)) {
        return lookup.get(key);
      }
    }
    return null;
  }

  const emailFields = [
    'email',
    'Email',
    'gmail',
    'Gmail',
    'username',
    'Username',
    'userEmail',
    'UserEmail',
    'emailId',
    'EmailId',
    'EmailID',
    'emailID',
    'Email Address',
    'Email address',
    'Email_Address',
    'EmailAddress',
    'email_address',
    'emailAddress',
    'login',
    'Login',
    'primaryEmail',
    'PrimaryEmail'
  ];

  const passwordFields = [
    'password',
    'Password',
    'pass',
    'Pass',
    'pwd',
    'Pwd',
    'passwordHash',
    'PasswordHash',
    'Password Hash',
    'Passcode',
    'PassCode'
  ];

  router.post('/register', async (req, res) => {
    try {
      const { firstName, lastName, email, password, confirmPassword, phoneNumber, dateOfBirth, gender, occupation } = req.body;
      const sanitizedEmail = sanitizeEmailValue(email);
      if (!sanitizedEmail || !password || !firstName || !lastName) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
      if (password !== confirmPassword) {
        return res.status(400).json({ message: 'Passwords do not match' });
      }
      const db = await connectToMongo();
      const users = await getUsersCollection(db);
      const emailLower = sanitizedEmail.toLowerCase();
      const emailRegex = new RegExp(`^${escapeRegex(emailLower)}$`, 'i');
      const existing = await users.findOne({
        $or: emailFields.map(field => ({ [field]: emailRegex }))
      });
      if (existing) {
        return res.status(409).json({ message: 'Email already registered' });
      }
      const doc = {
        firstName,
        lastName,
        email: emailLower,
        gmail: emailLower,
        password,
        phoneNumber: phoneNumber || '',
        dateOfBirth: dateOfBirth || '',
        gender: gender || '',
        occupation: occupation || '',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      const result = await users.insertOne(doc);
      const userId = result.insertedId;
      const token = jwt.sign({ sub: String(userId), email: doc.email }, process.env.JWT_SECRET || 'dev_secret', { expiresIn: '7d' });
      return res.status(201).json({
        message: 'Registration successful',
        token,
        user: { id: String(userId), firstName: doc.firstName, lastName: doc.lastName, email: doc.email }
      });
    } catch (err) {
      console.error('[auth] register error', err);
      return res.status(500).json({ message: 'Registration failed' });
    }
  });

  router.post('/login', async (req, res) => {
    try {
      const inputUsername = String(req.body.username || '').trim().toLowerCase();
      const inputPassword = String(req.body.password || '');
      if (!inputUsername || !inputPassword) {
        return res.status(400).json({ message: 'Username and password are required' });
      }

      const db = await connectToMongo();
      
      // Try to find user in login collection by username
      let user = null;
      let userSource = null;
      
      const users = await getUsersCollection(db);
      user = await users.findOne({
        username: { $regex: `^${escapeRegex(inputUsername)}$`, $options: 'i' }
      });
      
      if (user) {
        userSource = 'login';
        // Verify password for login collection
        const storedPasswordValue = findFieldValue(user, passwordFields);
        const storedPassword = storedPasswordValue !== null && storedPasswordValue !== undefined ? String(storedPasswordValue) : '';
        let ok = false;
        if (storedPassword.startsWith('$2')) {
          const { default: bcrypt } = await import('bcryptjs');
          ok = await bcrypt.compare(inputPassword, storedPassword);
        } else {
          ok = storedPassword === inputPassword;
        }
        if (!ok) {
          console.log('[auth] login: password mismatch for user', inputUsername);
          return res.status(401).json({ message: 'Invalid credentials' });
        }
      } else {
        // Try to find user in login_admin collection by adminMail (used as username)
        const adminCollection = db.collection('login_admin');
        const adminUser = await adminCollection.findOne({
          adminMail: { $regex: `^${escapeRegex(inputUsername)}$`, $options: 'i' }
        });
        
        if (adminUser) {
          userSource = 'login_admin';
          // Verify password for login_admin collection
          const storedPassword = String(adminUser.pass || '');
          const ok = storedPassword === inputPassword;
          if (!ok) {
            console.log('[auth] login: password mismatch for admin', inputUsername);
            return res.status(401).json({ message: 'Invalid credentials' });
          }
          user = adminUser;
        } else {
          console.log('[auth] login: user not found for username', inputUsername);
          return res.status(401).json({ message: 'Invalid credentials' });
        }
      }

      // Generate token based on source
      let token, responseUser;
      
      if (userSource === 'login') {
        const resolvedEmailValue = findFieldValue(user, emailFields) || user.email || '';
        const resolvedRole = user.role || user.Role || user.userRole || 'user';
        const serNo = user.serNo || user.SerNo || user.serno || null;
        
        // DEBUG: Log vansh info for troubleshooting
        console.log(`[AUTH] Login for ${inputUsername}: serNo=${serNo}, type=${typeof serNo}`);
        if (!serNo) {
          console.warn(`[AUTH WARNING] User ${inputUsername} has no serNo - events will not be filtered by vansh!`);
        }
        
        token = jwt.sign({
          sub: String(user._id),
          username: inputUsername,
          email: String(resolvedEmailValue).toLowerCase(),
          role: resolvedRole,
          serNo: serNo
        }, process.env.JWT_SECRET || 'dev_secret', { expiresIn: '7d' });
        responseUser = {
          id: String(user._id),
          firstName: user.firstName || user.FirstName || user.firstname || '',
          lastName: user.lastName || user.LastName || user.lastname || '',
          username: user.username || inputUsername,
          email: String(resolvedEmailValue).toLowerCase(),
          role: resolvedRole,
          serNo: serNo
        };
      } else if (userSource === 'login_admin') {
        const adminRole = 'admin';
        token = jwt.sign({
          sub: String(user._id),
          username: inputUsername,
          adminMail: user.adminMail,
          role: adminRole,
          adminId: user.adminId
        }, process.env.JWT_SECRET || 'dev_secret', { expiresIn: '7d' });
        responseUser = {
          id: String(user._id),
          firstName: 'Admin',
          lastName: 'User',
          username: inputUsername,
          email: user.adminMail,
          role: adminRole,
          adminId: user.adminId
        };
      }

      return res.json({
        message: 'Login successful',
        token,
        user: responseUser
      });
    } catch (err) {
      console.error('[auth] login error', err);
      return res.status(500).json({ message: 'Login failed' });
    }
  });

  router.get('/me', async (req, res) => {
    try {
      const auth = req.headers.authorization || '';
      const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
      if (!token) return res.status(401).json({ message: 'Missing token' });
      const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
      
      // Check if this is an admin user (from login_admin collection)
      if (payload.adminId) {
        return res.json({
          id: String(payload.sub),
          username: payload.username,
          email: payload.adminMail,
          role: 'admin',
          adminId: payload.adminId
        });
      }

      const db = await connectToMongo();
      const users = await getUsersCollection(db);
      const user = await users.findOne({ _id: new (await import('mongodb')).ObjectId(payload.sub) });
      if (!user) return res.status(404).json({ message: 'User not found' });
      
      const resolvedEmailValue = findFieldValue(user, emailFields) || user.email || user.Email || '';
      const resolvedRole = user.role || user.Role || user.userRole || 'user';
      const serNo = user.serNo || user.SerNo || user.serno || null;
      return res.json({
        id: String(user._id),
        username: user.username || payload.username || '',
        name: user.name || [user.firstName || user.FirstName || '', user.lastName || user.LastName || ''].filter(Boolean).join(' ').trim(),
        email: String(resolvedEmailValue).toLowerCase(),
        role: resolvedRole,
        serNo: serNo
      });
    } catch (err) {
      console.error('[auth] me error', err);
      return res.status(401).json({ message: 'Invalid token' });
    }
  });

  return router;
}

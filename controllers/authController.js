const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { sendSuccess, sendError, asyncHandler } = require('../utils/helpers');

/**
 * Helper to generate JWT Token
 */
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'medifind_jwt_secret_dev_key_healthcare_secure_2026',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

/**
 * @desc    Register a new user or pharmacy owner
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = asyncHandler(async (req, res) => {
  const { name, email, phone, password, role = 'user', pharmacy_name, pharmacy_address, pharmacy_phone, opening_hours } = req.body;

  // Validation
  if (!name || !email || !phone || !password) {
    return sendError(res, 'Please provide name, email, phone, and password', 400);
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return sendError(res, 'Please provide a valid email address', 400);
  }

  // Check if user already exists
  const existingUsers = await query('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
  if (existingUsers.length > 0) {
    return sendError(res, 'An account with this email already exists', 409);
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Validate allowed roles
  const validRoles = ['user', 'pharmacy_owner', 'admin'];
  const userRole = validRoles.includes(role) ? role : 'user';

  // Insert user
  const result = await query(
    'INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)',
    [name.trim(), email.toLowerCase().trim(), phone.trim(), hashedPassword, userRole]
  );

  const userId = result.insertId;
  let pharmacyData = null;

  // If registering as pharmacy owner, optionally create pharmacy profile
  if (userRole === 'pharmacy_owner') {
    const pName = pharmacy_name || `${name}'s Pharmacy`;
    const pAddress = pharmacy_address || 'City Center';
    const pPhone = pharmacy_phone || phone;
    const pHours = opening_hours || '08:00 AM - 10:00 PM';

    const pharmacyResult = await query(
      'INSERT INTO pharmacies (owner_id, name, address, phone, opening_hours) VALUES (?, ?, ?, ?, ?)',
      [userId, pName, pAddress, pPhone, pHours]
    );

    pharmacyData = {
      id: pharmacyResult.insertId,
      owner_id: userId,
      name: pName,
      address: pAddress,
      phone: pPhone,
      opening_hours: pHours,
    };
  }

  const user = {
    id: userId,
    name: name.trim(),
    email: email.toLowerCase().trim(),
    phone: phone.trim(),
    role: userRole,
    pharmacy: pharmacyData,
  };

  const token = generateToken(user);

  return sendSuccess(
    res,
    'Registration successful',
    {
      user,
      token,
    },
    201
  );
});

/**
 * @desc    Authenticate user & get token
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return sendError(res, 'Please provide both email and password', 400);
  }

  // Fetch user
  const users = await query('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);
  if (!users || users.length === 0) {
    return sendError(res, 'Invalid email or password', 401);
  }

  const user = users[0];

  // Verify password
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return sendError(res, 'Invalid email or password', 401);
  }

  // If pharmacy owner, retrieve their pharmacy details
  let pharmacyData = null;
  if (user.role === 'pharmacy_owner') {
    const pharmacies = await query('SELECT * FROM pharmacies WHERE owner_id = ? LIMIT 1', [user.id]);
    if (pharmacies.length > 0) {
      pharmacyData = pharmacies[0];
    }
  }

  const userResponse = {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    created_at: user.created_at,
    pharmacy: pharmacyData,
  };

  const token = generateToken(userResponse);

  return sendSuccess(res, 'Login successful', {
    user: userResponse,
    token,
  });
});

/**
 * @desc    Get current user profile
 * @route   GET /api/auth/profile
 * @access  Private
 */
const getProfile = asyncHandler(async (req, res) => {
  let pharmacyData = null;
  if (req.user.role === 'pharmacy_owner') {
    const pharmacies = await query('SELECT * FROM pharmacies WHERE owner_id = ? LIMIT 1', [req.user.id]);
    if (pharmacies.length > 0) {
      pharmacyData = pharmacies[0];
    }
  }

  return sendSuccess(res, 'Profile retrieved successfully', {
    ...req.user,
    pharmacy: pharmacyData,
  });
});

/**
 * @desc    Update user profile
 * @route   PUT /api/auth/profile
 * @access  Private
 */
const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, password, pharmacy_name, pharmacy_address, pharmacy_phone, opening_hours } = req.body;
  const userId = req.user.id;

  const updates = [];
  const params = [];

  if (name) {
    updates.push('name = ?');
    params.push(name.trim());
  }

  if (phone) {
    updates.push('phone = ?');
    params.push(phone.trim());
  }

  if (password && password.trim().length >= 6) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password.trim(), salt);
    updates.push('password = ?');
    params.push(hashedPassword);
  }

  if (updates.length > 0) {
    params.push(userId);
    await query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
  }

  // Update pharmacy details if pharmacy owner
  let pharmacyData = null;
  if (req.user.role === 'pharmacy_owner') {
    const existingPharma = await query('SELECT * FROM pharmacies WHERE owner_id = ? LIMIT 1', [userId]);
    if (existingPharma.length > 0) {
      const pUpdates = [];
      const pParams = [];

      if (pharmacy_name) {
        pUpdates.push('name = ?');
        pParams.push(pharmacy_name.trim());
      }
      if (pharmacy_address) {
        pUpdates.push('address = ?');
        pParams.push(pharmacy_address.trim());
      }
      if (pharmacy_phone) {
        pUpdates.push('phone = ?');
        pParams.push(pharmacy_phone.trim());
      }
      if (opening_hours) {
        pUpdates.push('opening_hours = ?');
        pParams.push(opening_hours.trim());
      }

      if (pUpdates.length > 0) {
        pParams.push(existingPharma[0].id);
        await query(`UPDATE pharmacies SET ${pUpdates.join(', ')} WHERE id = ?`, pParams);
      }

      const updatedPharma = await query('SELECT * FROM pharmacies WHERE id = ?', [existingPharma[0].id]);
      pharmacyData = updatedPharma[0];
    }
  }

  const updatedUsers = await query(
    'SELECT id, name, email, phone, role, created_at FROM users WHERE id = ?',
    [userId]
  );

  return sendSuccess(res, 'Profile updated successfully', {
    ...updatedUsers[0],
    pharmacy: pharmacyData,
  });
});

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
};


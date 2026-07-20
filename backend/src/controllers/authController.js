const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { handleValidation } = require('../middleware/errorHandler');

function issueToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
}

// POST /auth/login
async function login(req, res, next) {
  if (handleValidation(req, res)) return;
  const { email, password } = req.body;

  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1 AND is_active = TRUE', [email]);
    const user = rows[0];

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    res.json({
      success: true,
      data: {
        token: issueToken(user),
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
      },
    });
  } catch (err) {
    next(err);
  }
}

// POST /auth/register (public self-signup)
// Anyone can create their own account, but only for operational roles -
// 'admin' accounts are provisioned separately (seed/direct DB) and can't be self-assigned.
async function register(req, res, next) {
  if (handleValidation(req, res)) return;
  const { name, email, password, role } = req.body;

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1,$2,$3,$4)
       RETURNING id, name, email, role, created_at`,
      [name, email, passwordHash, role]
    );
    const user = rows[0];

    res.status(201).json({
      success: true,
      data: {
        token: issueToken(user),
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
      },
    });
  } catch (err) {
    next(err);
  }
}

// GET /auth/me
async function me(req, res, next) {
  try {
    const { rows } = await pool.query('SELECT id, name, email, role, created_at FROM users WHERE id = $1', [
      req.user.id,
    ]);
    if (!rows[0]) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
}

module.exports = { login, register, me };

const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  authController.login
);

// Public self-signup. 'admin' is intentionally excluded - admin accounts
// are provisioned separately (seed/direct DB), not self-assignable.
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').isIn(['sales', 'warehouse', 'accounts']).withMessage('Invalid role'),
  ],
  authController.register
);

router.get('/me', authenticate, authController.me);

module.exports = router;

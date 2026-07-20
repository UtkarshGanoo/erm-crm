const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { authenticate, authorize } = require('../middleware/auth');

const customerValidation = [
  body('customer_name').trim().notEmpty().withMessage('Customer name is required'),
  body('mobile_number').trim().notEmpty().withMessage('Mobile number is required')
    .isLength({ min: 7, max: 20 }).withMessage('Mobile number looks invalid'),
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('Invalid email'),
  body('customer_type').isIn(['Retail', 'Wholesale', 'Distributor']).withMessage('Invalid customer type'),
  body('status').optional().isIn(['Lead', 'Active', 'Inactive']).withMessage('Invalid status'),
  body('follow_up_date').optional({ checkFalsy: true }).isISO8601().withMessage('Invalid date format'),
];

// All routes require login. Admin, sales, and accounts can manage customers.
router.use(authenticate);

router.get('/', authorize('admin', 'sales', 'accounts'), customerController.list);
router.get('/:id', authorize('admin', 'sales', 'accounts'), customerController.getById);
router.post('/', authorize('admin', 'sales'), customerValidation, customerController.create);
router.put('/:id', authorize('admin', 'sales'), customerValidation, customerController.update);
router.post(
  '/:id/followups',
  authorize('admin', 'sales'),
  [body('note').trim().notEmpty().withMessage('Note is required')],
  customerController.addFollowup
);

module.exports = router;

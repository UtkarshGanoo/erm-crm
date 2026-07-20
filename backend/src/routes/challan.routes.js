const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const challanController = require('../controllers/challanController');
const { authenticate, authorize } = require('../middleware/auth');

const createValidation = [
  body('customer_id').isInt().withMessage('customer_id is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one product item is required'),
  body('items.*.product_id').isInt().withMessage('Each item needs a valid product_id'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Each item needs a quantity of at least 1'),
  body('status').optional().isIn(['Draft', 'Confirmed']).withMessage('status must be Draft or Confirmed'),
];

router.use(authenticate);

router.get('/', authorize('admin', 'sales', 'warehouse', 'accounts'), challanController.list);
router.get('/:id', authorize('admin', 'sales', 'warehouse', 'accounts'), challanController.getById);
router.get('/:id/pdf', authorize('admin', 'sales', 'warehouse', 'accounts'), challanController.downloadPdf);
router.post('/', authorize('admin', 'sales'), createValidation, challanController.create);
router.patch('/:id/confirm', authorize('admin', 'sales', 'warehouse'), challanController.confirm);
router.patch('/:id/cancel', authorize('admin', 'sales'), challanController.cancel);

module.exports = router;

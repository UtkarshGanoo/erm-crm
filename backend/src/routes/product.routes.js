const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticate, authorize } = require('../middleware/auth');

const productValidation = [
  body('product_name').trim().notEmpty().withMessage('Product name is required'),
  body('sku').trim().notEmpty().withMessage('SKU is required'),
  body('unit_price').isFloat({ min: 0 }).withMessage('Unit price must be a positive number'),
  body('min_stock_alert').optional().isInt({ min: 0 }).withMessage('Min stock alert must be a non-negative integer'),
];

const stockMovementValidation = [
  body('quantity_changed').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
  body('movement_type').isIn(['IN', 'OUT']).withMessage('movement_type must be IN or OUT'),
  body('reason').trim().notEmpty().withMessage('Reason is required'),
];

router.use(authenticate);

router.get('/', authorize('admin', 'sales', 'warehouse', 'accounts'), productController.list);
router.get('/:id', authorize('admin', 'sales', 'warehouse', 'accounts'), productController.getById);
router.get('/:id/stock-movements', authorize('admin', 'warehouse', 'accounts'), productController.getStockMovements);

router.post('/', authorize('admin', 'warehouse'), productValidation, productController.create);
router.put('/:id', authorize('admin', 'warehouse'), productValidation, productController.update);
router.post(
  '/:id/stock-movement',
  authorize('admin', 'warehouse'),
  stockMovementValidation,
  productController.addStockMovement
);

module.exports = router;

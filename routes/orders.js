// routes/orders.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { protect, optionalAuth } = require('../middleware/auth');
const {
  createOrder,
  getUserOrders,
  getOrder,
  trackOrder,
  cancelOrder,
  rateOrder
} = require('../controllers/orderController');

// Order validation
const orderValidation = [
  body('items')
    .isArray()
    .withMessage('Items must be an array')
    .notEmpty()
    .withMessage('Order must have at least one item'),
  body('items.*.product')
    .isMongoId()
    .withMessage('Invalid product ID'),
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),
  body('customerInfo.fullName')
    .trim()
    .notEmpty()
    .withMessage('Full name is required'),
  body('customerInfo.phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required'),
  body('customerInfo.address.area')
    .trim()
    .notEmpty()
    .withMessage('Area is required'),
  body('customerInfo.address.city')
    .trim()
    .notEmpty()
    .withMessage('City is required'),
  body('paymentMethod')
    .isIn(['cash', 'telebirr', 'cbe_birr', 'chapa', 'other'])
    .withMessage('Invalid payment method')
];

// Public routes
router.post('/', optionalAuth, orderValidation, createOrder);
router.get('/track/:orderNumber', trackOrder);

// Protected routes
router.get('/', protect, getUserOrders);
router.get('/:id', protect, getOrder);
router.post('/:id/cancel', protect, cancelOrder);
router.post('/:id/rate', protect, rateOrder);

module.exports = router;
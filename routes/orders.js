const express = require('express');
const router = express.Router();
const { protect, optionalAuth } = require('../middleware/auth');
const {
  createOrder,
  getUserOrders,
  getOrder,
  trackOrder,
  cancelOrder,
  rateOrder
} = require('../controllers/orderController');

// Public routes
router.post('/', optionalAuth, createOrder);
router.get('/track/:orderNumber', trackOrder);

// Protected routes
router.get('/', protect, getUserOrders);
router.get('/:id', protect, getOrder);
router.post('/:id/cancel', protect, cancelOrder);
router.post('/:id/rate', protect, rateOrder);

module.exports = router;
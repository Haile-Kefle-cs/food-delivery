const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

// Get profile
router.get('/profile', protect, async (req, res) => {
  try {
    const user = req.user;
    res.status(200).json({ success: true, user: user.toJSON() });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, message: 'Error fetching profile' });
  }
});

// Update profile
router.put('/profile', protect, async (req, res) => {
  try {
    const { fullName, phone, address } = req.body;
    const user = req.user;
    if (fullName) user.fullName = fullName;
    if (phone) user.phone = phone;
    if (address) user.address = address;
    await user.save();
    res.status(200).json({ success: true, message: 'Profile updated', user: user.toJSON() });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: 'Error updating profile' });
  }
});

// Get user orders
router.get('/orders', protect, async (req, res) => {
  try {
    const Order = require('../models/Order');
    const orders = Order.findAll({ user: req.user.id });
    res.status(200).json({ success: true, orders });
  } catch (error) {
    console.error('Get user orders error:', error);
    res.status(500).json({ success: false, message: 'Error fetching orders' });
  }
});

module.exports = router;
// controllers/orderController.js
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const emailService = require('../services/emailService');
const { validationResult } = require('express-validator');

// Create new order
exports.createOrder = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const {
      items,
      customerInfo,
      paymentMethod,
      deliveryFee,
      discount,
      coupon,
      tax,
      deliveryInstructions
    } = req.body;

    // Validate items
    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No items in order'
      });
    }

    // Process items and validate products
    const processedItems = [];
    let subtotal = 0;

    for (const item of items) {
      const product = await Product.findById(item.product);
      
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product not found: ${item.product}`
        });
      }

      if (!product.isAvailable) {
        return res.status(400).json({
          success: false,
          message: `Product is not available: ${product.name}`
        });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}`
        });
      }

      const price = product.discountPrice || product.price;
      const itemSubtotal = price * item.quantity;
      subtotal += itemSubtotal;

      processedItems.push({
        product: product._id,
        name: product.name,
        price: price,
        quantity: item.quantity,
        subtotal: itemSubtotal,
        specialInstructions: item.specialInstructions,
        image: product.image?.url
      });

      // Update stock
      product.stock -= item.quantity;
      await product.save();
    }

    // Calculate totals
    const calculatedDeliveryFee = deliveryFee || 100;
    const calculatedDiscount = discount || 0;
    const calculatedTax = tax || 0;
    const totalAmount = subtotal + calculatedDeliveryFee - calculatedDiscount + calculatedTax;

    // Create order
    const order = await Order.create({
      orderNumber: await Order.generateOrderNumber(),
      user: req.user?.id,
      items: processedItems,
      customerInfo,
      paymentMethod,
      subtotal,
      deliveryFee: calculatedDeliveryFee,
      discount: calculatedDiscount,
      coupon,
      tax: calculatedTax,
      totalAmount,
      deliveryInstructions,
      statusHistory: [{
        status: 'PENDING',
        note: 'Order created'
      }]
    });

    // Send emails
    await emailService.sendNewOrderNotification(order);
    if (customerInfo.email) {
      await emailService.sendOrderConfirmation(customerInfo.email, order);
    }

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating order',
      error: error.message
    });
  }
};

// Get user orders
exports.getUserOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const orders = await Order.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('items.product', 'name image');

    const total = await Order.countDocuments({ user: req.user.id });

    res.status(200).json({
      success: true,
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get user orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching orders',
      error: error.message
    });
  }
};

// Get single order
exports.getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('items.product', 'name image price');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user is authorized
    if (order.user?.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this order'
      });
    }

    res.status(200).json({
      success: true,
      order
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching order',
      error: error.message
    });
  }
};

// Track order
exports.trackOrder = async (req, res) => {
  try {
    const { orderNumber } = req.params;
    
    const order = await Order.findOne({ orderNumber })
      .select('orderNumber orderStatus statusHistory items totalAmount customerInfo createdAt estimatedDeliveryTime actualDeliveryTime');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Calculate progress
    const statusMap = {
      'PENDING': 20,
      'APPROVED': 40,
      'PREPARING': 60,
      'READY': 70,
      'OUT_FOR_DELIVERY': 85,
      'DELIVERED': 100,
      'REJECTED': 0,
      'CANCELLED': 0
    };

    const progress = statusMap[order.orderStatus] || 0;

    res.status(200).json({
      success: true,
      tracking: {
        orderNumber: order.orderNumber,
        status: order.orderStatus,
        progress,
        statusHistory: order.statusHistory,
        items: order.items,
        totalAmount: order.totalAmount,
        customerName: order.customerInfo.fullName,
        estimatedDeliveryTime: order.estimatedDeliveryTime,
        actualDeliveryTime: order.actualDeliveryTime
      }
    });
  } catch (error) {
    console.error('Track order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error tracking order',
      error: error.message
    });
  }
};

// Cancel order
exports.cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user is authorized
    if (order.user?.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this order'
      });
    }

    // Check if order can be cancelled
    if (['DELIVERED', 'REJECTED', 'CANCELLED'].includes(order.orderStatus)) {
      return res.status(400).json({
        success: false,
        message: `Order cannot be cancelled when status is ${order.orderStatus}`
      });
    }

    await order.changeStatus('CANCELLED', req.user.id, 'Order cancelled by user');

    // Restore stock
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: item.quantity }
      });
    }

    // Send cancellation email
    if (order.customerInfo.email) {
      await emailService.sendOrderCancellationEmail(order.customerInfo.email, order);
    }

    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully',
      order
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error cancelling order',
      error: error.message
    });
  }
};

// Rate order
exports.rateOrder = async (req, res) => {
  try {
    const { rating, review } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.user?.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to rate this order'
      });
    }

    if (order.orderStatus !== 'DELIVERED') {
      return res.status(400).json({
        success: false,
        message: 'Can only rate delivered orders'
      });
    }

    if (order.isRated) {
      return res.status(400).json({
        success: false,
        message: 'Order already rated'
      });
    }

    order.isRated = true;
    order.rating = rating;
    order.review = review;
    await order.save();

    res.status(200).json({
      success: true,
      message: 'Order rated successfully',
      order
    });
  } catch (error) {
    console.error('Rate order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error rating order',
      error: error.message
    });
  }
};
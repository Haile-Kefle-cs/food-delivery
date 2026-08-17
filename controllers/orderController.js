// controllers/orderController.js - File-based version
const Order = require('../models/Order');
const Product = require('../models/Product');
const db = require('../config/fileDatabase');

// Create new order
exports.createOrder = async (req, res) => {
  try {
    const {
      items,
      customerInfo,
      paymentMethod,
      deliveryFee,
      discount,
      tax,
      deliveryInstructions
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No items in order'
      });
    }

    const processedItems = [];
    let subtotal = 0;

    for (const item of items) {
      const product = Product.findById(item.product);
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

      const price = product.discountPrice || product.price;
      const itemSubtotal = price * item.quantity;
      subtotal += itemSubtotal;

      processedItems.push({
        product: product.id,
        name: product.name,
        price: price,
        quantity: item.quantity,
        subtotal: itemSubtotal,
        specialInstructions: item.specialInstructions || '',
        image: product.image || ''
      });

      // Update stock
      product.stock -= item.quantity;
      await product.save();
    }

    const calculatedDeliveryFee = deliveryFee || 100;
    const calculatedDiscount = discount || 0;
    const calculatedTax = tax || 0;
    const totalAmount = subtotal + calculatedDeliveryFee - calculatedDiscount + calculatedTax;

    const order = await Order.create({
      user: req.user?.id,
      items: processedItems,
      customerInfo,
      paymentMethod,
      subtotal,
      deliveryFee: calculatedDeliveryFee,
      discount: calculatedDiscount,
      tax: calculatedTax,
      totalAmount,
      deliveryInstructions
    });

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
    const orders = Order.findAll({ user: req.user.id });
    res.status(200).json({
      success: true,
      orders
    });
  } catch (error) {
    console.error('Get user orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching orders'
    });
  }
};

// Get single order
exports.getOrder = async (req, res) => {
  try {
    const order = Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.user !== req.user.id && req.user.role !== 'admin') {
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
      message: 'Error fetching order'
    });
  }
};

// Track order
exports.trackOrder = async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const order = Order.findByOrderNumber(orderNumber);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.status(200).json({
      success: true,
      tracking: {
        orderNumber: order.orderNumber,
        status: order.orderStatus,
        progress: order.progress,
        statusHistory: order.statusHistory,
        items: order.items,
        totalAmount: order.totalAmount,
        customerName: order.customerInfo?.fullName,
        estimatedDeliveryTime: order.estimatedDeliveryTime,
        actualDeliveryTime: order.actualDeliveryTime,
        createdAt: order.createdAt
      }
    });
  } catch (error) {
    console.error('Track order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error tracking order'
    });
  }
};

// Cancel order
exports.cancelOrder = async (req, res) => {
  try {
    const order = Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.user !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this order'
      });
    }

    if (['DELIVERED', 'REJECTED', 'CANCELLED'].includes(order.orderStatus)) {
      return res.status(400).json({
        success: false,
        message: `Order cannot be cancelled when status is ${order.orderStatus}`
      });
    }

    await order.changeStatus('CANCELLED', req.user.id, 'Order cancelled by user');

    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully',
      order
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error cancelling order'
    });
  }
};

// Rate order
exports.rateOrder = async (req, res) => {
  try {
    const { rating, review } = req.body;
    const order = Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.user !== req.user.id) {
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
      message: 'Error rating order'
    });
  }
};
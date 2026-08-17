// controllers/adminController.js - File-based version
const db = require('../config/fileDatabase');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Order = require('../models/Order');
const User = require('../models/User');

// ==================== DASHBOARD ====================
exports.getDashboardStats = async (req, res) => {
  try {
    const orders = db.getCollection('orders');
    const users = db.getCollection('users').filter(u => u.role === 'customer');
    const products = db.getCollection('products');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayOrders = orders.filter(o => new Date(o.createdAt) >= today);
    const pendingOrders = orders.filter(o => o.orderStatus === 'PENDING');
    const deliveredOrders = orders.filter(o => o.orderStatus === 'DELIVERED');
    const totalRevenue = deliveredOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const todayRevenue = deliveredOrders
      .filter(o => o.actualDeliveryTime && new Date(o.actualDeliveryTime) >= today)
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    const recentOrders = orders
      .slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10);

    const topProducts = [];
    const productSales = {};
    orders.filter(o => o.orderStatus !== 'REJECTED').forEach(order => {
      (order.items || []).forEach(item => {
        if (!productSales[item.product]) {
          productSales[item.product] = { name: item.name, quantity: 0, revenue: 0 };
        }
        productSales[item.product].quantity += item.quantity;
        productSales[item.product].revenue += item.subtotal || item.price * item.quantity;
      });
    });
    Object.keys(productSales).forEach(key => {
      topProducts.push({
        _id: key,
        name: productSales[key].name,
        totalQuantity: productSales[key].quantity,
        totalRevenue: productSales[key].revenue
      });
    });
    topProducts.sort((a, b) => b.totalQuantity - a.totalQuantity);

    const orderStatusDistribution = {};
    orders.forEach(o => {
      orderStatusDistribution[o.orderStatus] = (orderStatusDistribution[o.orderStatus] || 0) + 1;
    });

    // Daily sales for last 7 days
    const dailySalesData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayOrders = deliveredOrders.filter(o => {
        const od = new Date(o.actualDeliveryTime || o.createdAt);
        return od.toISOString().split('T')[0] === dateStr;
      });
      dailySalesData.push({
        _id: dateStr,
        total: dayOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0),
        orders: dayOrders.length
      });
    }

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalOrders: orders.length,
          pendingOrders: pendingOrders.length,
          todayOrders: todayOrders.length,
          totalRevenue,
          todayRevenue,
          totalUsers: users.length,
          totalProducts: products.length,
          lowStockProducts: products.filter(p => p.stock <= 10).length
        },
        recentOrders,
        topProducts: topProducts.slice(0, 5),
        orderStatusDistribution,
        dailySalesData
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ success: false, message: 'Error loading dashboard' });
  }
};

// ==================== ORDERS ====================
exports.getAllOrders = async (req, res) => {
  try {
    let orders = db.getCollection('orders');
    const { status, search } = req.query;

    if (status && status !== 'ALL') {
      orders = orders.filter(o => o.orderStatus === status);
    }
    if (search) {
      const s = search.toLowerCase();
      orders = orders.filter(o =>
        o.orderNumber.toLowerCase().includes(s) ||
        (o.customerInfo?.fullName || '').toLowerCase().includes(s) ||
        (o.customerInfo?.phone || '').toLowerCase().includes(s)
      );
    }

    orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json({
      success: true,
      orders,
      totalOrders: orders.length
    });
  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json({ success: false, message: 'Error fetching orders' });
  }
};

exports.getOrderDetails = async (req, res) => {
  try {
    const order = Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    res.status(200).json({ success: true, order });
  } catch (error) {
    console.error('Get order details error:', error);
    res.status(500).json({ success: false, message: 'Error fetching order' });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { status, note, rejectionReason } = req.body;
    const order = Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    order.orderStatus = status;
    order.statusHistory = order.statusHistory || [];
    order.statusHistory.push({
      status,
      changedAt: new Date().toISOString(),
      note: note || `Status changed to ${status}`
    });

    if (status === 'REJECTED') {
      order.rejectionReason = rejectionReason || 'Order rejected by admin';
    }
    if (status === 'DELIVERED') {
      order.actualDeliveryTime = new Date().toISOString();
      order.paymentStatus = 'paid';
    }

    await order.save();

    res.status(200).json({ success: true, message: `Order status updated to ${status}`, order });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ success: false, message: 'Error updating order status' });
  }
};

exports.bulkUpdateOrderStatus = async (req, res) => {
  try {
    const { orderIds, status, note } = req.body;
    let count = 0;
    for (const id of orderIds) {
      const order = Order.findById(id);
      if (order) {
        order.orderStatus = status;
        order.statusHistory.push({ status, changedAt: new Date().toISOString(), note: note || 'Bulk update' });
        await order.save();
        count++;
      }
    }
    res.status(200).json({ success: true, message: `Updated ${count} orders` });
  } catch (error) {
    console.error('Bulk update error:', error);
    res.status(500).json({ success: false, message: 'Error updating orders' });
  }
};

// ==================== PRODUCTS ====================
exports.getAllProducts = async (req, res) => {
  try {
    let products = db.getCollection('products');
    const { search, category, availability } = req.query;
    if (category && category !== 'ALL') products = products.filter(p => p.category === category);
    if (availability !== undefined && availability !== '') {
      products = products.filter(p => p.isAvailable === (availability === 'true'));
    }
    if (search) {
      const s = search.toLowerCase();
      products = products.filter(p => p.name.toLowerCase().includes(s) || (p.description || '').toLowerCase().includes(s));
    }
    res.status(200).json({ success: true, products, total: products.length });
  } catch (error) {
    console.error('Get all products error:', error);
    res.status(500).json({ success: false, message: 'Error fetching products' });
  }
};

exports.getProduct = async (req, res) => {
  try {
    const product = Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.status(200).json({ success: true, product });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ success: false, message: 'Error fetching product' });
  }
};

exports.createProduct = async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json({ success: true, message: 'Product created', product });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ success: false, message: 'Error creating product' });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const product = Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    Object.assign(product, req.body);
    await product.save();
    res.status(200).json({ success: true, message: 'Product updated', product });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ success: false, message: 'Error updating product' });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const product = Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    await product.delete();
    res.status(200).json({ success: true, message: 'Product deleted' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ success: false, message: 'Error deleting product' });
  }
};

exports.bulkUpdateProducts = async (req, res) => {
  try {
    const { productIds, update } = req.body;
    let count = 0;
    for (const id of productIds) {
      const product = Product.findById(id);
      if (product) {
        Object.assign(product, update);
        await product.save();
        count++;
      }
    }
    res.status(200).json({ success: true, message: `Updated ${count} products` });
  } catch (error) {
    console.error('Bulk update products error:', error);
    res.status(500).json({ success: false, message: 'Error updating products' });
  }
};

// ==================== CATEGORIES ====================
exports.getAllCategories = async (req, res) => {
  try {
    const categories = db.getCollection('categories');
    res.status(200).json({ success: true, categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ success: false, message: 'Error fetching categories' });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const category = await Category.create(req.body);
    res.status(201).json({ success: true, message: 'Category created', category });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ success: false, message: 'Error creating category' });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const category = Category.findById(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    Object.assign(category, req.body);
    await category.save();
    res.status(200).json({ success: true, message: 'Category updated', category });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ success: false, message: 'Error updating category' });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const category = Category.findById(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    await category.delete();
    res.status(200).json({ success: true, message: 'Category deleted' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ success: false, message: 'Error deleting category' });
  }
};

// ==================== CUSTOMERS ====================
exports.getAllCustomers = async (req, res) => {
  try {
    let customers = db.getCollection('users').filter(u => u.role === 'customer');
    const { search } = req.query;
    if (search) {
      const s = search.toLowerCase();
      customers = customers.filter(c =>
        (c.fullName || '').toLowerCase().includes(s) ||
        (c.email || '').toLowerCase().includes(s) ||
        (c.phone || '').toLowerCase().includes(s)
      );
    }
    // Attach order stats
    customers = customers.map(c => {
      const orders = db.getCollection('orders').filter(o => o.user === c.id);
      return {
        ...c,
        stats: {
          totalOrders: orders.length,
          totalSpent: orders.filter(o => o.orderStatus === 'DELIVERED').reduce((sum, o) => sum + (o.totalAmount || 0), 0)
        }
      };
    });
    res.status(200).json({ success: true, customers, total: customers.length });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ success: false, message: 'Error fetching customers' });
  }
};

exports.getCustomerDetails = async (req, res) => {
  try {
    const user = db.getCollection('users').find(u => u.id === req.params.id || u._id === req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Customer not found' });
    const orders = db.getCollection('orders').filter(o => o.user === user.id);
    res.status(200).json({ success: true, customer: user, orders });
  } catch (error) {
    console.error('Get customer details error:', error);
    res.status(500).json({ success: false, message: 'Error fetching customer' });
  }
};

exports.updateCustomerStatus = async (req, res) => {
  try {
    const { isActive } = req.body;
    const user = db.getCollection('users').find(u => u.id === req.params.id || u._id === req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Customer not found' });
    user.isActive = isActive !== undefined ? isActive : !user.isActive;
    await db.save('users');
    res.status(200).json({ success: true, message: 'Customer status updated', customer: user });
  } catch (error) {
    console.error('Update customer status error:', error);
    res.status(500).json({ success: false, message: 'Error updating customer' });
  }
};

// ==================== REPORTS ====================
exports.generateSalesReport = async (req, res) => {
  try {
    const orders = db.getCollection('orders').filter(o => o.orderStatus === 'DELIVERED');
    const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const totalOrders = orders.length;
    const avgOrderValue = totalOrders ? (totalRevenue / totalOrders).toFixed(2) : 0;
    const salesData = [];
    const paymentBreakdown = {};
    orders.forEach(o => {
      const dateStr = new Date(o.actualDeliveryTime || o.createdAt).toISOString().split('T')[0];
      let day = salesData.find(d => d._id === dateStr);
      if (!day) {
        day = { _id: dateStr, totalRevenue: 0, totalOrders: 0 };
        salesData.push(day);
      }
      day.totalRevenue += o.totalAmount || 0;
      day.totalOrders++;
      paymentBreakdown[o.paymentMethod] = paymentBreakdown[o.paymentMethod] || { count: 0, totalRevenue: 0 };
      paymentBreakdown[o.paymentMethod].count++;
      paymentBreakdown[o.paymentMethod].totalRevenue += o.totalAmount || 0;
    });
    salesData.sort((a, b) => a._id.localeCompare(b._id));
    res.status(200).json({
      success: true,
      data: {
        salesData,
        summary: { totalRevenue, totalOrders, averageOrderValue: avgOrderValue },
        paymentBreakdown
      }
    });
  } catch (error) {
    console.error('Generate sales report error:', error);
    res.status(500).json({ success: false, message: 'Error generating report' });
  }
};

exports.generateProductReport = async (req, res) => {
  try {
    const orders = db.getCollection('orders').filter(o => o.orderStatus !== 'REJECTED');
    const productMap = {};
    orders.forEach(o => {
      (o.items || []).forEach(item => {
        if (!productMap[item.product]) {
          productMap[item.product] = { name: item.name, totalQuantity: 0, totalRevenue: 0 };
        }
        productMap[item.product].totalQuantity += item.quantity;
        productMap[item.product].totalRevenue += item.subtotal || item.price * item.quantity;
      });
    });
    const productSales = Object.values(productMap);
    res.status(200).json({ success: true, data: { productSales } });
  } catch (error) {
    console.error('Generate product report error:', error);
    res.status(500).json({ success: false, message: 'Error generating product report' });
  }
};

exports.exportOrders = async (req, res) => {
  try {
    const orders = db.getCollection('orders');
    const csv = ['Order Number,Date,Customer,Total,Status'];
    orders.forEach(o => {
      csv.push(`${o.orderNumber},${o.createdAt},${o.customerInfo?.fullName || ''},${o.totalAmount},${o.orderStatus}`);
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=orders.csv');
    res.send(csv.join('\n'));
  } catch (error) {
    console.error('Export orders error:', error);
    res.status(500).json({ success: false, message: 'Error exporting orders' });
  }
};

// ==================== SETTINGS ====================
exports.getSettings = async (req, res) => {
  res.status(200).json({
    success: true,
    settings: {
      companyName: process.env.COMPANY_NAME || 'Food Delivery',
      companyPhone: process.env.COMPANY_PHONE || '+251912345678',
      companyAddress: process.env.COMPANY_ADDRESS || 'Debre Birhan, Ethiopia',
      baseDeliveryFee: process.env.BASE_DELIVERY_FEE || 100,
      freeDeliveryThreshold: process.env.FREE_DELIVERY_THRESHOLD || 1000
    }
  });
};

exports.updateSettings = async (req, res) => {
  res.status(200).json({ success: true, message: 'Settings updated', settings: req.body });
};
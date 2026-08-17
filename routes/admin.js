const express = require('express');
const router = express.Router();
const { adminProtect } = require('../middleware/adminAuth');
const {
  getDashboardStats,
  getAllOrders,
  getOrderDetails,
  updateOrderStatus,
  bulkUpdateOrderStatus,
  getAllProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  bulkUpdateProducts,
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getAllCustomers,
  getCustomerDetails,
  updateCustomerStatus,
  generateSalesReport,
  generateProductReport,
  exportOrders,
  getSettings,
  updateSettings
} = require('../controllers/adminController');

// All admin routes require authentication
router.use(adminProtect);

// Dashboard
router.get('/dashboard', getDashboardStats);

// Orders
router.get('/orders', getAllOrders);
router.get('/orders/export', exportOrders);
router.get('/orders/:id', getOrderDetails);
router.put('/orders/:id/status', updateOrderStatus);
router.post('/orders/bulk-update', bulkUpdateOrderStatus);

// Products
router.get('/products', getAllProducts);
router.get('/products/:id', getProduct);
router.post('/products', createProduct);
router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);
router.post('/products/bulk-update', bulkUpdateProducts);

// Categories
router.get('/categories', getAllCategories);
router.post('/categories', createCategory);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

// Customers
router.get('/customers', getAllCustomers);
router.get('/customers/:id', getCustomerDetails);
router.put('/customers/:id/status', updateCustomerStatus);

// Reports
router.get('/reports/sales', generateSalesReport);
router.get('/reports/products', generateProductReport);

// Settings
router.get('/settings', getSettings);
router.put('/settings', updateSettings);

module.exports = router;
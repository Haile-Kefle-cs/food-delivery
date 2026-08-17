const express = require('express');
const router = express.Router();
const { protect, optionalAuth } = require('../middleware/auth');
const {
  getProducts,
  getProduct,
  getProductBySlug,
  getFeaturedProducts,
  getPopularProducts,
  searchProducts,
  getProductsByCategory,
  addProductReview,
  getProductReviews,
  deleteProductReview
} = require('../controllers/productController');

// Public routes
router.get('/', getProducts);
router.get('/search', searchProducts);
router.get('/featured', getFeaturedProducts);
router.get('/popular', getPopularProducts);
router.get('/category/:categoryId', getProductsByCategory);
router.get('/slug/:slug', getProductBySlug);
router.get('/:id', getProduct);

// Review routes
router.post('/:id/reviews', protect, addProductReview);
router.get('/:id/reviews', getProductReviews);
router.delete('/:id/reviews/:reviewId', protect, deleteProductReview);

module.exports = router;
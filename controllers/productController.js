// controllers/productController.js - File-based version
const Product = require('../models/Product');
const Category = require('../models/Category');
const db = require('../config/fileDatabase');

// Get all products with filters
exports.getProducts = async (req, res) => {
  try {
    const { page = 1, limit = 12, search, category, featured, popular } = req.query;

    let products = db.getCollection('products');

    // Only show available products
    products = products.filter(p => p.isAvailable);

    if (category && category !== 'ALL') {
      products = products.filter(p => p.category === category);
    }
    if (featured === 'true') {
      products = products.filter(p => p.isFeatured);
    }
    if (popular === 'true') {
      products = products.filter(p => p.isPopular);
    }
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      products = products.filter(p =>
        searchRegex.test(p.name) || searchRegex.test(p.description || '')
      );
    }

    // Simple sort by createdAt desc
    products.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;

    const paginatedProducts = products.slice(startIndex, endIndex);

    res.status(200).json({
      success: true,
      products: paginatedProducts,
      total: products.length,
      currentPage: pageNum,
      totalPages: Math.ceil(products.length / limitNum)
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching products',
      error: error.message
    });
  }
};

// Get single product by ID
exports.getProduct = async (req, res) => {
  try {
    const product = Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.status(200).json({
      success: true,
      product
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching product',
      error: error.message
    });
  }
};

// Get product by slug
exports.getProductBySlug = async (req, res) => {
  try {
    const product = Product.findBySlug(req.params.slug);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.status(200).json({
      success: true,
      product
    });
  } catch (error) {
    console.error('Get product by slug error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching product',
      error: error.message
    });
  }
};

// Get featured products
exports.getFeaturedProducts = async (req, res) => {
  try {
    const products = db.getCollection('products')
      .filter(p => p.isFeatured && p.isAvailable)
      .slice(0, 8);

    res.status(200).json({
      success: true,
      products
    });
  } catch (error) {
    console.error('Get featured products error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching featured products',
      error: error.message
    });
  }
};

// Get popular products
exports.getPopularProducts = async (req, res) => {
  try {
    const products = db.getCollection('products')
      .filter(p => p.isPopular && p.isAvailable)
      .slice(0, 8);

    res.status(200).json({
      success: true,
      products
    });
  } catch (error) {
    console.error('Get popular products error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching popular products',
      error: error.message
    });
  }
};

// Search products
exports.searchProducts = async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q || q.length < 2) {
      return res.status(200).json({
        success: true,
        products: []
      });
    }

    const searchRegex = new RegExp(q, 'i');
    const products = db.getCollection('products')
      .filter(p => p.isAvailable)
      .filter(p =>
        searchRegex.test(p.name) ||
        searchRegex.test(p.description || '') ||
        (p.tags && p.tags.some(tag => searchRegex.test(tag)))
      )
      .slice(0, parseInt(limit));

    res.status(200).json({
      success: true,
      products
    });
  } catch (error) {
    console.error('Search products error:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching products',
      error: error.message
    });
  }
};

// Get products by category
exports.getProductsByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { page = 1, limit = 12 } = req.query;

    const category = Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    let products = db.getCollection('products')
      .filter(p => p.category === categoryId && p.isAvailable);

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;

    const paginatedProducts = products.slice(startIndex, endIndex);

    res.status(200).json({
      success: true,
      category,
      products: paginatedProducts,
      total: products.length,
      currentPage: pageNum,
      totalPages: Math.ceil(products.length / limitNum)
    });
  } catch (error) {
    console.error('Get products by category error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching products',
      error: error.message
    });
  }
};

// Add product review
exports.addProductReview = async (req, res) => {
  try {
    const { rating, review } = req.body;
    const product = Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const existingReview = (product.ratings || []).find(
      r => r.user === req.user.id
    );

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this product'
      });
    }

    product.ratings = product.ratings || [];
    product.ratings.push({
      user: req.user.id,
      rating,
      review: review || ''
    });

    product.calculateAverageRating();
    await product.save();

    res.status(201).json({
      success: true,
      message: 'Review added successfully',
      product
    });
  } catch (error) {
    console.error('Add product review error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding review',
      error: error.message
    });
  }
};

// Get product reviews
exports.getProductReviews = async (req, res) => {
  try {
    const product = Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.status(200).json({
      success: true,
      reviews: product.ratings || [],
      averageRating: product.averageRating || 0,
      numReviews: product.numReviews || 0
    });
  } catch (error) {
    console.error('Get product reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching reviews',
      error: error.message
    });
  }
};

// Delete product review
exports.deleteProductReview = async (req, res) => {
  try {
    const { id, reviewId } = req.params;
    const product = Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const reviewIndex = (product.ratings || []).findIndex(r => r.id === reviewId);
    if (reviewIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    const review = product.ratings[reviewIndex];
    if (review.user !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this review'
      });
    }

    product.ratings.splice(reviewIndex, 1);
    product.calculateAverageRating();
    await product.save();

    res.status(200).json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    console.error('Delete product review error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting review',
      error: error.message
    });
  }
};
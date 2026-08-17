// controllers/productController.js
const Product = require('../models/Product');
const db = require('../config/fileDatabase');

// Get all products
exports.getProducts = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, category, featured, popular } = req.query;
    
    let products = db.getCollection('products');
    
    // Filter
    if (category) {
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
        searchRegex.test(p.name) || searchRegex.test(p.description)
      );
    }
    
    // Only show available products
    products = products.filter(p => p.isAvailable);
    
    // Pagination
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
      message: 'Error fetching products'
    });
  }
};

// Get single product
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
      message: 'Error fetching product'
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
      message: 'Error fetching featured products'
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
      message: 'Error fetching popular products'
    });
  }
};
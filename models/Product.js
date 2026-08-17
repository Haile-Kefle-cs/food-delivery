// models/Product.js - File-based version
const crypto = require('crypto');
const db = require('../config/fileDatabase');

class Product {
  constructor(data) {
    Object.assign(this, data);
  }

  static async create(productData) {
    const products = db.getCollection('products');

    const product = {
      id: crypto.randomUUID(),
      name: productData.name,
      slug: productData.name.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'),
      description: productData.description || '',
      price: productData.price,
      discountPrice: productData.discountPrice || null,
      category: productData.category || '',
      image: productData.image || '',
      ingredients: productData.ingredients || [],
      allergens: productData.allergens || [],
      preparationTime: productData.preparationTime || 15,
      servingSize: productData.servingSize || '',
      calories: productData.calories || null,
      isVegetarian: productData.isVegetarian || false,
      isVegan: productData.isVegan || false,
      isGlutenFree: productData.isGlutenFree || false,
      isAvailable: productData.isAvailable !== undefined ? productData.isAvailable : true,
      isFeatured: productData.isFeatured || false,
      isPopular: productData.isPopular || false,
      stock: productData.stock || 100,
      ratings: [],
      averageRating: 0,
      numReviews: 0,
      tags: productData.tags || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await db.addToCollection('products', product);
    return new Product(product);
  }

  static findById(id) {
    const product = db.findInCollection('products', p =>
      p.id === id || p._id === id
    );
    return product ? new Product(product) : null;
  }

  static findBySlug(slug) {
    const product = db.findInCollection('products', p => p.slug === slug);
    return product ? new Product(product) : null;
  }

  static findAll(filter = {}) {
    let products = db.getCollection('products');

    if (filter.isAvailable !== undefined) {
      products = products.filter(p => p.isAvailable === filter.isAvailable);
    }
    if (filter.isFeatured) {
      products = products.filter(p => p.isFeatured);
    }
    if (filter.isPopular) {
      products = products.filter(p => p.isPopular);
    }
    if (filter.category) {
      products = products.filter(p => p.category === filter.category);
    }
    if (filter.search) {
      const searchRegex = new RegExp(filter.search, 'i');
      products = products.filter(p =>
        searchRegex.test(p.name) || searchRegex.test(p.description || '')
      );
    }
    // Sort by createdAt descending by default
    products.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return products.map(p => new Product(p));
  }

  // Compatibility method for controllers that use Product.find()
  static find(filter = {}) {
    let products = db.getCollection('products');
    if (filter.isAvailable !== undefined) products = products.filter(p => p.isAvailable === filter.isAvailable);
    if (filter.isFeatured) products = products.filter(p => p.isFeatured);
    if (filter.isPopular) products = products.filter(p => p.isPopular);
    if (filter.category) products = products.filter(p => p.category === filter.category);
    if (filter._id) products = products.filter(p => p.id === filter._id || p._id === filter._id);
    return products;
  }

  static countDocuments(filter = {}) {
    let products = db.getCollection('products');
    if (filter.isAvailable !== undefined) products = products.filter(p => p.isAvailable === filter.isAvailable);
    if (filter.category) products = products.filter(p => p.category === filter.category);
    return products.length;
  }

  async save() {
    const products = db.getCollection('products');
    const index = products.findIndex(p => p.id === this.id);
    if (index !== -1) {
      products[index] = { ...products[index], ...this, updatedAt: new Date().toISOString() };
      await db.save('products');
      return this;
    }
    return null;
  }

  async delete() {
    return await db.removeFromCollection('products', this.id);
  }

  get hasDiscount() {
    return this.discountPrice && this.discountPrice < this.price;
  }

  get discountPercentage() {
    if (!this.hasDiscount) return 0;
    return Math.round(((this.price - this.discountPrice) / this.price) * 100);
  }

  get currentPrice() {
    return this.hasDiscount ? this.discountPrice : this.price;
  }

  calculateAverageRating() {
    if (!this.ratings || this.ratings.length === 0) {
      this.averageRating = 0;
      this.numReviews = 0;
      return;
    }
    const totalRating = this.ratings.reduce((sum, item) => sum + (item.rating || 0), 0);
    this.averageRating = totalRating / this.ratings.length;
    this.numReviews = this.ratings.length;
  }
}

module.exports = Product;
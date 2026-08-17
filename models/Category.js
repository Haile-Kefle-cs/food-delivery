// models/Category.js - File-based version
const crypto = require('crypto');
const db = require('../config/fileDatabase');

class Category {
  constructor(data) {
    Object.assign(this, data);
  }

  static async create(categoryData) {
    const categories = db.getCollection('categories');

    const category = {
      id: crypto.randomUUID(),
      name: categoryData.name,
      slug: categoryData.name.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'),
      description: categoryData.description || '',
      icon: categoryData.icon || '🍽️',
      image: categoryData.image || '',
      mealType: categoryData.mealType || 'other',
      isActive: categoryData.isActive !== undefined ? categoryData.isActive : true,
      displayOrder: categoryData.displayOrder || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await db.addToCollection('categories', category);
    return new Category(category);
  }

  static findById(id) {
    const category = db.findInCollection('categories', c =>
      c.id === id || c._id === id
    );
    return category ? new Category(category) : null;
  }

  static findOne(query) {
    let categories = db.getCollection('categories');
    if (query.name) {
      categories = categories.filter(c => c.name.toLowerCase() === query.name.toLowerCase());
    }
    if (query.slug) {
      categories = categories.filter(c => c.slug === query.slug);
    }
    return categories[0] ? new Category(categories[0]) : null;
  }

  static findAll(filter = {}) {
    let categories = db.getCollection('categories');
    if (filter.isActive !== undefined) {
      categories = categories.filter(c => c.isActive === filter.isActive);
    }
    categories.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    return categories.map(c => new Category(c));
  }

  static find(filter = {}) {
    let categories = db.getCollection('categories');
    if (filter.isActive !== undefined) categories = categories.filter(c => c.isActive === filter.isActive);
    if (filter._id) categories = categories.filter(c => c.id === filter._id || c._id === filter._id);
    return categories;
  }

  static countDocuments(filter = {}) {
    let categories = db.getCollection('categories');
    if (filter.isActive !== undefined) categories = categories.filter(c => c.isActive === filter.isActive);
    return categories.length;
  }

  async save() {
    const categories = db.getCollection('categories');
    const index = categories.findIndex(c => c.id === this.id);
    if (index !== -1) {
      categories[index] = { ...categories[index], ...this, updatedAt: new Date().toISOString() };
      await db.save('categories');
      return this;
    }
    return null;
  }

  async delete() {
    return await db.removeFromCollection('categories', this.id);
  }
}

module.exports = Category;
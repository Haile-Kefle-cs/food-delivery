// config/fileDatabase.js
const fs = require('fs-extra');
const path = require('path');

class FileDatabase {
  constructor() {
    this.dataDir = path.join(__dirname, '..', 'data');
    this.files = {
      users: path.join(this.dataDir, 'users.json'),
      products: path.join(this.dataDir, 'products.json'),
      categories: path.join(this.dataDir, 'categories.json'),
      orders: path.join(this.dataDir, 'orders.json')
    };
    this.data = {};
  }

  async init() {
    try {
      await fs.ensureDir(this.dataDir);
      for (const [key, filePath] of Object.entries(this.files)) {
        if (!await fs.pathExists(filePath)) {
          await fs.writeJson(filePath, [], { spaces: 2 });
        }
        this.data[key] = await fs.readJson(filePath);
      }
      await this.seedIfEmpty();
      console.log('File database initialized successfully');
    } catch (error) {
      console.error('Database initialization error:', error);
      throw error;
    }
  }

  async seedIfEmpty() {
    try {
      if (this.data.categories.length === 0) {
        this.data.categories = [
          { id: 'cat1', name: 'Breakfast', icon: '🍳', slug: 'breakfast', isActive: true, displayOrder: 1 },
          { id: 'cat2', name: 'Lunch', icon: '🍽️', slug: 'lunch', isActive: true, displayOrder: 2 },
          { id: 'cat3', name: 'Dinner', icon: '🌙', slug: 'dinner', isActive: true, displayOrder: 3 },
          { id: 'cat4', name: 'Fast Food', icon: '🍔', slug: 'fast-food', isActive: true, displayOrder: 4 },
          { id: 'cat5', name: 'Pizza', icon: '🍕', slug: 'pizza', isActive: true, displayOrder: 5 },
          { id: 'cat6', name: 'Burger', icon: '🍔', slug: 'burger', isActive: true, displayOrder: 6 },
          { id: 'cat7', name: 'Chicken', icon: '🍗', slug: 'chicken', isActive: true, displayOrder: 7 },
          { id: 'cat8', name: 'Drinks', icon: '🥤', slug: 'drinks', isActive: true, displayOrder: 8 },
          { id: 'cat9', name: 'Desserts', icon: '🍰', slug: 'desserts', isActive: true, displayOrder: 9 }
        ];
        await this.save('categories');
      }

      if (this.data.users.length === 0) {
        const bcrypt = require('bcryptjs');
        const adminPassword = await bcrypt.hash('admin123', 12);
        const customerPassword = await bcrypt.hash('customer123', 12);
        this.data.users = [
          {
            id: 'admin1',
            fullName: 'Admin User',
            email: 'admin@fooddelivery.com',
            phone: '+251911234567',
            password: adminPassword,
            role: 'admin',
            isActive: true,
            createdAt: new Date().toISOString()
          },
          {
            id: 'user1',
            fullName: 'Test Customer',
            email: 'customer@fooddelivery.com',
            phone: '+251922345678',
            password: customerPassword,
            role: 'customer',
            isActive: true,
            createdAt: new Date().toISOString()
          }
        ];
        await this.save('users');
        console.log('Default users created: admin@fooddelivery.com / admin123');
      }

      if (this.data.products.length === 0) {
        this.data.products = [
          {
            id: 'prod1', name: 'Classic Burger', slug: 'classic-burger',
            description: 'Juicy beef patty with lettuce, tomato, and special sauce',
            price: 250, discountPrice: 200, category: 'cat6',
            image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400',
            isAvailable: true, isFeatured: true, isPopular: true, stock: 100,
            preparationTime: 15, averageRating: 4.5, numReviews: 120
          },
          {
            id: 'prod2', name: 'Margherita Pizza', slug: 'margherita-pizza',
            description: 'Classic tomato sauce, mozzarella, and fresh basil',
            price: 450, discountPrice: null, category: 'cat5',
            image: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=400',
            isAvailable: true, isFeatured: true, isPopular: true, stock: 50,
            preparationTime: 20, averageRating: 4.8, numReviews: 200
          },
          {
            id: 'prod3', name: 'Fried Chicken', slug: 'fried-chicken',
            description: 'Crispy fried chicken with secret spices',
            price: 350, discountPrice: 300, category: 'cat7',
            image: 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=400',
            isAvailable: true, isPopular: true, stock: 80,
            preparationTime: 25, averageRating: 4.6, numReviews: 150
          }
        ];
        await this.save('products');
      }

      if (this.data.orders.length === 0) {
        this.data.orders = [];
        await this.save('orders');
      }
    } catch (error) {
      console.error('Seed error:', error);
    }
  }

  async save(collection) {
    try {
      await fs.writeJson(this.files[collection], this.data[collection], { spaces: 2 });
    } catch (error) {
      console.error(`Error saving ${collection}:`, error);
      throw error;
    }
  }

  getCollection(collection) {
    return this.data[collection] || [];
  }

  async addToCollection(collection, item) {
    this.data[collection].push(item);
    await this.save(collection);
    return item;
  }

  async updateInCollection(collection, id, updates) {
    const index = this.data[collection].findIndex(item => item.id === id || item._id === id);
    if (index !== -1) {
      this.data[collection][index] = { ...this.data[collection][index], ...updates };
      await this.save(collection);
      return this.data[collection][index];
    }
    return null;
  }

  async removeFromCollection(collection, id) {
    const index = this.data[collection].findIndex(item => item.id === id || item._id === id);
    if (index !== -1) {
      const removed = this.data[collection].splice(index, 1)[0];
      await this.save(collection);
      return removed;
    }
    return null;
  }

  findInCollection(collection, predicate) {
    return this.data[collection].find(predicate);
  }

  filterCollection(collection, predicate) {
    return this.data[collection].filter(predicate);
  }
}

module.exports = new FileDatabase();
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
      // Create data directory if it doesn't exist
      await fs.ensureDir(this.dataDir);
      
      // Initialize all data files
      for (const [key, filePath] of Object.entries(this.files)) {
        if (!await fs.pathExists(filePath)) {
          await fs.writeJson(filePath, [], { spaces: 2 });
        }
        this.data[key] = await fs.readJson(filePath);
      }
      
      // Seed data if empty
      await this.seedIfEmpty();
      
      console.log('File database initialized successfully');
    } catch (error) {
      console.error('Database initialization error:', error);
      throw error;
    }
  }

  async seedIfEmpty() {
    try {
      // Seed categories if empty
      if (this.data.categories.length === 0) {
        const categories = [
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
        this.data.categories = categories;
        await this.save('categories');
      }

      // Seed products if empty
      if (this.data.products.length === 0) {
        const products = [
          {
            id: 'prod1',
            name: 'Classic Burger',
            description: 'Juicy beef patty with lettuce, tomato, and special sauce',
            price: 250,
            discountPrice: 200,
            category: 'cat6',
            image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd',
            isAvailable: true,
            isFeatured: true,
            isPopular: true,
            stock: 100,
            preparationTime: 15,
            averageRating: 4.5,
            numReviews: 120
          },
          {
            id: 'prod2',
            name: 'Margherita Pizza',
            description: 'Classic tomato sauce, mozzarella, and fresh basil',
            price: 450,
            category: 'cat5',
            image: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3',
            isAvailable: true,
            isFeatured: true,
            isPopular: true,
            stock: 50,
            preparationTime: 20,
            averageRating: 4.8,
            numReviews: 200
          },
          {
            id: 'prod3',
            name: 'Fried Chicken',
            description: 'Crispy fried chicken with secret spices',
            price: 350,
            discountPrice: 300,
            category: 'cat7',
            image: 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58',
            isAvailable: true,
            isPopular: true,
            stock: 80,
            preparationTime: 25,
            averageRating: 4.6,
            numReviews: 150
          },
          {
            id: 'prod4',
            name: 'Fresh Orange Juice',
            description: 'Freshly squeezed orange juice',
            price: 80,
            category: 'cat8',
            image: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba',
            isAvailable: true,
            stock: 200,
            preparationTime: 5,
            averageRating: 4.3,
            numReviews: 80
          },
          {
            id: 'prod5',
            name: 'Chocolate Cake',
            description: 'Rich chocolate cake with cream',
            price: 180,
            category: 'cat9',
            image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587',
            isAvailable: true,
            isFeatured: true,
            stock: 40,
            preparationTime: 10,
            averageRating: 4.7,
            numReviews: 90
          },
          {
            id: 'prod6',
            name: 'Full Breakfast',
            description: 'Eggs, toast, beans, and sausage',
            price: 220,
            category: 'cat1',
            image: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666',
            isAvailable: true,
            stock: 60,
            preparationTime: 15,
            averageRating: 4.4,
            numReviews: 70
          }
        ];
        this.data.products = products;
        await this.save('products');
      }

      // Create admin user if no users exist
      if (this.data.users.length === 0) {
        const bcrypt = require('bcryptjs');
        const adminPassword = await bcrypt.hash('admin123', 12);
        
        const users = [
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
            password: await bcrypt.hash('customer123', 12),
            role: 'customer',
            isActive: true,
            createdAt: new Date().toISOString()
          }
        ];
        this.data.users = users;
        await this.save('users');
        console.log('Default users created: admin@fooddelivery.com / admin123');
      }
    } catch (error) {
      console.error('Seed error:', error);
    }
  }

  async save(collection) {
    try {
      const filePath = this.files[collection];
      await fs.writeJson(filePath, this.data[collection], { spaces: 2 });
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
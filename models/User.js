// models/User.js - File-based version
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../config/fileDatabase');

class User {
  constructor(data) {
    Object.assign(this, data);
  }

  static async create(userData) {
    const users = db.getCollection('users');
    
    // Check if user exists
    const existingUser = users.find(u => 
      u.email === userData.email || u.phone === userData.phone
    );
    
    if (existingUser) {
      throw new Error('User with this email or phone already exists');
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(userData.password, salt);
    
    const user = {
      id: crypto.randomUUID(),
      fullName: userData.fullName,
      email: userData.email.toLowerCase(),
      phone: userData.phone,
      password: hashedPassword,
      role: userData.role || 'customer',
      address: userData.address || {},
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await db.addToCollection('users', user);
    
    // Remove password from returned user
    const { password, ...userWithoutPassword } = user;
    return new User(userWithoutPassword);
  }

  static findByEmail(email) {
    const user = db.findInCollection('users', u => 
      u.email === email.toLowerCase()
    );
    return user ? new User(user) : null;
  }

  static findById(id) {
    const user = db.findInCollection('users', u => u.id === id);
    return user ? new User(user) : null;
  }

  static findByPhone(phone) {
    const user = db.findInCollection('users', u => u.phone === phone);
    return user ? new User(user) : null;
  }

  async comparePassword(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
  }

  generateAuthToken() {
    return jwt.sign(
      { 
        id: this.id,
        email: this.email,
        role: this.role 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: process.env.JWT_EXPIRE || '30d' }
    );
  }

  generateResetPasswordToken() {
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    this.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
      
    this.resetPasswordExpire = Date.now() + 30 * 60 * 1000;
    
    return resetToken;
  }

  async save() {
    const users = db.getCollection('users');
    const index = users.findIndex(u => u.id === this.id);
    if (index !== -1) {
      users[index] = { ...users[index], ...this };
      await db.save('users');
      return this;
    }
    return null;
  }

  isAdmin() {
    return this.role === 'admin';
  }

  toJSON() {
    const { password, ...userWithoutPassword } = this;
    return userWithoutPassword;
  }
}

module.exports = User;
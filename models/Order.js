// models/Order.js - File-based version
const crypto = require('crypto');
const db = require('../config/fileDatabase');

class Order {
  constructor(data) {
    Object.assign(this, data);
  }

  static generateOrderNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = crypto.randomBytes(2).toString('hex').toUpperCase();
    return `ORD-${year}${month}${day}-${random}`;
  }

  static async create(orderData) {
    const orders = db.getCollection('orders');

    const order = {
      id: crypto.randomUUID(),
      orderNumber: Order.generateOrderNumber(),
      user: orderData.user,
      items: orderData.items,
      customerInfo: orderData.customerInfo,
      paymentMethod: orderData.paymentMethod || 'cash',
      paymentStatus: orderData.paymentMethod === 'cash' ? 'paid' : 'pending',
      orderStatus: 'PENDING',
      statusHistory: [{
        status: 'PENDING',
        changedAt: new Date().toISOString(),
        note: 'Order created'
      }],
      subtotal: orderData.subtotal,
      deliveryFee: orderData.deliveryFee || 100,
      discount: orderData.discount || 0,
      tax: orderData.tax || 0,
      totalAmount: orderData.totalAmount,
      deliveryInstructions: orderData.deliveryInstructions,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await db.addToCollection('orders', order);
    return new Order(order);
  }

  static findById(id) {
    const order = db.findInCollection('orders', o =>
      o.id === id || o._id === id
    );
    return order ? new Order(order) : null;
  }

  static findByOrderNumber(orderNumber) {
    const order = db.findInCollection('orders', o =>
      o.orderNumber === orderNumber
    );
    return order ? new Order(order) : null;
  }

  static findAll(filter = {}) {
    let orders = db.getCollection('orders');

    if (filter.user) {
      orders = orders.filter(o => o.user === filter.user);
    }
    if (filter.status) {
      orders = orders.filter(o => o.orderStatus === filter.status);
    }
    // Basic sorting by createdAt descending
    orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return orders.map(o => new Order(o));
  }

  static find(filter = {}) {
    // Compatibility method for controllers that use Order.find()
    let orders = db.getCollection('orders');
    if (filter.user) orders = orders.filter(o => o.user === filter.user);
    if (filter.orderStatus) orders = orders.filter(o => o.orderStatus === filter.orderStatus);
    return orders;
  }

  async save() {
    const orders = db.getCollection('orders');
    const index = orders.findIndex(o => o.id === this.id);
    if (index !== -1) {
      orders[index] = { ...orders[index], ...this, updatedAt: new Date().toISOString() };
      await db.save('orders');
      return this;
    }
    return null;
  }

  async changeStatus(newStatus, user, note) {
    this.orderStatus = newStatus;
    this.statusHistory.push({
      status: newStatus,
      changedBy: user,
      changedAt: new Date().toISOString(),
      note: note || `Status changed to ${newStatus}`
    });

    if (newStatus === 'DELIVERED') {
      this.actualDeliveryTime = new Date().toISOString();
      this.paymentStatus = 'paid';
    }

    return await this.save();
  }

  get progress() {
    const statusMap = {
      'PENDING': 20,
      'APPROVED': 40,
      'PREPARING': 60,
      'READY': 70,
      'OUT_FOR_DELIVERY': 85,
      'DELIVERED': 100,
      'REJECTED': 0,
      'CANCELLED': 0
    };
    return statusMap[this.orderStatus] || 0;
  }
}

module.exports = Order;
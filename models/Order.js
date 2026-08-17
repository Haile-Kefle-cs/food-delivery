// models/Order.js
const mongoose = require('mongoose');
const crypto = require('crypto');

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    name: String,
    price: Number,
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1']
    },
    subtotal: Number,
    specialInstructions: String,
    image: String
  }],
  customerInfo: {
    fullName: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    },
    email: String,
    address: {
      city: {
        type: String,
        default: 'Debre Birhan'
      },
      area: {
        type: String,
        required: true
      },
      street: String,
      details: String,
      latitude: Number,
      longitude: Number
    }
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'telebirr', 'cbe_birr', 'chapa', 'other'],
    default: 'cash'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentDetails: {
    transactionId: String,
    paidAt: Date,
    refundId: String,
    refundedAt: Date
  },
  orderStatus: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'REJECTED', 'CANCELLED'],
    default: 'PENDING'
  },
  statusHistory: [{
    status: String,
    changedAt: {
      type: Date,
      default: Date.now
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    note: String
  }],
  subtotal: {
    type: Number,
    required: true
  },
  deliveryFee: {
    type: Number,
    required: true,
    default: 100
  },
  discount: {
    type: Number,
    default: 0
  },
  coupon: {
    code: String,
    discountAmount: Number
  },
  tax: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    required: true
  },
  deliveryInstructions: String,
  estimatedDeliveryTime: Date,
  actualDeliveryTime: Date,
  rejectionReason: String,
  isRated: {
    type: Boolean,
    default: false
  },
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  review: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Generate unique order number
orderSchema.statics.generateOrderNumber = function() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `ORD-${year}${month}${day}-${random}`;
};

// Calculate totals before saving
orderSchema.pre('save', function(next) {
  // Calculate item subtotals
  this.items.forEach(item => {
    item.subtotal = item.price * item.quantity;
  });
  
  // Calculate order subtotal
  this.subtotal = this.items.reduce((sum, item) => sum + item.subtotal, 0);
  
  // Calculate total
  this.totalAmount = this.subtotal + this.deliveryFee - this.discount + this.tax;
  
  next();
});

// Add status change method
orderSchema.methods.changeStatus = function(newStatus, user, note) {
  this.orderStatus = newStatus;
  this.statusHistory.push({
    status: newStatus,
    changedBy: user?._id || user,
    note: note
  });
  
  if (newStatus === 'DELIVERED') {
    this.actualDeliveryTime = new Date();
  }
  
  return this.save();
};

// Virtual for tracking percentage
orderSchema.virtual('progress').get(function() {
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
});

module.exports = mongoose.model('Order', orderSchema);
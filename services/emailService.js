// services/emailService.js
const nodemailer = require('nodemailer');

let transporter = null;

// Create transporter only if email credentials are present
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
}

/**
 * Send an email (non‑blocking)
 */
async function sendMail(to, subject, html) {
  if (!transporter) {
    console.log('📧 Email service not configured. Skipping email.');
    return;
  }

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject,
      html
    });
    console.log(`✅ Email sent to ${to}: ${subject}`);
  } catch (error) {
    console.error('❌ Email send error:', error.message);
  }
}

/**
 * Send new order notification to admin
 */
exports.sendNewOrderNotification = async (order) => {
  const subject = `NEW FOOD ORDER - ${order.orderNumber}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
      <h2 style="color: #ff6b35;">🍔 New Order Received</h2>
      <p><strong>Order Number:</strong> ${order.orderNumber}</p>
      <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleString()}</p>
      <hr>
      <h3>Customer Information</h3>
      <p><strong>Name:</strong> ${order.customerInfo?.fullName || 'N/A'}</p>
      <p><strong>Phone:</strong> ${order.customerInfo?.phone || 'N/A'}</p>
      <p><strong>Email:</strong> ${order.customerInfo?.email || 'N/A'}</p>
      <p><strong>Address:</strong> ${order.customerInfo?.address?.area}, ${order.customerInfo?.address?.city}</p>
      <hr>
      <h3>Items</h3>
      <ul>
        ${order.items.map(item => `
          <li>${item.quantity} × ${item.name} = ${item.subtotal} ETB</li>
        `).join('')}
      </ul>
      <hr>
      <p><strong>Subtotal:</strong> ${order.subtotal} ETB</p>
      <p><strong>Delivery Fee:</strong> ${order.deliveryFee} ETB</p>
      <p><strong>Total:</strong> ${order.totalAmount} ETB</p>
      <p><strong>Payment Method:</strong> ${order.paymentMethod}</p>
      <hr>
      <p style="color: #666;">This is an automated notification from ${process.env.COMPANY_NAME || 'Food Delivery'}.</p>
    </div>
  `;

  await sendMail(process.env.ADMIN_EMAIL, subject, html);
};

/**
 * Send order confirmation to customer
 */
exports.sendOrderConfirmation = async (email, order) => {
  const subject = `Order Confirmation - ${order.orderNumber}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
      <h2 style="color: #4caf50;">✅ Order Received!</h2>
      <p>Dear ${order.customerInfo?.fullName},</p>
      <p>Thank you for your order. Here are your order details:</p>
      <p><strong>Order Number:</strong> ${order.orderNumber}</p>
      <p><strong>Total Amount:</strong> ${order.totalAmount} ETB</p>
      <hr>
      <h3>Items</h3>
      <ul>
        ${order.items.map(item => `
          <li>${item.quantity} × ${item.name} = ${item.subtotal} ETB</li>
        `).join('')}
      </ul>
      <hr>
      <p>We will notify you when your order status changes.</p>
      <p>You can track your order <a href="${process.env.WEBSITE_URL || 'http://localhost:3000'}/tracking.html?order=${order.orderNumber}">here</a>.</p>
      <br>
      <p>Thank you for choosing ${process.env.COMPANY_NAME || 'Food Delivery'}!</p>
    </div>
  `;

  await sendMail(email, subject, html);
};

/**
 * Send order status update to customer
 */
exports.sendOrderStatusUpdate = async (email, order, status) => {
  const statusEmojis = {
    PENDING: '🕐',
    APPROVED: '👍',
    PREPARING: '👨‍🍳',
    READY: '📦',
    OUT_FOR_DELIVERY: '🛵',
    DELIVERED: '🎉',
    REJECTED: '❌',
    CANCELLED: '🚫'
  };

  const subject = `${statusEmojis[status] || '📝'} Order ${status} - ${order.orderNumber}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
      <h2 style="color: #2196f3;">Order Status Update</h2>
      <p>Your order <strong>${order.orderNumber}</strong> has been updated.</p>
      <p><strong>New Status:</strong> ${status}</p>
      <p>Thank you for your patience.</p>
    </div>
  `;

  await sendMail(email, subject, html);
};

/**
 * Send welcome email to new user
 */
exports.sendWelcomeEmail = async (email, name) => {
  const subject = 'Welcome to Food Delivery! 🎉';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
      <h2 style="color: #ff6b35;">Welcome, ${name}!</h2>
      <p>Thank you for registering with ${process.env.COMPANY_NAME || 'Food Delivery'}.</p>
      <p>We are excited to serve you delicious food!</p>
      <p>Start exploring our menu and place your first order.</p>
    </div>
  `;
  await sendMail(email, subject, html);
};

/**
 * Send password reset email
 */
exports.sendPasswordResetEmail = async (email, resetUrl) => {
  const subject = 'Password Reset Request';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
      <h2>Password Reset</h2>
      <p>You requested to reset your password.</p>
      <p>Click <a href="${resetUrl}">here</a> to set a new password.</p>
      <p>This link will expire in 30 minutes.</p>
      <p>If you did not request this, please ignore this email.</p>
    </div>
  `;
  await sendMail(email, subject, html);
};

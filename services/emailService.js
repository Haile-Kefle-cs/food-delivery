// services/emailService.js
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Email templates
const emailTemplates = {
  newOrder: (order) => ({
    subject: `NEW FOOD ORDER - ${order.orderNumber}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #ff6b35; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .order-info { margin: 20px 0; }
          .items-table { width: 100%; border-collapse: collapse; }
          .items-table th, .items-table td { padding: 10px; border-bottom: 1px solid #ddd; }
          .total { font-size: 20px; font-weight: bold; color: #ff6b35; }
          .footer { margin-top: 30px; text-align: center; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🍔 New Food Order</h1>
          </div>
          <div class="content">
            <h2>Order: ${order.orderNumber}</h2>
            <div class="order-info">
              <p><strong>Customer:</strong> ${order.customerInfo.fullName}</p>
              <p><strong>Phone:</strong> ${order.customerInfo.phone}</p>
              <p><strong>Email:</strong> ${order.customerInfo.email || 'N/A'}</p>
              <p><strong>Delivery Address:</strong> ${order.customerInfo.address.area}, ${order.customerInfo.address.city}</p>
              ${order.customerInfo.address.details ? `<p><strong>Details:</strong> ${order.customerInfo.address.details}</p>` : ''}
              ${order.deliveryInstructions ? `<p><strong>Instructions:</strong> ${order.deliveryInstructions}</p>` : ''}
            </div>
            
            <h3>Items:</h3>
            <table class="items-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${order.items.map(item => `
                  <tr>
                    <td>${item.name}</td>
                    <td>${item.quantity}</td>
                    <td>${item.price} ETB</td>
                    <td>${item.subtotal} ETB</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            
            <div style="margin-top: 20px;">
              <p><strong>Subtotal:</strong> ${order.subtotal} ETB</p>
              <p><strong>Delivery Fee:</strong> ${order.deliveryFee} ETB</p>
              ${order.discount > 0 ? `<p><strong>Discount:</strong> -${order.discount} ETB</p>` : ''}
              ${order.tax > 0 ? `<p><strong>Tax:</strong> ${order.tax} ETB</p>` : ''}
              <p class="total">TOTAL: ${order.totalAmount} ETB</p>
            </div>
            
            <p><strong>Payment Method:</strong> ${order.paymentMethod}</p>
            <p><strong>Status:</strong> ${order.orderStatus}</p>
          </div>
          <div class="footer">
            <p>This is an automated notification from ${process.env.COMPANY_NAME}</p>
          </div>
        </div>
      </body>
      </html>
    `
  }),
  
  orderConfirmation: (order) => ({
    subject: `Order Confirmation - ${order.orderNumber}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .tracking-link { 
            display: inline-block; 
            padding: 10px 20px; 
            background: #4CAF50; 
            color: white; 
            text-decoration: none; 
            border-radius: 5px; 
            margin: 20px 0; 
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Order Received</h1>
          </div>
          <div class="content">
            <h2>Thank you for your order!</h2>
            <p>Your order <strong>${order.orderNumber}</strong> has been received and is pending confirmation.</p>
            
            <h3>Order Summary:</h3>
            ${order.items.map(item => `
              <p>${item.quantity} × ${item.name} - ${item.subtotal} ETB</p>
            `).join('')}
            
            <p><strong>Total:</strong> ${order.totalAmount} ETB</p>
            
            <a href="${process.env.WEBSITE_URL}/tracking.html?order=${order.orderNumber}" class="tracking-link">
              Track Your Order
            </a>
            
            <p>We will notify you when your order status changes.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }),
  
  statusUpdate: (order, status) => {
    const statusMessages = {
      'APPROVED': {
        emoji: '👍',
        title: 'Order Approved',
        message: 'Your order has been approved and is being processed.'
      },
      'PREPARING': {
        emoji: '👨‍🍳',
        title: 'Food Being Prepared',
        message: 'Your food is now being prepared in our kitchen.'
      },
      'READY': {
        emoji: '📦',
        title: 'Order Ready',
        message: 'Your order is ready for pickup/delivery.'
      },
      'OUT_FOR_DELIVERY': {
        emoji: '🚗',
        title: 'Out for Delivery',
        message: 'Your order is on its way to you!'
      },
      'DELIVERED': {
        emoji: '🎉',
        title: 'Order Delivered',
        message: 'Your order has been delivered. Enjoy your meal!'
      },
      'REJECTED': {
        emoji: '😔',
        title: 'Order Rejected',
        message: 'Unfortunately, we cannot process your order at this time.'
      },
      'CANCELLED': {
        emoji: '❌',
        title: 'Order Cancelled',
        message: 'Your order has been cancelled.'
      }
    };
    
    const statusInfo = statusMessages[status] || {
      emoji: '📝',
      title: 'Status Updated',
      message: `Your order status has been updated to ${status}.`
    };
    
    return {
      subject: `${statusInfo.emoji} ${statusInfo.title} - ${order.orderNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2196F3; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; text-align: center; }
            .emoji { font-size: 64px; margin: 20px 0; }
            .status { font-size: 24px; font-weight: bold; color: #2196F3; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Order Update</h1>
            </div>
            <div class="content">
              <div class="emoji">${statusInfo.emoji}</div>
              <h2>${statusInfo.title}</h2>
              <p class="status">${statusInfo.message}</p>
              <p>Order Number: <strong>${order.orderNumber}</strong></p>
              ${status === 'REJECTED' && order.rejectionReason ? 
                `<p><strong>Reason:</strong> ${order.rejectionReason}</p>` : ''}
            </div>
          </div>
        </body>
        </html>
      `
    };
  }
};

// Send email functions
exports.sendNewOrderNotification = async (order) => {
  try {
    const template = emailTemplates.newOrder(order);
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: process.env.ADMIN_EMAIL,
      subject: template.subject,
      html: template.html
    });
    console.log('New order notification sent to admin');
  } catch (error) {
    console.error('Error sending new order notification:', error);
  }
};

exports.sendOrderConfirmation = async (customerEmail, order) => {
  try {
    const template = emailTemplates.orderConfirmation(order);
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: customerEmail,
      subject: template.subject,
      html: template.html
    });
    console.log('Order confirmation sent to customer');
  } catch (error) {
    console.error('Error sending order confirmation:', error);
  }
};

exports.sendOrderStatusUpdate = async (customerEmail, order, status) => {
  try {
    if (!customerEmail) return;
    
    const template = emailTemplates.statusUpdate(order, status);
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: customerEmail,
      subject: template.subject,
      html: template.html
    });
    console.log(`Order status update sent for status: ${status}`);
  } catch (error) {
    console.error('Error sending order status update:', error);
  }
};

exports.sendWelcomeEmail = async (email, name) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Welcome to Food Delivery!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #ff6b35; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Food Delivery! 🎉</h1>
            </div>
            <div class="content">
              <h2>Hi ${name}!</h2>
              <p>Thank you for registering with us. We're excited to serve you delicious food!</p>
              <p>Start exploring our menu and place your first order today.</p>
              <p>If you have any questions, feel free to contact us at ${process.env.COMPANY_PHONE}.</p>
            </div>
          </div>
        </body>
        </html>
      `
    });
  } catch (error) {
    console.error('Error sending welcome email:', error);
  }
};

exports.sendPasswordResetEmail = async (email, resetUrl) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Password Reset Request',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #ff9800; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .btn { 
              display: inline-block; 
              padding: 10px 20px; 
              background: #ff9800; 
              color: white; 
              text-decoration: none; 
              border-radius: 5px; 
              margin: 20px 0; 
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset</h1>
            </div>
            <div class="content">
              <h2>Reset Your Password</h2>
              <p>You requested to reset your password. Click the button below to reset it:</p>
              <a href="${resetUrl}" class="btn">Reset Password</a>
              <p>This link will expire in 30 minutes.</p>
              <p>If you didn't request this, please ignore this email.</p>
            </div>
          </div>
        </body>
        </html>
      `
    });
  } catch (error) {
    console.error('Error sending password reset email:', error);
  }
};

exports.sendOrderCancellationEmail = async (customerEmail, order) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: customerEmail,
      subject: `Order Cancelled - ${order.orderNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f44336; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Order Cancelled</h1>
            </div>
            <div class="content">
              <h2>Your order has been cancelled</h2>
              <p>Order Number: <strong>${order.orderNumber}</strong></p>
              <p>If you have any questions, please contact us at ${process.env.COMPANY_PHONE}.</p>
            </div>
          </div>
        </body>
        </html>
      `
    });
  } catch (error) {
    console.error('Error sending order cancellation email:', error);
  }
};
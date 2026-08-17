// services/emailService.js
const nodemailer = require('nodemailer');

let transporter = null;

if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
}

async function sendMail(to, subject, html) {
  if (!transporter) {
    console.log('Email service not configured. Skipping email.');
    return;
  }
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject,
      html
    });
    console.log(`Email sent to ${to}: ${subject}`);
  } catch (error) {
    console.error('Email send error:', error.message);
  }
}

exports.sendNewOrderNotification = async (order) => {
  const subject = `NEW FOOD ORDER - ${order.orderNumber}`;
  const html = `
    <h2>New Order: ${order.orderNumber}</h2>
    <p><strong>Customer:</strong> ${order.customerInfo?.fullName}</p>
    <p><strong>Phone:</strong> ${order.customerInfo?.phone}</p>
    <p><strong>Total:</strong> ${order.totalAmount} ETB</p>
    <p><strong>Items:</strong></p>
    <ul>
      ${order.items.map(item => `<li>${item.quantity} x ${item.name} = ${item.subtotal} ETB</li>`).join('')}
    </ul>
  `;
  await sendMail(process.env.ADMIN_EMAIL, subject, html);
};

exports.sendOrderConfirmation = async (email, order) => {
  const subject = `Order Confirmation - ${order.orderNumber}`;
  const html = `
    <h2>Thank you for your order!</h2>
    <p>Order Number: ${order.orderNumber}</p>
    <p>Total: ${order.totalAmount} ETB</p>
    <p>We will notify you when your order status changes.</p>
  `;
  await sendMail(email, subject, html);
};

exports.sendOrderStatusUpdate = async (email, order, status) => {
  const subject = `Order ${status} - ${order.orderNumber}`;
  const html = `
    <h2>Your order status has been updated</h2>
    <p>Order Number: ${order.orderNumber}</p>
    <p>New Status: ${status}</p>
  `;
  await sendMail(email, subject, html);
};

exports.sendWelcomeEmail = async (email, name) => {
  const subject = 'Welcome to Food Delivery!';
  const html = `<h2>Welcome ${name}!</h2><p>Thank you for registering.</p>`;
  await sendMail(email, subject, html);
};

exports.sendPasswordResetEmail = async (email, resetUrl) => {
  const subject = 'Password Reset Request';
  const html = `<p>Click <a href="${resetUrl}">here</a> to reset your password.</p>`;
  await sendMail(email, subject, html);
};

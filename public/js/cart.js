// public/js/cart.js
let cart = [];

function loadCart() {
  const saved = localStorage.getItem('cart');
  cart = saved ? JSON.parse(saved) : [];
}

function saveCart() {
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartCount();
}

function updateCartCount() {
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  document.querySelectorAll('.cart-count').forEach(el => {
    el.textContent = count;
    el.style.display = count > 0 ? 'block' : 'none';
  });
}

function renderCart() {
  const emptyCart = document.getElementById('empty-cart');
  const cartLayout = document.getElementById('cart-layout');
  const cartItems = document.getElementById('cart-items');

  if (!emptyCart || !cartLayout || !cartItems) return;

  if (cart.length === 0) {
    emptyCart.style.display = 'block';
    cartLayout.style.display = 'none';
    return;
  }

  emptyCart.style.display = 'none';
  cartLayout.style.display = 'grid';

  cartItems.innerHTML = cart.map(item => `
    <div class="cart-item">
      <div class="cart-item-image">
        <img src="${item.image || 'https://via.placeholder.com/80x80'}" alt="${item.name}">
      </div>
      <div class="cart-item-info">
        <h3 class="cart-item-name">${item.name}</h3>
        <p class="cart-item-price">${item.price} ETB</p>
      </div>
      <div class="quantity-control">
        <button class="quantity-btn" onclick="updateQuantity('${item.id}', -1)">-</button>
        <input type="text" class="quantity-input" value="${item.quantity}" readonly>
        <button class="quantity-btn" onclick="updateQuantity('${item.id}', 1)">+</button>
      </div>
      <button class="btn btn-danger btn-sm" onclick="removeFromCart('${item.id}')">
        <i class="fas fa-trash"></i>
      </button>
    </div>
  `).join('');

  updateCartSummary();
}

function updateCartSummary() {
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const deliveryFee = subtotal > 1000 ? 0 : 100;
  const total = subtotal + deliveryFee;

  document.getElementById('subtotal').textContent = `${subtotal} ETB`;
  document.getElementById('delivery-fee').textContent = deliveryFee === 0 ? 'FREE' : `${deliveryFee} ETB`;
  document.getElementById('total-amount').textContent = `${total} ETB`;
}

function updateQuantity(productId, change) {
  const item = cart.find(i => i.id === productId);
  if (!item) return;

  item.quantity += change;
  if (item.quantity <= 0) {
    cart = cart.filter(i => i.id !== productId);
  }
  saveCart();
  renderCart();
}

function removeFromCart(productId) {
  cart = cart.filter(i => i.id !== productId);
  saveCart();
  renderCart();
}

function proceedToCheckout() {
  if (cart.length === 0) {
    alert('Your cart is empty');
    return;
  }
  window.location.href = 'checkout.html';
}

document.addEventListener('DOMContentLoaded', () => {
  loadCart();
  renderCart();
  updateCartCount();
});

window.updateQuantity = updateQuantity;
window.removeFromCart = removeFromCart;
window.proceedToCheckout = proceedToCheckout;

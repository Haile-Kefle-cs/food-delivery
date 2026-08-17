// ============================================
// FOOD DELIVERY - CART PAGE SCRIPT
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    loadCart();
    renderCart();
});

function renderCart() {
    const emptyCart = document.getElementById('empty-cart');
    const cartLayout = document.getElementById('cart-layout');
    const cartItems = document.getElementById('cart-items');
    
    if (!emptyCart || !cartLayout || !cartItems) return;
    
    if (!cart || cart.length === 0) {
        emptyCart.style.display = 'block';
        cartLayout.style.display = 'none';
        return;
    }
    
    emptyCart.style.display = 'none';
    cartLayout.style.display = 'grid';
    
    // Render cart items
    cartItems.innerHTML = cart.map((item, index) => `
        <div class="cart-item">
            <div class="cart-item-image">
                <img src="${item.image || 'https://via.placeholder.com/80x80'}" alt="${item.name}">
            </div>
            <div class="cart-item-info">
                <h3 class="cart-item-name">${item.name}</h3>
                <p class="cart-item-price">${item.price} ETB</p>
                ${item.specialInstructions ? `
                    <p class="cart-item-instructions">
                        <small>Note: ${item.specialInstructions}</small>
                    </p>
                ` : ''}
            </div>
            <div class="quantity-control">
                <button class="quantity-btn" onclick="updateQuantity('${item.id}', -1)">-</button>
                <input type="number" class="quantity-input" value="${item.quantity}" 
                       min="1" readonly>
                <button class="quantity-btn" onclick="updateQuantity('${item.id}', 1)">+</button>
            </div>
            <button class="btn btn-danger btn-sm" onclick="removeFromCart('${item.id}')">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
    
    // Update summary
    updateCartSummary();
}

function updateCartSummary() {
    const totals = calculateCartTotals();
    
    document.getElementById('subtotal').textContent = `${totals.subtotal} ETB`;
    document.getElementById('delivery-fee').textContent = 
        totals.deliveryFee === 0 ? 'FREE' : `${totals.deliveryFee} ETB`;
    document.getElementById('total-amount').textContent = `${totals.total} ETB`;
    
    if (totals.discount > 0) {
        document.getElementById('discount-row').style.display = 'flex';
        document.getElementById('discount-amount').textContent = `-${totals.discount} ETB`;
    } else {
        document.getElementById('discount-row').style.display = 'none';
    }
}

function updateQuantity(productId, change) {
    const item = cart.find(item => item.id === productId);
    
    if (item) {
        item.quantity += change;
        
        if (item.quantity <= 0) {
            if (confirm('Remove this item from cart?')) {
                removeFromCart(productId);
            } else {
                item.quantity = 1;
                saveCart();
                renderCart();
            }
        } else {
            saveCart();
            renderCart();
        }
    }
}

function removeFromCart(productId) {
    if (confirm('Remove this item from cart?')) {
        cart = cart.filter(item => item.id !== productId);
        saveCart();
        renderCart();
    }
}

function applyPromoCode() {
    const promoInput = document.getElementById('promo-input');
    const promoCode = promoInput.value.trim();
    
    if (!promoCode) {
        showToast('Please enter a promo code', 'warning');
        return;
    }
    
    // Simple promo codes
    const promoCodes = {
        'WELCOME10': 0.10, // 10% off
        'SAVE20': 0.20,    // 20% off
        'FREEDEL': 'free-delivery'
    };
    
    if (promoCodes[promoCode]) {
        showToast('Promo code applied!', 'success');
        // Store promo code for checkout
        localStorage.setItem('promoCode', promoCode);
        promoInput.disabled = true;
    } else {
        showToast('Invalid promo code', 'error');
    }
}

function proceedToCheckout() {
    if (!cart || cart.length === 0) {
        showToast('Your cart is empty', 'warning');
        return;
    }
    
    window.location.href = '/checkout.html';
}

// Export functions globally
window.updateQuantity = updateQuantity;
window.removeFromCart = removeFromCart;
window.applyPromoCode = applyPromoCode;
window.proceedToCheckout = proceedToCheckout;
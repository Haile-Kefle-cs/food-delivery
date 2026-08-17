// ============================================
// FOOD DELIVERY - CHECKOUT PAGE SCRIPT
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    loadCart();
    
    if (!cart || cart.length === 0) {
        window.location.href = '/cart.html';
        return;
    }
    
    initializeCheckout();
});

function initializeCheckout() {
    renderCheckoutItems();
    updateCheckoutSummary();
    
    // Pre-fill form if user is logged in
    if (currentUser) {
        document.getElementById('fullName').value = currentUser.fullName || '';
        document.getElementById('phone').value = currentUser.phone || '';
        document.getElementById('email').value = currentUser.email || '';
    }
    
    // Setup form submission
    document.getElementById('checkout-form').addEventListener('submit', placeOrder);
}

function renderCheckoutItems() {
    const container = document.getElementById('checkout-items');
    if (!container) return;
    
    container.innerHTML = cart.map(item => `
        <div class="checkout-item">
            <div class="checkout-item-info">
                <span class="checkout-item-name">${item.name}</span>
                <span class="checkout-item-quantity">x${item.quantity}</span>
            </div>
            <span class="checkout-item-price">${item.price * item.quantity} ETB</span>
        </div>
    `).join('');
}

function updateCheckoutSummary() {
    const totals = calculateCartTotals();
    
    document.getElementById('checkout-subtotal').textContent = `${totals.subtotal} ETB`;
    document.getElementById('checkout-delivery').textContent = 
        totals.deliveryFee === 0 ? 'FREE' : `${totals.deliveryFee} ETB`;
    document.getElementById('checkout-total').textContent = `${totals.total} ETB`;
}

async function placeOrder(event) {
    event.preventDefault();
    
    // Get form data
    const orderData = {
        items: cart.map(item => ({
            product: item.id,
            quantity: item.quantity,
            specialInstructions: item.specialInstructions || ''
        })),
        customerInfo: {
            fullName: document.getElementById('fullName').value,
            phone: document.getElementById('phone').value,
            email: document.getElementById('email').value,
            address: {
                city: document.getElementById('city').value,
                area: document.getElementById('area').value,
                street: document.getElementById('street').value,
                details: document.getElementById('address-details').value
            }
        },
        paymentMethod: document.querySelector('input[name="payment"]:checked').value,
        deliveryInstructions: document.getElementById('delivery-instructions').value
    };
    
    // Validate required fields
    if (!orderData.customerInfo.fullName || !orderData.customerInfo.phone || 
        !orderData.customerInfo.address.area || !orderData.customerInfo.address.street) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    // Show loading state
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Placing Order...';
    
    try {
        const response = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify(orderData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Clear cart
            cart = [];
            saveCart();
            
            // Show success modal
            document.getElementById('order-number').textContent = data.order.orderNumber;
            document.getElementById('success-modal').style.display = 'block';
        } else {
            showToast(data.message || 'Error placing order', 'error');
        }
    } catch (error) {
        console.error('Error placing order:', error);
        showToast('Error placing order. Please try again.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

function trackOrder() {
    const orderNumber = document.getElementById('order-number').textContent;
    window.location.href = `/tracking.html?order=${orderNumber}`;
}

function goToMenu() {
    window.location.href = '/menu.html';
}

// Export functions globally
window.trackOrder = trackOrder;
window.goToMenu = goToMenu;
// ============================================
// FOOD DELIVERY - MAIN APPLICATION SCRIPT
// ============================================

// API Configuration
const API_URL = window.location.origin + '/api';

// Global State
let currentUser = null;
let cart = [];
let categories = [];
let products = [];
let token = localStorage.getItem('token');

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

async function initializeApp() {
    // Load cart from localStorage
    loadCart();
    
    // Check authentication
    await checkAuth();
    
    // Update UI
    updateCartCount();
    
    // Load page-specific data
    const currentPage = getCurrentPage();
    
    switch (currentPage) {
        case 'index.html':
            await loadHomePageData();
            break;
        case 'menu.html':
            await loadMenuPageData();
            break;
        case 'cart.html':
            renderCart();
            break;
        case 'checkout.html':
            initializeCheckout();
            break;
        case 'tracking.html':
            initializeTracking();
            break;
        default:
            if (currentPage.includes('admin')) {
                initializeAdmin();
            }
    }
    
    // Setup event listeners
    setupEventListeners();
}

// Get current page name
function getCurrentPage() {
    const path = window.location.pathname;
    return path.split('/').pop() || 'index.html';
}

// ============================================
// AUTHENTICATION
// ============================================

async function checkAuth() {
    if (!token) return;
    
    try {
        const response = await fetch(`${API_URL}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            updateAuthUI();
        } else {
            // Token expired or invalid
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            token = null;
        }
    } catch (error) {
        console.error('Auth check error:', error);
    }
}

function updateAuthUI() {
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    const userMenu = document.getElementById('user-menu');
    const userName = document.getElementById('user-name');
    const adminLink = document.getElementById('admin-link');
    
    if (currentUser) {
        if (loginBtn) loginBtn.style.display = 'none';
        if (registerBtn) registerBtn.style.display = 'none';
        if (userMenu) {
            userMenu.style.display = 'block';
            if (userName) userName.textContent = currentUser.fullName.split(' ')[0];
        }
        if (adminLink && currentUser.role === 'admin') {
            adminLink.style.display = 'block';
        }
    }
}

async function logout() {
    try {
        if (token) {
            await fetch(`${API_URL}/auth/logout`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
        }
    } catch (error) {
        console.error('Logout error:', error);
    }
    
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    token = null;
    currentUser = null;
    window.location.href = '/index.html';
}

// ============================================
// CART MANAGEMENT
// ============================================

function loadCart() {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
        try {
            cart = JSON.parse(savedCart);
        } catch (error) {
            console.error('Error parsing cart:', error);
            cart = [];
        }
    }
}

function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
}

function addToCart(productId, quantity = 1, specialInstructions = '') {
    const product = products.find(p => p.id === productId || p._id === productId);
    
    if (!product) {
        console.error('Product not found:', productId);
        return;
    }
    
    const existingItem = cart.find(item => item.id === productId || item.id === product._id);
    
    if (existingItem) {
        existingItem.quantity += quantity;
        if (specialInstructions) {
            existingItem.specialInstructions = specialInstructions;
        }
    } else {
        cart.push({
            id: product.id || product._id,
            name: product.name,
            price: product.discountPrice || product.price,
            image: product.image || '',
            quantity: quantity,
            specialInstructions: specialInstructions
        });
    }
    
    saveCart();
    showToast(`${product.name} added to cart!`, 'success');
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCart();
    
    if (getCurrentPage() === 'cart.html') {
        renderCart();
    }
}

function updateCartQuantity(productId, change) {
    const item = cart.find(item => item.id === productId);
    
    if (item) {
        item.quantity += change;
        
        if (item.quantity <= 0) {
            removeFromCart(productId);
        } else {
            saveCart();
            if (getCurrentPage() === 'cart.html') {
                renderCart();
            }
        }
    }
}

function updateCartCount() {
    const count = cart.reduce((total, item) => total + item.quantity, 0);
    const cartCounts = document.querySelectorAll('.cart-count');
    
    cartCounts.forEach(el => {
        el.textContent = count;
        el.style.display = count > 0 ? 'block' : 'none';
    });
}

function calculateCartTotals() {
    const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    const deliveryFee = subtotal > 1000 ? 0 : 100; // Free delivery over 1000 ETB
    const discount = 0;
    const total = subtotal + deliveryFee - discount;
    
    return { subtotal, deliveryFee, discount, total };
}

// ============================================
// DATA LOADING
// ============================================

async function loadHomePageData() {
    try {
        // Load categories
        const categoriesResponse = await fetch(`${API_URL}/categories`);
        if (categoriesResponse.ok) {
            const categoriesData = await categoriesResponse.json();
            categories = categoriesData.categories || [];
            renderCategories();
        }
        
        // Load featured products
        const featuredResponse = await fetch(`${API_URL}/products/featured`);
        if (featuredResponse.ok) {
            const featuredData = await featuredResponse.json();
            renderProducts(featuredData.products || [], 'featured-products');
        }
        
        // Load popular products
        const popularResponse = await fetch(`${API_URL}/products/popular`);
        if (popularResponse.ok) {
            const popularData = await popularResponse.json();
            renderProducts(popularData.products || [], 'popular-products');
        }
        
        // Also load all products for cart functionality
        const productsResponse = await fetch(`${API_URL}/products`);
        if (productsResponse.ok) {
            const productsData = await productsResponse.json();
            products = productsData.products || [];
        }
    } catch (error) {
        console.error('Error loading home page data:', error);
    }
}

async function loadMenuPageData() {
    try {
        // Load categories
        const categoriesResponse = await fetch(`${API_URL}/categories`);
        if (categoriesResponse.ok) {
            const categoriesData = await categoriesResponse.json();
            categories = categoriesData.categories || [];
            renderMenuCategories();
        }
        
        // Load all products
        const productsResponse = await fetch(`${API_URL}/products`);
        if (productsResponse.ok) {
            const productsData = await productsResponse.json();
            products = productsData.products || [];
            renderMenuProducts(products);
        }
    } catch (error) {
        console.error('Error loading menu page data:', error);
    }
}

// ============================================
// RENDERING FUNCTIONS
// ============================================

function renderCategories() {
    const container = document.getElementById('categories-grid');
    if (!container) return;
    
    if (categories.length === 0) {
        container.innerHTML = '<p>No categories found</p>';
        return;
    }
    
    container.innerHTML = categories.slice(0, 8).map(category => `
        <div class="category-card" onclick="navigateToCategory('${category.id}')">
            <div class="category-icon">${category.icon || '🍽️'}</div>
            <div class="category-name">${category.name}</div>
        </div>
    `).join('');
}

function renderMenuCategories() {
    const container = document.getElementById('categories-filter');
    if (!container) return;
    
    let html = `
        <button class="filter-btn active" data-category="all" onclick="filterProductsByCategory('all')">
            <span class="filter-icon">🍽️</span>
            <span>All</span>
        </button>
    `;
    
    html += categories.map(category => `
        <button class="filter-btn" data-category="${category.id}" onclick="filterProductsByCategory('${category.id}')">
            <span class="filter-icon">${category.icon || '🍽️'}</span>
            <span>${category.name}</span>
        </button>
    `).join('');
    
    container.innerHTML = html;
}

function renderProducts(productList, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (!productList || productList.length === 0) {
        container.innerHTML = '<p class="no-products">No products available</p>';
        return;
    }
    
    container.innerHTML = productList.map(product => createProductCard(product)).join('');
}

function renderMenuProducts(productList) {
    const container = document.getElementById('products-grid');
    if (!container) return;
    
    if (!productList || productList.length === 0) {
        container.innerHTML = '<p class="no-products">No products found</p>';
        return;
    }
    
    container.innerHTML = productList.map(product => createProductCard(product)).join('');
}

function createProductCard(product) {
    const productId = product.id || product._id;
    const price = product.discountPrice || product.price;
    const originalPrice = product.discountPrice ? product.price : null;
    
    return `
        <div class="product-card">
            <div class="product-image">
                <img src="${product.image || 'https://via.placeholder.com/300x200'}" alt="${product.name}">
                ${product.isFeatured ? '<span class="product-badge">Featured</span>' : ''}
                ${originalPrice ? '<span class="product-discount">Sale</span>' : ''}
            </div>
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                <p class="product-description">${product.description || ''}</p>
                <div class="product-footer">
                    <div>
                        <span class="product-price">${price} ETB</span>
                        ${originalPrice ? `<span class="product-original-price">${originalPrice} ETB</span>` : ''}
                    </div>
                    <button class="add-to-cart-btn" onclick="addToCart('${productId}')">
                        <i class="fas fa-cart-plus"></i> Add
                    </button>
                </div>
            </div>
        </div>
    `;
}

// ============================================
// NAVIGATION
// ============================================

function navigateToCategory(categoryId) {
    window.location.href = `/menu.html?category=${categoryId}`;
}

function filterProductsByCategory(categoryId) {
    // Update active button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    if (categoryId === 'all') {
        renderMenuProducts(products);
    } else {
        const filtered = products.filter(p => p.category === categoryId);
        renderMenuProducts(filtered);
    }
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }
    
    // User dropdown
    const userBtn = document.getElementById('user-btn');
    const userDropdown = document.getElementById('user-dropdown');
    
    if (userBtn && userDropdown) {
        userBtn.addEventListener('click', () => {
            userDropdown.classList.toggle('show');
        });
        
        document.addEventListener('click', (e) => {
            if (!userBtn.contains(e.target) && !userDropdown.contains(e.target)) {
                userDropdown.classList.remove('show');
            }
        });
    }
    
    // Hamburger menu
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('nav-menu');
    
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
    }
    
    // Search functionality
    const searchBtn = document.getElementById('search-btn');
    const searchInput = document.getElementById('search-input');
    
    if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', searchProducts);
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchProducts();
            }
        });
    }
    
    // Contact form
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            showToast('Message sent successfully!', 'success');
            contactForm.reset();
        });
    }
    
    // Newsletter form
    const newsletterForm = document.getElementById('newsletter-form');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            showToast('Subscribed to newsletter!', 'success');
            newsletterForm.reset();
        });
    }
}

function searchProducts() {
    const searchTerm = document.getElementById('search-input').value.trim();
    
    if (!searchTerm) {
        renderMenuProducts(products);
        return;
    }
    
    const filtered = products.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    
    renderMenuProducts(filtered);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function showToast(message, type = 'success') {
    // Remove existing toasts
    const existingToasts = document.querySelectorAll('.toast');
    existingToasts.forEach(toast => toast.remove());
    
    // Create new toast
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    // Remove toast after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'slideInRight 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function formatCurrency(amount) {
    return `${amount} ETB`;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// ============================================
// API HELPER FUNCTIONS
// ============================================

async function apiRequest(endpoint, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'API request failed');
        }
        
        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Export functions for use in other scripts
window.foodDeliveryApp = {
    API_URL,
    currentUser,
    cart,
    products,
    categories,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    calculateCartTotals,
    showToast,
    formatCurrency,
    formatDate,
    apiRequest
};
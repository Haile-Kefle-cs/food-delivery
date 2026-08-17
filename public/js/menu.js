// ============================================
// FOOD DELIVERY - MENU PAGE SCRIPT
// ============================================

let selectedProduct = null;
let selectedQuantity = 1;
let selectedInstructions = '';

// Initialize menu page
document.addEventListener('DOMContentLoaded', () => {
    loadCategoriesAndProducts();
    setupMenuEventListeners();
});

async function loadCategoriesAndProducts() {
    try {
        // Load categories
        const categoriesResponse = await fetch(`${API_URL}/categories`);
        if (categoriesResponse.ok) {
            const data = await categoriesResponse.json();
            renderCategoryFilters(data.categories || []);
        }
        
        // Load products
        await loadProducts();
        
        // Check URL for category filter
        const urlParams = new URLSearchParams(window.location.search);
        const categoryParam = urlParams.get('category');
        if (categoryParam) {
            filterByCategory(categoryParam);
        }
    } catch (error) {
        console.error('Error loading menu data:', error);
        showToast('Error loading menu', 'error');
    }
}

async function loadProducts() {
    try {
        const response = await fetch(`${API_URL}/products`);
        if (response.ok) {
            const data = await response.json();
            products = data.products || [];
            displayProducts(products);
        }
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

function renderCategoryFilters(categories) {
    const container = document.getElementById('categories-filter');
    if (!container) return;
    
    let html = `
        <button class="filter-btn active" onclick="filterByCategory('all')">
            <span class="filter-icon">🍽️</span>
            <span>All</span>
        </button>
    `;
    
    html += categories.map(category => `
        <button class="filter-btn" onclick="filterByCategory('${category.id}')">
            <span class="filter-icon">${category.icon || '🍽️'}</span>
            <span>${category.name}</span>
        </button>
    `).join('');
    
    container.innerHTML = html;
}

function filterByCategory(categoryId) {
    // Update active button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    if (event) {
        event.target.closest('.filter-btn').classList.add('active');
    }
    
    if (categoryId === 'all') {
        displayProducts(products);
    } else {
        const filtered = products.filter(p => 
            p.category === categoryId || 
            p.category?._id === categoryId
        );
        displayProducts(filtered);
    }
}

function displayProducts(productList) {
    const container = document.getElementById('products-grid');
    if (!container) return;
    
    if (!productList || productList.length === 0) {
        container.innerHTML = `
            <div class="no-products">
                <i class="fas fa-utensils"></i>
                <p>No products found</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = productList.map(product => {
        const productId = product.id || product._id;
        const price = product.discountPrice || product.price;
        
        return `
            <div class="product-card">
                <div class="product-image" onclick="openProductDetail('${productId}')">
                    <img src="${product.image || product.image?.url || 'https://via.placeholder.com/300x200'}" 
                         alt="${product.name}" 
                         loading="lazy">
                    ${product.isFeatured ? '<span class="product-badge">Featured</span>' : ''}
                    ${product.discountPrice ? '<span class="product-discount">Sale</span>' : ''}
                </div>
                <div class="product-info">
                    <h3 class="product-name">${product.name}</h3>
                    <p class="product-description">${product.description || ''}</p>
                    <div class="product-footer">
                        <div>
                            <span class="product-price">${price} ETB</span>
                            ${product.discountPrice ? `<span class="product-original-price">${product.price} ETB</span>` : ''}
                        </div>
                        <button class="add-to-cart-btn" onclick="openProductDetail('${productId}')">
                            <i class="fas fa-plus"></i> Add
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function openProductDetail(productId) {
    selectedProduct = products.find(p => 
        (p.id === productId) || (p._id === productId)
    );
    
    if (!selectedProduct) {
        showToast('Product not found', 'error');
        return;
    }
    
    selectedQuantity = 1;
    selectedInstructions = '';
    
    // Update modal content
    document.getElementById('modal-product-image').src = 
        selectedProduct.image || selectedProduct.image?.url || 'https://via.placeholder.com/300x200';
    document.getElementById('modal-product-name').textContent = selectedProduct.name;
    document.getElementById('modal-product-description').textContent = selectedProduct.description || '';
    document.getElementById('modal-product-price').textContent = 
        `${selectedProduct.discountPrice || selectedProduct.price} ETB`;
    
    const originalPrice = document.getElementById('modal-product-original-price');
    if (selectedProduct.discountPrice) {
        originalPrice.textContent = `${selectedProduct.price} ETB`;
        originalPrice.style.display = 'inline';
    } else {
        originalPrice.style.display = 'none';
    }
    
    document.getElementById('modal-quantity').textContent = selectedQuantity;
    document.getElementById('modal-instructions').value = '';
    
    // Show modal
    document.getElementById('product-modal').style.display = 'block';
}

function closeProductModal() {
    document.getElementById('product-modal').style.display = 'none';
}

function changeQuantity(change) {
    selectedQuantity = Math.max(1, selectedQuantity + change);
    document.getElementById('modal-quantity').textContent = selectedQuantity;
}

function addToCartFromModal() {
    if (!selectedProduct) return;
    
    selectedInstructions = document.getElementById('modal-instructions').value;
    const productId = selectedProduct.id || selectedProduct._id;
    
    addToCart(productId, selectedQuantity, selectedInstructions);
    closeProductModal();
}

function setupMenuEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    
    if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', () => {
            const searchTerm = searchInput.value.trim();
            if (searchTerm) {
                searchProducts(searchTerm);
            } else {
                displayProducts(products);
            }
        });
        
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const searchTerm = searchInput.value.trim();
                if (searchTerm) {
                    searchProducts(searchTerm);
                } else {
                    displayProducts(products);
                }
            }
        });
    }
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('product-modal');
        if (e.target === modal) {
            closeProductModal();
        }
    });
}

function searchProducts(searchTerm) {
    const filtered = products.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    
    displayProducts(filtered);
}

// Export functions globally
window.openProductDetail = openProductDetail;
window.closeProductModal = closeProductModal;
window.changeQuantity = changeQuantity;
window.addToCartFromModal = addToCartFromModal;
window.filterByCategory = filterByCategory;
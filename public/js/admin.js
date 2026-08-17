// ============================================
// FOOD DELIVERY - ADMIN PANEL SCRIPT
// ============================================

// Admin authentication check
document.addEventListener('DOMContentLoaded', () => {
    checkAdminAuth();
    initializeAdminPage();
});

function checkAdminAuth() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (!user || user.role !== 'admin') {
        window.location.href = '/login.html';
        return;
    }
    
    // Update admin name
    const adminName = document.getElementById('admin-name');
    if (adminName && user.fullName) {
        adminName.textContent = user.fullName;
    }
    
    // Update current date
    const dateDisplay = document.getElementById('current-date');
    if (dateDisplay) {
        const now = new Date();
        dateDisplay.textContent = now.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
}

function initializeAdminPage() {
    const currentPage = getCurrentPage();
    
    switch (currentPage) {
        case 'index.html':
            loadDashboard();
            break;
        case 'orders.html':
            loadOrders();
            break;
        case 'products.html':
            loadProducts();
            break;
        case 'customers.html':
            loadCustomers();
            break;
        case 'reports.html':
            loadReports();
            break;
    }
    
    // Setup logout
    const logoutBtn = document.getElementById('admin-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }
}

function getCurrentPage() {
    const path = window.location.pathname;
    return path.split('/').pop() || 'index.html';
}

function toggleSidebar() {
    const sidebar = document.getElementById('adminSidebar');
    sidebar.classList.toggle('active');
}

// ============================================
// DASHBOARD
// ============================================

async function loadDashboard() {
    try {
        const response = await fetch(`${API_URL}/admin/dashboard`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load dashboard');
        }
        
        const data = await response.json();
        const stats = data.data.stats;
        
        // Update statistics
        document.getElementById('total-orders').textContent = stats.totalOrders;
        document.getElementById('pending-orders').textContent = stats.pendingOrders;
        document.getElementById('total-revenue').textContent = `${stats.totalRevenue} ETB`;
        document.getElementById('total-customers').textContent = stats.totalUsers;
        
        // Update pending orders badge
        const badge = document.getElementById('pending-orders-badge');
        if (badge) {
            badge.textContent = stats.pendingOrders;
            badge.style.display = stats.pendingOrders > 0 ? 'inline-block' : 'none';
        }
        
        // Render recent orders
        renderRecentOrders(data.data.recentOrders);
        
        // Render top products
        renderTopProducts(data.data.topProducts);
        
        // Create charts
        createSalesChart(data.data.dailySalesData);
        createOrdersChart(data.data.orderStatusDistribution);
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showToast('Error loading dashboard data', 'error');
    }
}

function renderRecentOrders(orders) {
    const tbody = document.getElementById('recent-orders-table');
    if (!tbody) return;
    
    if (!orders || orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">No orders found</td></tr>';
        return;
    }
    
    tbody.innerHTML = orders.slice(0, 10).map(order => `
        <tr>
            <td>${order.orderNumber}</td>
            <td>${order.customerInfo?.fullName || 'N/A'}</td>
            <td>${order.totalAmount} ETB</td>
            <td><span class="status-badge ${order.orderStatus.toLowerCase()}">${order.orderStatus}</span></td>
            <td>
                <button class="action-btn view" onclick="viewOrder('${order.id}')">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function renderTopProducts(products) {
    const container = document.getElementById('top-products-list');
    if (!container) return;
    
    if (!products || products.length === 0) {
        container.innerHTML = '<p>No products sold yet</p>';
        return;
    }
    
    container.innerHTML = products.map((product, index) => `
        <div class="top-product-item">
            <span class="rank">#${index + 1}</span>
            <div class="product-info">
                <h4>${product.name}</h4>
                <p>${product.totalQuantity} sold</p>
            </div>
            <span class="revenue">${product.totalRevenue} ETB</span>
        </div>
    `).join('');
}

function createSalesChart(salesData) {
    const canvas = document.getElementById('sales-chart');
    if (!canvas || !salesData) return;
    
    const labels = salesData.map(item => item._id);
    const values = salesData.map(item => item.total);
    
    new Chart(canvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Sales (ETB)',
                data: values,
                borderColor: '#ff6b35',
                backgroundColor: 'rgba(255, 107, 53, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function createOrdersChart(statusDistribution) {
    const canvas = document.getElementById('orders-chart');
    if (!canvas || !statusDistribution) return;
    
    const labels = Object.keys(statusDistribution);
    const values = Object.values(statusDistribution);
    
    const colors = [
        '#ff9800', // PENDING
        '#2196f3', // APPROVED
        '#9c27b0', // PREPARING
        '#009688', // READY
        '#f57f17', // OUT_FOR_DELIVERY
        '#4caf50', // DELIVERED
        '#f44336', // REJECTED
        '#616161'  // CANCELLED
    ];
    
    new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// ============================================
// ORDERS MANAGEMENT
// ============================================

async function loadOrders() {
    try {
        const response = await fetch(`${API_URL}/admin/orders`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load orders');
        }
        
        const data = await response.json();
        renderOrdersTable(data.orders);
        
    } catch (error) {
        console.error('Error loading orders:', error);
        showToast('Error loading orders', 'error');
    }
}

function renderOrdersTable(orders) {
    const tbody = document.getElementById('orders-table-body');
    if (!tbody) return;
    
    if (!orders || orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8">No orders found</td></tr>';
        return;
    }
    
    tbody.innerHTML = orders.map(order => `
        <tr>
            <td>${order.orderNumber}</td>
            <td>${order.customerInfo?.fullName || 'N/A'}</td>
            <td>${order.items?.length || 0} items</td>
            <td>${order.totalAmount} ETB</td>
            <td>${order.paymentMethod}</td>
            <td><span class="status-badge ${order.orderStatus.toLowerCase()}">${order.orderStatus}</span></td>
            <td>${formatDate(order.createdAt)}</td>
            <td>
                <button class="action-btn view" onclick="viewOrder('${order.id}')">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="action-btn edit" onclick="openUpdateStatus('${order.id}')">
                    <i class="fas fa-edit"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function viewOrder(orderId) {
    // Find order in current list or fetch details
    fetch(`${API_URL}/admin/orders/${orderId}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            displayOrderDetails(data.order);
        }
    })
    .catch(error => {
        console.error('Error fetching order details:', error);
    });
}

function displayOrderDetails(order) {
    const modal = document.getElementById('order-details-modal');
    const content = document.getElementById('order-details-content');
    
    content.innerHTML = `
        <div class="order-details">
            <h3>Order Information</h3>
            <p><strong>Order Number:</strong> ${order.orderNumber}</p>
            <p><strong>Status:</strong> ${order.orderStatus}</p>
            <p><strong>Date:</strong> ${formatDate(order.createdAt)}</p>
            
            <h3>Customer Information</h3>
            <p><strong>Name:</strong> ${order.customerInfo?.fullName}</p>
            <p><strong>Phone:</strong> ${order.customerInfo?.phone}</p>
            <p><strong>Email:</strong> ${order.customerInfo?.email || 'N/A'}</p>
            <p><strong>Address:</strong> ${order.customerInfo?.address?.area}, ${order.customerInfo?.address?.city}</p>
            
            <h3>Order Items</h3>
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Item</th>
                        <th>Quantity</th>
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
                            <td>${item.subtotal || item.price * item.quantity} ETB</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <h3>Payment</h3>
            <p><strong>Method:</strong> ${order.paymentMethod}</p>
            <p><strong>Subtotal:</strong> ${order.subtotal} ETB</p>
            <p><strong>Delivery Fee:</strong> ${order.deliveryFee} ETB</p>
            <p><strong>Total:</strong> ${order.totalAmount} ETB</p>
        </div>
    `;
    
    modal.style.display = 'block';
}

function openUpdateStatus(orderId) {
    document.getElementById('update-order-id').value = orderId;
    document.getElementById('update-status-modal').style.display = 'block';
}

function closeOrderDetails() {
    document.getElementById('order-details-modal').style.display = 'none';
}

function closeUpdateStatus() {
    document.getElementById('update-status-modal').style.display = 'none';
}

// Setup update status form
document.addEventListener('DOMContentLoaded', () => {
    const updateForm = document.getElementById('update-status-form');
    if (updateForm) {
        updateForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const orderId = document.getElementById('update-order-id').value;
            const newStatus = document.getElementById('new-status').value;
            const note = document.getElementById('status-note').value;
            
            try {
                const response = await fetch(`${API_URL}/admin/orders/${orderId}/status`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ status: newStatus, note })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    showToast('Order status updated', 'success');
                    closeUpdateStatus();
                    loadOrders();
                } else {
                    showToast(data.message || 'Error updating status', 'error');
                }
            } catch (error) {
                console.error('Error updating order status:', error);
                showToast('Error updating status', 'error');
            }
        });
    }
});

// ============================================
// PRODUCTS MANAGEMENT
// ============================================

async function loadProducts() {
    try {
        const response = await fetch(`${API_URL}/admin/products`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load products');
        }
        
        const data = await response.json();
        renderAdminProducts(data.products);
        
    } catch (error) {
        console.error('Error loading products:', error);
        showToast('Error loading products', 'error');
    }
}

function renderAdminProducts(products) {
    const container = document.getElementById('products-admin-grid');
    if (!container) return;
    
    if (!products || products.length === 0) {
        container.innerHTML = '<p>No products found</p>';
        return;
    }
    
    container.innerHTML = products.map(product => `
        <div class="admin-product-card">
            <div class="admin-product-image">
                <img src="${product.image || 'https://via.placeholder.com/300x200'}" alt="${product.name}">
            </div>
            <div class="admin-product-info">
                <h3>${product.name}</h3>
                <p>${product.price} ETB</p>
                <p>Stock: ${product.stock}</p>
                <p>Status: ${product.isAvailable ? 'Available' : 'Unavailable'}</p>
            </div>
            <div class="admin-product-actions">
                <button class="action-btn edit" onclick="editProduct('${product.id}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="action-btn delete" onclick="deleteProduct('${product.id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `).join('');
}

function openAddProduct() {
    document.getElementById('product-modal-title').textContent = 'Add Product';
    document.getElementById('product-form').reset();
    document.getElementById('product-id').value = '';
    document.getElementById('product-modal').style.display = 'block';
}

function editProduct(productId) {
    // Find product and populate form
    fetch(`${API_URL}/admin/products/${productId}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const product = data.product;
            document.getElementById('product-modal-title').textContent = 'Edit Product';
            document.getElementById('product-id').value = product.id;
            document.getElementById('product-name').value = product.name;
            document.getElementById('product-description').value = product.description;
            document.getElementById('product-price').value = product.price;
            document.getElementById('product-discount-price').value = product.discountPrice || '';
            document.getElementById('product-stock').value = product.stock;
            document.getElementById('product-image').value = product.image || '';
            document.getElementById('product-available').checked = product.isAvailable;
            document.getElementById('product-featured').checked = product.isFeatured;
            document.getElementById('product-popular').checked = product.isPopular;
            document.getElementById('product-modal').style.display = 'block';
        }
    })
    .catch(error => {
        console.error('Error fetching product:', error);
    });
}

function closeProductModal() {
    document.getElementById('product-modal').style.display = 'none';
}

function deleteProduct(productId) {
    document.getElementById('delete-product-id').value = productId;
    document.getElementById('delete-confirm-modal').style.display = 'block';
}

function closeDeleteConfirm() {
    document.getElementById('delete-confirm-modal').style.display = 'none';
}

async function confirmDeleteProduct() {
    const productId = document.getElementById('delete-product-id').value;
    
    try {
        const response = await fetch(`${API_URL}/admin/products/${productId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Product deleted', 'success');
            closeDeleteConfirm();
            loadProducts();
        } else {
            showToast(data.message || 'Error deleting product', 'error');
        }
    } catch (error) {
        console.error('Error deleting product:', error);
        showToast('Error deleting product', 'error');
    }
}

// Setup product form
document.addEventListener('DOMContentLoaded', () => {
    const productForm = document.getElementById('product-form');
    if (productForm) {
        productForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const productId = document.getElementById('product-id').value;
            const productData = {
                name: document.getElementById('product-name').value,
                description: document.getElementById('product-description').value,
                price: parseFloat(document.getElementById('product-price').value),
                discountPrice: document.getElementById('product-discount-price').value ? 
                    parseFloat(document.getElementById('product-discount-price').value) : null,
                stock: parseInt(document.getElementById('product-stock').value),
                image: document.getElementById('product-image').value,
                isAvailable: document.getElementById('product-available').checked,
                isFeatured: document.getElementById('product-featured').checked,
                isPopular: document.getElementById('product-popular').checked
            };
            
            const url = productId ? 
                `${API_URL}/admin/products/${productId}` : 
                `${API_URL}/admin/products`;
            
            const method = productId ? 'PUT' : 'POST';
            
            try {
                const response = await fetch(url, {
                    method: method,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(productData)
                });
                
                const data = await response.json();
                
                if (data.success) {
                    showToast(productId ? 'Product updated' : 'Product created', 'success');
                    closeProductModal();
                    loadProducts();
                } else {
                    showToast(data.message || 'Error saving product', 'error');
                }
            } catch (error) {
                console.error('Error saving product:', error);
                showToast('Error saving product', 'error');
            }
        });
    }
});

// ============================================
// CUSTOMERS MANAGEMENT
// ============================================

async function loadCustomers() {
    try {
        const response = await fetch(`${API_URL}/admin/customers`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load customers');
        }
        
        const data = await response.json();
        renderCustomersTable(data.customers);
        
    } catch (error) {
        console.error('Error loading customers:', error);
        showToast('Error loading customers', 'error');
    }
}

function renderCustomersTable(customers) {
    const tbody = document.getElementById('customers-table-body');
    if (!tbody) return;
    
    if (!customers || customers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7">No customers found</td></tr>';
        return;
    }
    
    tbody.innerHTML = customers.map(customer => `
        <tr>
            <td>
                <div class="customer-info">
                    <strong>${customer.fullName}</strong>
                </div>
            </td>
            <td>
                <div>${customer.email}</div>
                <small>${customer.phone}</small>
            </td>
            <td>${customer.stats?.totalOrders || 0}</td>
            <td>${customer.stats?.totalSpent || 0} ETB</td>
            <td>${formatDate(customer.createdAt)}</td>
            <td>
                <span class="status-badge ${customer.isActive ? 'delivered' : 'rejected'}">
                    ${customer.isActive ? 'Active' : 'Inactive'}
                </span>
            </td>
            <td>
                <button class="action-btn view" onclick="viewCustomer('${customer.id}')">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function viewCustomer(customerId) {
    // Implement customer details view
    console.log('View customer:', customerId);
}

// ============================================
// REPORTS
// ============================================

async function loadReports() {
    // Load default report (last 30 days)
    await generateReport();
}

async function generateReport() {
    try {
        const response = await fetch(`${API_URL}/admin/reports/sales`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to generate report');
        }
        
        const data = await response.json();
        displayReport(data.data);
        
    } catch (error) {
        console.error('Error generating report:', error);
        showToast('Error generating report', 'error');
    }
}

function displayReport(data) {
    // Update summary cards
    document.getElementById('report-revenue').textContent = `${data.summary.totalRevenue} ETB`;
    document.getElementById('report-orders').textContent = data.summary.totalOrders;
    document.getElementById('report-avg-order').textContent = `${data.summary.averageOrderValue} ETB`;
    document.getElementById('report-items-sold').textContent = data.summary.totalItems || 0;
    
    // Create charts
    createRevenueChart(data.salesData);
    createOrdersTrendChart(data.salesData);
    createPaymentChart(data.paymentBreakdown);
}

function createRevenueChart(salesData) {
    const canvas = document.getElementById('revenue-chart');
    if (!canvas || !salesData) return;
    
    const labels = salesData.map(item => item._id);
    const values = salesData.map(item => item.totalRevenue);
    
    new Chart(canvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Revenue (ETB)',
                data: values,
                backgroundColor: 'rgba(255, 107, 53, 0.6)',
                borderColor: '#ff6b35',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

function createOrdersTrendChart(salesData) {
    const canvas = document.getElementById('orders-trend-chart');
    if (!canvas || !salesData) return;
    
    const labels = salesData.map(item => item._id);
    const values = salesData.map(item => item.totalOrders);
    
    new Chart(canvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Orders',
                data: values,
                borderColor: '#2196f3',
                backgroundColor: 'rgba(33, 150, 243, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

function createPaymentChart(paymentBreakdown) {
    const canvas = document.getElementById('payment-chart');
    if (!canvas || !paymentBreakdown) return;
    
    const labels = Object.keys(paymentBreakdown);
    const values = Object.values(paymentBreakdown).map(item => item.count);
    
    const colors = [
        '#ff6b35',
        '#2196f3',
        '#4caf50',
        '#ff9800',
        '#9c27b0'
    ];
    
    new Chart(canvas, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function exportReport() {
    // Implement CSV export
    showToast('Report exported!', 'success');
}

function changePeriod() {
    const period = document.getElementById('report-period').value;
    // Implement period change logic
    generateReport();
}

// Export functions globally
window.toggleSidebar = toggleSidebar;
window.viewOrder = viewOrder;
window.openUpdateStatus = openUpdateStatus;
window.closeOrderDetails = closeOrderDetails;
window.closeUpdateStatus = closeUpdateStatus;
window.openAddProduct = openAddProduct;
window.editProduct = editProduct;
window.closeProductModal = closeProductModal;
window.deleteProduct = deleteProduct;
window.closeDeleteConfirm = closeDeleteConfirm;
window.confirmDeleteProduct = confirmDeleteProduct;
window.viewCustomer = viewCustomer;
window.exportReport = exportReport;
window.changePeriod = changePeriod;
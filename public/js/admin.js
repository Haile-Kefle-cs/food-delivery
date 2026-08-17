// ============================================
// FOOD DELIVERY - ADMIN PANEL SCRIPT (FIXED)
// ============================================

// Get token from localStorage
const token = localStorage.getItem('token');
const API_URL = window.location.origin + '/api';

// ============================================
// AUTHENTICATION CHECK
// ============================================
function checkAdminAuth() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (!token || !user || user.role !== 'admin') {
    window.location.href = '/login.html';
    return false;
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

  return true;
}

// ============================================
// FETCH HELPER WITH AUTH
// ============================================
async function apiRequest(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers
    });

    if (response.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login.html';
      throw new Error('Unauthorized');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// ============================================
// LOGOUT
// ============================================
async function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login.html';
}

// ============================================
// PAGE INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  if (!checkAdminAuth()) return;

  const currentPage = window.location.pathname.split('/').pop() || 'index.html';

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

  // Setup logout button
  const logoutBtn = document.getElementById('admin-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  }

  // Setup product form if exists
  const productForm = document.getElementById('product-form');
  if (productForm) {
    productForm.addEventListener('submit', handleProductSubmit);
  }

  // Setup update status form if exists
  const updateForm = document.getElementById('update-status-form');
  if (updateForm) {
    updateForm.addEventListener('submit', handleStatusUpdate);
  }
});

// ============================================
// DASHBOARD
// ============================================
async function loadDashboard() {
  try {
    const data = await apiRequest('/admin/dashboard');
    if (!data.success) {
      showToast(data.message || 'Error loading dashboard', 'error');
      return;
    }

    const stats = data.data.stats;
    document.getElementById('total-orders').textContent = stats.totalOrders;
    document.getElementById('pending-orders').textContent = stats.pendingOrders;
    document.getElementById('total-revenue').textContent = `${stats.totalRevenue} ETB`;
    document.getElementById('total-customers').textContent = stats.totalUsers;

    const badge = document.getElementById('pending-orders-badge');
    if (badge) {
      badge.textContent = stats.pendingOrders;
      badge.style.display = stats.pendingOrders > 0 ? 'inline-block' : 'none';
    }

    renderRecentOrders(data.data.recentOrders);
    renderTopProducts(data.data.topProducts);
    createSalesChart(data.data.dailySalesData);
    createOrdersChart(data.data.orderStatusDistribution);
  } catch (error) {
    showToast('Error loading dashboard', 'error');
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
  if (!canvas || !salesData || typeof Chart === 'undefined') return;

  const labels = salesData.map(item => item._id);
  const values = salesData.map(item => item.total);

  new Chart(canvas, {
    type: 'line',
    data: {
      labels,
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
      plugins: { legend: { display: false } }
    }
  });
}

function createOrdersChart(statusDistribution) {
  const canvas = document.getElementById('orders-chart');
  if (!canvas || !statusDistribution || typeof Chart === 'undefined') return;

  const labels = Object.keys(statusDistribution);
  const values = Object.values(statusDistribution);
  const colors = ['#ff9800', '#2196f3', '#9c27b0', '#009688', '#f57f17', '#4caf50', '#f44336', '#616161'];

  new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data: values, backgroundColor: colors, borderWidth: 2, borderColor: '#fff' }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' } }
    }
  });
}

// ============================================
// ORDERS
// ============================================
async function loadOrders() {
  try {
    const data = await apiRequest('/admin/orders');
    if (!data.success) {
      showToast(data.message || 'Error loading orders', 'error');
      return;
    }
    renderOrdersTable(data.orders);
  } catch (error) {
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
      <td>${new Date(order.createdAt).toLocaleDateString()}</td>
      <td>
        <button class="action-btn view" onclick="viewOrder('${order.id}')"><i class="fas fa-eye"></i></button>
        <button class="action-btn edit" onclick="openUpdateStatus('${order.id}')"><i class="fas fa-edit"></i></button>
      </td>
    </tr>
  `).join('');
}

async function viewOrder(orderId) {
  try {
    const data = await apiRequest(`/admin/orders/${orderId}`);
    if (data.success) displayOrderDetails(data.order);
  } catch (error) {
    showToast('Error fetching order details', 'error');
  }
}

function displayOrderDetails(order) {
  const modal = document.getElementById('order-details-modal');
  const content = document.getElementById('order-details-content');
  if (!modal || !content) return;

  content.innerHTML = `
    <h3>Order Information</h3>
    <p><strong>Order Number:</strong> ${order.orderNumber}</p>
    <p><strong>Status:</strong> ${order.orderStatus}</p>
    <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleString()}</p>
    <h3>Customer Information</h3>
    <p><strong>Name:</strong> ${order.customerInfo?.fullName}</p>
    <p><strong>Phone:</strong> ${order.customerInfo?.phone}</p>
    <p><strong>Address:</strong> ${order.customerInfo?.address?.area}, ${order.customerInfo?.address?.city}</p>
    <h3>Items</h3>
    <table class="admin-table">
      <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Subtotal</th></tr></thead>
      <tbody>
        ${order.items.map(item => `<tr><td>${item.name}</td><td>${item.quantity}</td><td>${item.price}</td><td>${item.subtotal || item.price * item.quantity}</td></tr>`).join('')}
      </tbody>
    </table>
    <p><strong>Total:</strong> ${order.totalAmount} ETB</p>
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

async function handleStatusUpdate(e) {
  e.preventDefault();
  const orderId = document.getElementById('update-order-id').value;
  const newStatus = document.getElementById('new-status').value;
  const note = document.getElementById('status-note').value;

  try {
    const data = await apiRequest(`/admin/orders/${orderId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status: newStatus, note })
    });
    if (data.success) {
      showToast('Order status updated', 'success');
      closeUpdateStatus();
      loadOrders();
    } else {
      showToast(data.message || 'Error updating status', 'error');
    }
  } catch (error) {
    showToast('Error updating status', 'error');
  }
}

// ============================================
// PRODUCTS
// ============================================
async function loadProducts() {
  try {
    const data = await apiRequest('/admin/products');
    if (!data.success) {
      showToast(data.message || 'Error loading products', 'error');
      return;
    }
    renderAdminProducts(data.products);
  } catch (error) {
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
        <button class="action-btn edit" onclick="editProduct('${product.id}')"><i class="fas fa-edit"></i></button>
        <button class="action-btn delete" onclick="deleteProduct('${product.id}')"><i class="fas fa-trash"></i></button>
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

async function editProduct(productId) {
  try {
    const data = await apiRequest(`/admin/products/${productId}`);
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
  } catch (error) {
    showToast('Error fetching product', 'error');
  }
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
    const data = await apiRequest(`/admin/products/${productId}`, { method: 'DELETE' });
    if (data.success) {
      showToast('Product deleted', 'success');
      closeDeleteConfirm();
      loadProducts();
    } else {
      showToast(data.message || 'Error deleting product', 'error');
    }
  } catch (error) {
    showToast('Error deleting product', 'error');
  }
}

async function handleProductSubmit(e) {
  e.preventDefault();
  const productId = document.getElementById('product-id').value;
  const productData = {
    name: document.getElementById('product-name').value,
    description: document.getElementById('product-description').value,
    price: parseFloat(document.getElementById('product-price').value),
    discountPrice: document.getElementById('product-discount-price').value ? parseFloat(document.getElementById('product-discount-price').value) : null,
    stock: parseInt(document.getElementById('product-stock').value),
    image: document.getElementById('product-image').value,
    isAvailable: document.getElementById('product-available').checked,
    isFeatured: document.getElementById('product-featured').checked,
    isPopular: document.getElementById('product-popular').checked
  };

  const url = productId ? `/admin/products/${productId}` : '/admin/products';
  const method = productId ? 'PUT' : 'POST';

  try {
    const data = await apiRequest(url, { method, body: JSON.stringify(productData) });
    if (data.success) {
      showToast(productId ? 'Product updated' : 'Product created', 'success');
      closeProductModal();
      loadProducts();
    } else {
      showToast(data.message || 'Error saving product', 'error');
    }
  } catch (error) {
    showToast('Error saving product', 'error');
  }
}

// ============================================
// CUSTOMERS
// ============================================
async function loadCustomers() {
  try {
    const data = await apiRequest('/admin/customers');
    if (!data.success) {
      showToast(data.message || 'Error loading customers', 'error');
      return;
    }
    renderCustomersTable(data.customers);
  } catch (error) {
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
      <td><strong>${customer.fullName}</strong></td>
      <td>${customer.email}<br><small>${customer.phone}</small></td>
      <td>${customer.stats?.totalOrders || 0}</td>
      <td>${customer.stats?.totalSpent || 0} ETB</td>
      <td>${new Date(customer.createdAt).toLocaleDateString()}</td>
      <td><span class="status-badge ${customer.isActive ? 'delivered' : 'rejected'}">${customer.isActive ? 'Active' : 'Inactive'}</span></td>
      <td><button class="action-btn view" onclick="viewCustomer('${customer.id}')"><i class="fas fa-eye"></i></button></td>
    </tr>
  `).join('');
}

function viewCustomer(customerId) {
  // Simple alert for now
  alert('Customer ID: ' + customerId);
}

// ============================================
// REPORTS
// ============================================
async function loadReports() {
  await generateReport();
}

async function generateReport() {
  try {
    const data = await apiRequest('/admin/reports/sales');
    if (!data.success) {
      showToast(data.message || 'Error generating report', 'error');
      return;
    }
    displayReport(data.data);
  } catch (error) {
    showToast('Error generating report', 'error');
  }
}

function displayReport(data) {
  document.getElementById('report-revenue').textContent = `${data.summary.totalRevenue} ETB`;
  document.getElementById('report-orders').textContent = data.summary.totalOrders;
  document.getElementById('report-avg-order').textContent = `${data.summary.averageOrderValue} ETB`;
  document.getElementById('report-items-sold').textContent = data.summary.totalItems || 0;

  createRevenueChart(data.salesData);
  createOrdersTrendChart(data.salesData);
  createPaymentChart(data.paymentBreakdown);
}

function createRevenueChart(salesData) {
  const canvas = document.getElementById('revenue-chart');
  if (!canvas || !salesData || typeof Chart === 'undefined') return;

  new Chart(canvas, {
    type: 'bar',
    data: {
      labels: salesData.map(item => item._id),
      datasets: [{
        label: 'Revenue (ETB)',
        data: salesData.map(item => item.totalRevenue),
        backgroundColor: 'rgba(255, 107, 53, 0.6)',
        borderColor: '#ff6b35',
        borderWidth: 1
      }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
  });
}

function createOrdersTrendChart(salesData) {
  const canvas = document.getElementById('orders-trend-chart');
  if (!canvas || !salesData || typeof Chart === 'undefined') return;

  new Chart(canvas, {
    type: 'line',
    data: {
      labels: salesData.map(item => item._id),
      datasets: [{
        label: 'Orders',
        data: salesData.map(item => item.totalOrders),
        borderColor: '#2196f3',
        backgroundColor: 'rgba(33, 150, 243, 0.1)',
        tension: 0.4,
        fill: true
      }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
  });
}

function createPaymentChart(paymentBreakdown) {
  const canvas = document.getElementById('payment-chart');
  if (!canvas || !paymentBreakdown || typeof Chart === 'undefined') return;

  const labels = Object.keys(paymentBreakdown);
  const values = Object.values(paymentBreakdown).map(item => item.count);
  const colors = ['#ff6b35', '#2196f3', '#4caf50', '#ff9800', '#9c27b0'];

  new Chart(canvas, {
    type: 'pie',
    data: {
      labels,
      datasets: [{ data: values, backgroundColor: colors, borderWidth: 2, borderColor: '#fff' }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
  });
}

function exportReport() {
  window.location.href = `${API_URL}/admin/orders/export`;
}

function changePeriod() {
  generateReport();
}

// ============================================
// UTILITY
// ============================================
function toggleSidebar() {
  const sidebar = document.getElementById('adminSidebar');
  if (sidebar) sidebar.classList.toggle('active');
}

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// Make functions globally available
window.toggleSidebar = toggleSidebar;
window.logout = logout;
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

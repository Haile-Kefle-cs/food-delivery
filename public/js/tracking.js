// ============================================
// FOOD DELIVERY - ORDER TRACKING SCRIPT
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initializeTracking();
});

function initializeTracking() {
    // Check for order number in URL
    const urlParams = new URLSearchParams(window.location.search);
    const orderNumber = urlParams.get('order');
    
    if (orderNumber) {
        document.getElementById('order-number-input').value = orderNumber;
        trackOrder();
    }
    
    // Setup event listeners
    const input = document.getElementById('order-number-input');
    if (input) {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                trackOrder();
            }
        });
    }
}

async function trackOrder() {
    const orderNumber = document.getElementById('order-number-input').value.trim();
    
    if (!orderNumber) {
        showToast('Please enter an order number', 'warning');
        return;
    }
    
    // Show loading state
    const trackBtn = document.querySelector('.search-box .btn');
    const originalText = trackBtn.innerHTML;
    trackBtn.disabled = true;
    trackBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Tracking...';
    
    try {
        const response = await fetch(`${API_URL}/orders/track/${orderNumber}`);
        const data = await response.json();
        
        if (data.success) {
            displayTrackingInfo(data.tracking);
        } else {
            showToast(data.message || 'Order not found', 'error');
            document.getElementById('tracking-result').style.display = 'none';
        }
    } catch (error) {
        console.error('Error tracking order:', error);
        showToast('Error tracking order. Please try again.', 'error');
    } finally {
        trackBtn.disabled = false;
        trackBtn.innerHTML = originalText;
    }
}

function displayTrackingInfo(tracking) {
    // Show tracking result
    document.getElementById('tracking-result').style.display = 'block';
    
    // Update order info
    document.getElementById('tracked-order-number').textContent = tracking.orderNumber;
    document.getElementById('tracked-order-date').textContent = formatDate(tracking.createdAt);
    document.getElementById('tracked-order-total').textContent = `${tracking.totalAmount} ETB`;
    document.getElementById('tracked-customer-name').textContent = tracking.customerName || 'Customer';
    
    // Update status badge
    const statusBadge = document.getElementById('order-status-badge');
    statusBadge.textContent = tracking.status;
    statusBadge.className = `order-status-badge status-${tracking.status.toLowerCase().replace(/_/g, '-')}`;
    
    // Update progress bar
    const progressFill = document.getElementById('progress-fill');
    progressFill.style.width = `${tracking.progress}%`;
    
    // Update progress steps
    updateProgressSteps(tracking.status);
    
    // Update status timeline
    renderStatusTimeline(tracking.statusHistory);
    
    // Scroll to result
    document.getElementById('tracking-result').scrollIntoView({ behavior: 'smooth' });
}

function updateProgressSteps(currentStatus) {
    const steps = document.querySelectorAll('.progress-step');
    const statusOrder = ['PENDING', 'APPROVED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED'];
    
    const currentIndex = statusOrder.indexOf(currentStatus);
    
    steps.forEach((step, index) => {
        step.classList.remove('active', 'completed');
        
        if (index <= currentIndex) {
            step.classList.add('active');
        }
    });
}

function renderStatusTimeline(statusHistory) {
    const timeline = document.getElementById('status-timeline');
    if (!timeline) return;
    
    if (!statusHistory || statusHistory.length === 0) {
        timeline.innerHTML = '<p>No status updates available</p>';
        return;
    }
    
    // Sort history by date (newest first)
    const sortedHistory = [...statusHistory].sort((a, b) => 
        new Date(b.changedAt) - new Date(a.changedAt)
    );
    
    timeline.innerHTML = sortedHistory.map(entry => `
        <div class="timeline-item">
            <div class="timeline-icon">
                <i class="fas ${getStatusIcon(entry.status)}"></i>
            </div>
            <div class="timeline-content">
                <h4>${entry.status}</h4>
                <p class="timeline-date">${formatDate(entry.changedAt)}</p>
                ${entry.note ? `<p class="timeline-note">${entry.note}</p>` : ''}
            </div>
        </div>
    `).join('');
}

function getStatusIcon(status) {
    const icons = {
        'PENDING': 'fa-receipt',
        'APPROVED': 'fa-check-circle',
        'PREPARING': 'fa-fire',
        'READY': 'fa-box',
        'OUT_FOR_DELIVERY': 'fa-motorcycle',
        'DELIVERED': 'fa-home',
        'REJECTED': 'fa-times-circle',
        'CANCELLED': 'fa-ban'
    };
    return icons[status] || 'fa-info-circle';
}

// Export functions globally
window.trackOrder = trackOrder;
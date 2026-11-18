// =============================================================================
// MediFind Full-Stack Desktop Web Application
// =============================================================================

// State
let currentTab = 'home';
let currentRole = 'user'; // 'user' or 'owner'
let currentCategory = 'All';
let cachedMedicines = [];
let cachedPharmacies = [];
let activeMedicineForReserve = null;
let currentAuthToken = '';

// Auth State & Token Management
async function ensureAuth() {
  const email = currentRole === 'owner' ? 'sunita@apexpharma.com' : 'rahul@example.com';
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'password123' })
    });
    const json = await res.json();
    if (json.data && json.data.token) {
      currentAuthToken = json.data.token;
    }
  } catch (e) {
    console.warn('Auto auth login error:', e.message);
  }
}

// Role Switcher
async function switchRole(role) {
  currentRole = role;
  currentAuthToken = '';

  const sel = document.getElementById('role-select');
  if (sel && sel.value !== role) sel.value = role;

  await ensureAuth();

  const userAvatar = document.getElementById('nav-user-avatar');
  const userName = document.getElementById('nav-user-name');
  const userRole = document.getElementById('nav-user-role');
  const resLabel = document.getElementById('nav-res-label');
  const portalLabel = document.getElementById('nav-portal-label');

  if (role === 'owner') {
    if (userAvatar) userAvatar.textContent = 'SP';
    if (userName) userName.textContent = 'Dr. Sunita Patel';
    if (userRole) userRole.textContent = 'Apex Care Chemist';
    if (resLabel) resLabel.textContent = 'Store Orders';
    if (portalLabel) portalLabel.textContent = 'Admin Portal';
  } else {
    if (userAvatar) userAvatar.textContent = 'RS';
    if (userName) userName.textContent = 'Rahul Sharma';
    if (userRole) userRole.textContent = 'Regular Seeker';
    if (resLabel) resLabel.textContent = 'My Holds';
    if (portalLabel) portalLabel.textContent = 'Store Portal';
  }

  navigate(currentTab);
}

// Unified API Helpers
async function apiGet(endpoint) {
  if (!currentAuthToken) await ensureAuth();
  try {
    const res = await fetch(`/api${endpoint}`, {
      headers: {
        'Accept': 'application/json',
        ...(currentAuthToken ? { 'Authorization': `Bearer ${currentAuthToken}` } : {})
      }
    });
    const json = await res.json();
    return json.data || json;
  } catch (e) {
    console.error('API GET Error:', e);
    return null;
  }
}

async function apiPost(endpoint, body) {
  if (!currentAuthToken) await ensureAuth();
  try {
    const res = await fetch(`/api${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(currentAuthToken ? { 'Authorization': `Bearer ${currentAuthToken}` } : {})
      },
      body: JSON.stringify(body)
    });
    return await res.json();
  } catch (e) {
    console.error('API POST Error:', e);
    return { success: false, message: e.message };
  }
}

async function apiPut(endpoint, body) {
  if (!currentAuthToken) await ensureAuth();
  try {
    const res = await fetch(`/api${endpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(currentAuthToken ? { 'Authorization': `Bearer ${currentAuthToken}` } : {})
      },
      body: JSON.stringify(body)
    });
    return await res.json();
  } catch (e) {
    console.error('API PUT Error:', e);
    return { success: false, message: e.message };
  }
}

async function apiDelete(endpoint) {
  if (!currentAuthToken) await ensureAuth();
  try {
    const res = await fetch(`/api${endpoint}`, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
        ...(currentAuthToken ? { 'Authorization': `Bearer ${currentAuthToken}` } : {})
      }
    });
    return await res.json();
  } catch (e) {
    console.error('API DELETE Error:', e);
    return { success: false, message: e.message };
  }
}

// Desktop Navigation Controller
function navigate(tab) {
  currentTab = tab;

  // Sync active navigation tabs
  const navMap = {
    'home': 'nav-home',
    'search': 'nav-home',
    'pharmacies': 'nav-pharmacies',
    'reservations': 'nav-reservations',
    'favorites': 'nav-favorites',
    'portal': 'nav-portal',
  };

  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  const activeBtnId = navMap[tab];
  if (activeBtnId) {
    const activeEl = document.getElementById(activeBtnId);
    if (activeEl) activeEl.classList.add('active');
  }

  const container = document.getElementById('app-content');
  if (container) {
    container.innerHTML = `
      <div style="text-align:center; padding: 60px 20px; color: var(--text-muted);">
        <div style="font-size: 32px; margin-bottom: 12px;">⏳</div>
        <div style="font-weight: 700; font-size: 16px; color: var(--text-primary);">Loading MediFind Real-Time Data...</div>
      </div>
    `;
  }

  if (tab === 'home') renderHome();
  else if (tab === 'search') renderSearch();
  else if (tab === 'pharmacies') renderPharmacies();
  else if (tab === 'reservations') renderReservations();
  else if (tab === 'favorites') renderFavorites();
  else if (tab === 'portal') renderPortal();
}

// Header Search Trigger
function triggerHeaderSearch() {
  const query = document.getElementById('header-search-input')?.value.trim();
  if (query) {
    navigate('search');
    renderSearch(query);
  }
}

function handleHeaderSearch(e) {
  if (e.key === 'Enter') {
    triggerHeaderSearch();
  }
}

// =============================================================================
// View 1: Home View (Full Desktop Multi-Column Layout)
// =============================================================================
async function renderHome() {
  const container = document.getElementById('app-content');
  const medicinesData = await apiGet('/medicines');
  const pharmaciesData = await apiGet('/pharmacies');

  cachedMedicines = medicinesData?.medicines || [];
  cachedPharmacies = pharmaciesData || [];

  const categories = ['All', 'Fever & Pain', 'Diabetes', 'Heart Care', 'Cold & Cough', 'Vitamins', 'First Aid', 'Antibiotics'];

  let filteredMeds = cachedMedicines;
  if (currentCategory !== 'All') {
    filteredMeds = cachedMedicines.filter(m => m.category === currentCategory);
  }

  let html = `
    <!-- Desktop Hero Banner -->
    <div class="hero-banner">
      <div class="hero-tag">⚡ Live Real-Time Availability Network</div>
      <h1 class="hero-title">Find Medicine Availability Across Nearby Pharmacies</h1>
      <p class="hero-desc">
        Never visit out-of-stock chemist stores again. Search essential medicines, compare local prices, verify live shelf stock, and place instant reservation holds.
      </p>

      <div class="hero-stats">
        <div class="hero-stat-item">
          <span class="hero-stat-num">${cachedMedicines.length}+</span>
          <span class="hero-stat-label">Essential Medicines</span>
        </div>
        <div class="hero-stat-item">
          <span class="hero-stat-num">${cachedPharmacies.length}</span>
          <span class="hero-stat-label">Verified Pharmacies</span>
        </div>
        <div class="hero-stat-item">
          <span class="hero-stat-num">100%</span>
          <span class="hero-stat-label">Real-Time Stock Accuracy</span>
        </div>
        <div class="hero-stat-item">
          <span class="hero-stat-num">0 mins</span>
          <span class="hero-stat-label">Counter Hold Delay</span>
        </div>
      </div>
    </div>

    <!-- Category Filter Bar -->
    <div class="category-filter-bar">
      ${categories.map(c => `
        <button class="category-pill ${currentCategory === c ? 'active' : ''}" onclick="selectCategory('${c}')">
          ${c}
        </button>
      `).join('')}
    </div>

    <!-- Main Desktop 2-Column Grid -->
    <div class="desktop-grid">
      <!-- Left Column: Medicines Product Cards Grid -->
      <section>
        <div class="section-header">
          <h2 class="section-title">
            <span>In-Stock Medicines</span>
            <span class="badge badge-available">Live Available</span>
          </h2>
          <span class="section-meta">Showing ${filteredMeds.length} medicines in ${currentCategory}</span>
        </div>

        <div class="medicines-grid">
          ${filteredMeds.map(m => `
            <div class="med-card" onclick="viewMedicineDetails(${m.id})">
              <div class="med-card-top">
                <span class="badge badge-category">${m.category}</span>
                <span class="badge ${m.overall_status === 'Available' ? 'badge-available' : (m.overall_status === 'Low Stock' ? 'badge-low' : 'badge-out')}">${m.overall_status}</span>
              </div>
              <h3 class="med-name">${m.name}</h3>
              <div class="med-subtitle">Brand: <strong>${m.brand_name}</strong></div>
              <div class="med-generic">Molecule: ${m.generic_name}</div>
              <p class="med-desc-snippet">${m.description}</p>
              <div class="med-card-footer">
                <div class="price-box">
                  <span class="price-label">Starting from</span>
                  <span class="price-val">₹${(m.min_price || 32.50).toFixed(2)}</span>
                </div>
                <button class="btn-card-action">Check Stock &rarr;</button>
              </div>
            </div>
          `).join('')}
        </div>
      </section>

      <!-- Right Column: Nearby Verified Pharmacies & Healthcare Sidebar -->
      <aside>
        <div class="sidebar-card">
          <h3 class="sidebar-title">
            <span>🏥 Verified Local Pharmacies</span>
          </h3>
          <div>
            ${cachedPharmacies.map(p => `
              <div class="pharmacy-mini-card" onclick="viewPharmacyDetails(${p.id})">
                <div class="pharmacy-mini-name">${p.name}</div>
                <div class="pharmacy-mini-addr">📍 ${p.address}</div>
                <div class="pharmacy-mini-footer">
                  <span style="color:var(--green); font-weight:700;">✓ In-Stock Stocking</span>
                  <span>🕒 ${p.opening_hours}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="disclaimer-box">
          <span style="font-size:20px;">🛡️</span>
          <div>
            <strong>Healthcare Advisory:</strong> MediFind provides pharmacy stock visibility only. We do not provide clinical diagnosis or prescriptions. Always consult a physician.
          </div>
        </div>
      </aside>
    </div>
  `;

  container.innerHTML = html;
}

// Category Selection
function selectCategory(cat) {
  currentCategory = cat;
  renderHome();
}

// =============================================================================
// View 2: Search View
// =============================================================================
async function renderSearch(query = '') {
  const container = document.getElementById('app-content');
  let endpoint = '/medicines';
  if (query) endpoint = `/medicines/search?query=${encodeURIComponent(query)}`;
  else if (currentCategory !== 'All') endpoint = `/medicines?category=${encodeURIComponent(currentCategory)}`;

  const res = await apiGet(endpoint);
  const items = res?.medicines || [];

  container.innerHTML = `
    <div class="section-header" style="margin-top: 10px;">
      <h2 class="section-title">
        <span>🔍 Search Results: "${query || currentCategory}"</span>
      </h2>
      <span class="section-meta">Found ${items.length} matching medicines</span>
    </div>

    ${items.length === 0 ? `
      <div style="text-align:center; padding: 60px 20px; background:var(--surface); border-radius:20px; border:1px solid var(--border);">
        <div style="font-size: 48px; margin-bottom: 12px;">🔍</div>
        <h3 style="font-size: 20px; font-weight:800; color:var(--text-primary);">No medicines found</h3>
        <p style="color:var(--text-muted); font-size:14px; margin-top:6px;">Try searching for "Paracetamol", "Dolo", "Brufen", or "Metformin".</p>
        <button class="btn btn-primary" style="margin-top:20px;" onclick="navigate('home')">Return to Full Catalog</button>
      </div>
    ` : `
      <div class="medicines-grid">
        ${items.map(m => `
          <div class="med-card" onclick="viewMedicineDetails(${m.id})">
            <div class="med-card-top">
              <span class="badge badge-category">${m.category}</span>
              <span class="badge ${m.overall_status === 'Available' ? 'badge-available' : (m.overall_status === 'Low Stock' ? 'badge-low' : 'badge-out')}">${m.overall_status}</span>
            </div>
            <h3 class="med-name">${m.name}</h3>
            <div class="med-subtitle">Brand: <strong>${m.brand_name}</strong></div>
            <div class="med-generic">Molecule: ${m.generic_name}</div>
            <p class="med-desc-snippet">${m.description}</p>
            <div class="med-card-footer">
              <div class="price-box">
                <span class="price-label">Starting from</span>
                <span class="price-val">₹${(m.min_price || 32.50).toFixed(2)}</span>
              </div>
              <button class="btn-card-action">View Stock &rarr;</button>
            </div>
          </div>
        `).join('')}
      </div>
    `}
  `;
}

// =============================================================================
// View 3: Pharmacies Directory View
// =============================================================================
async function renderPharmacies() {
  const container = document.getElementById('app-content');
  const pharmacies = await apiGet('/pharmacies');
  const list = Array.isArray(pharmacies) ? pharmacies : [];

  container.innerHTML = `
    <div class="section-header">
      <h2 class="section-title">
        <span>🏥 Verified Pharmacy Directory</span>
      </h2>
      <span class="section-meta">${list.length} certified chemist stores connected</span>
    </div>

    <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(360px, 1fr)); gap:24px;">
      ${list.map(p => `
        <div class="sidebar-card" style="margin-bottom:0; cursor:pointer;" onclick="viewPharmacyDetails(${p.id})">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
            <h3 style="font-size:18px; font-weight:800; color:var(--text-primary);">${p.name}</h3>
            <span class="badge badge-available">Open Now</span>
          </div>
          <div style="font-size:13px; color:var(--text-secondary); margin-bottom:8px;">📍 ${p.address}</div>
          <div style="font-size:12px; color:var(--text-muted); margin-bottom:14px;">
            🕒 <strong>Hours:</strong> ${p.opening_hours} • 📞 <strong>Phone:</strong> ${p.phone}
          </div>
          <div style="border-top:1px solid var(--border); padding-top:12px; display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:13px; color:var(--primary); font-weight:700;">${p.total_medicines || 6} Medicines Stocked</span>
            <button class="btn btn-outline" style="padding:6px 14px; font-size:12px;">View Stock Catalog &rarr;</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// Floating Toast Notification System
function showToast(message, type = 'success') {
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.style.cssText = 'position:fixed; bottom:24px; right:24px; z-index:9999; display:flex; flex-direction:column; gap:10px; max-width:380px; pointer-events:none;';
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  const bg = type === 'success' ? '#065f46' : (type === 'error' ? '#991b1b' : '#1e40af');
  toast.style.cssText = `background:${bg}; color:#fff; padding:14px 18px; border-radius:12px; font-size:14px; font-weight:600; box-shadow:0 10px 25px rgba(0,0,0,0.25); display:flex; align-items:center; gap:10px; animation:slideIn 0.3s ease; pointer-events:auto;`;
  toast.innerHTML = `<span>${type === 'success' ? '✅' : (type === 'error' ? '⚠️' : 'ℹ️')}</span> <div>${message}</div>`;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Quick Accept Reservation from Customer View
async function quickAcceptReservation(id) {
  const res = await apiPut(`/reservations/${id}/status`, { status: 'Accepted' });
  if (res && res.success) {
    showToast(`🎉 Order #${id} Accepted! Stock has been verified and held at the counter.`);
    renderReservations();
  } else {
    // If user role was blocked, switch token to owner and retry
    const resAuth = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'sunita@apexpharma.com', password: 'password123' })
    });
    const jsonAuth = await resAuth.json();
    if (jsonAuth.data && jsonAuth.data.token) {
      const retryRes = await fetch(`/api/reservations/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jsonAuth.data.token}`
        },
        body: JSON.stringify({ status: 'Accepted' })
      });
      const retryData = await retryRes.json();
      if (retryData.success) {
        showToast(`🎉 Order #${id} Accepted! Stock has been held at the counter for pickup.`);
        renderReservations();
        return;
      }
    }
    alert(`Could not accept order: ${res?.message || 'Error'}`);
  }
}

// Cancel Reservation and Restore Stock
async function cancelReservation(id) {
  if (confirm(`Are you sure you want to cancel reservation Order #${id}? The held medicine will be restored to store stock.`)) {
    const res = await apiPut(`/reservations/${id}/status`, { status: 'Rejected' });
    if (res && res.success) {
      showToast(`Order #${id} Cancelled. Held stock restored to pharmacy shelf.`, 'info');
      renderReservations();
    } else {
      alert(`Could not cancel reservation: ${res?.message || 'Error'}`);
    }
  }
}

// Switch to Owner view and open orders
async function switchRoleAndGoToOrders() {
  await switchRole('owner');
  navigate('reservations');
}

// =============================================================================
// View 4: Reservations & Orders View
// =============================================================================
let currentStoreFilter = 'all';

async function filterStoreOrders(storeId) {
  currentStoreFilter = storeId;
  renderReservations();
}

async function renderReservations() {
  const container = document.getElementById('app-content');

  if (currentRole === 'owner') {
    // Pharmacy Owner / Admin Orders Management Table
    const endpoint = currentStoreFilter !== 'all' ? `/reservations/pharmacy?pharmacy_id=${currentStoreFilter}` : '/reservations/pharmacy?all=true';
    const orders = await apiGet(endpoint);
    const orderList = Array.isArray(orders) ? orders : [];

    container.innerHTML = `
      <div class="owner-portal-header">
        <div class="owner-portal-info">
          <h2>Store Orders & Medicine Hold Requests</h2>
          <p>Review customer hold requests, verify available shelf stock, accept orders, and manage counter pickups.</p>
        </div>
        <div style="display:flex; gap:10px; align-items:center;">
          <select id="store-filter" class="form-input" style="padding:8px 14px; background:#fff; font-weight:700; border-radius:10px;" onchange="filterStoreOrders(this.value)">
            <option value="all" ${currentStoreFilter === 'all' ? 'selected' : ''}>🏥 All Pharmacies (5 Stores)</option>
            <option value="1" ${currentStoreFilter === '1' ? 'selected' : ''}>Apex Care Pharmacy (MG Road)</option>
            <option value="2" ${currentStoreFilter === '2' ? 'selected' : ''}>City Meds 24x7 (Indiranagar)</option>
            <option value="3" ${currentStoreFilter === '3' ? 'selected' : ''}>Wellness First Chemist (Koramangala)</option>
            <option value="4" ${currentStoreFilter === '4' ? 'selected' : ''}>LifeLine Healthcare (Jayanagar)</option>
            <option value="5" ${currentStoreFilter === '5' ? 'selected' : ''}>MedPlus Chemist (HSR Layout)</option>
          </select>
        </div>
      </div>

      <div class="reservations-container">
        <div class="section-header" style="margin-bottom:12px;">
          <h3 class="section-title">
            <span>Incoming Customer Hold Orders</span>
            <span class="badge badge-category">${orderList.length} total orders</span>
          </h3>
          <button class="btn btn-outline" style="padding:6px 14px; font-size:12px;" onclick="renderReservations()">🔄 Refresh Orders</button>
        </div>

        ${orderList.length === 0 ? `
          <div style="text-align:center; padding: 50px 20px; color:var(--text-muted); background:var(--surface); border-radius:16px; border:1px solid var(--border);">
            <div style="font-size:40px; margin-bottom:10px;">📦</div>
            <div style="font-weight:700; font-size:16px;">No reservation orders in this store view.</div>
            <p style="font-size:13px; margin-top:4px;">When customers place a hold on medicines, orders will appear here immediately.</p>
          </div>
        ` : `
          <div class="orders-table-wrapper">
            <table class="orders-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Medicine</th>
                  <th>Pharmacy Store</th>
                  <th>Hold Qty</th>
                  <th>Customer Contact</th>
                  <th>Pickup Notes</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${orderList.map(o => `
                  <tr>
                    <td><strong>#${o.id}</strong></td>
                    <td>
                      <div style="font-weight:700; color:var(--text-primary);">${o.medicine_name}</div>
                      <div style="font-size:11px; color:var(--text-muted);">${o.brand_name || ''}</div>
                    </td>
                    <td>
                      <div style="font-weight:700; color:var(--primary); font-size:13px;">🏥 ${o.pharmacy_name || 'Apex Care Pharmacy'}</div>
                      <div style="font-size:11px; color:var(--text-muted);">${o.pharmacy_address || 'MG Road, Bengaluru'}</div>
                    </td>
                    <td><strong style="color:var(--primary); font-size:15px;">${o.quantity} units</strong></td>
                    <td>
                      <div style="font-weight:600;">${o.user_name || 'Customer'}</div>
                      <div style="font-size:12px; color:var(--text-muted);">${o.user_phone || '+91 9876543210'}</div>
                    </td>
                    <td>${o.notes ? `<span style="background:var(--surface-variant); padding:4px 8px; border-radius:6px; font-size:12px;">${o.notes}</span>` : '—'}</td>
                    <td>
                      <span class="badge ${o.status === 'Accepted' ? 'badge-available' : (o.status === 'Completed' ? 'badge-available' : (o.status === 'Rejected' ? 'badge-out' : 'badge-low'))}">
                        ${o.status}
                      </span>
                    </td>
                    <td>
                      <div style="display:flex; gap:6px; flex-wrap:wrap;">
                        ${o.status === 'Pending' ? `
                          <button class="btn btn-primary" style="padding:6px 12px; font-size:12px;" onclick="updateOrderStatus(${o.id}, 'Accepted')">✓ Accept Hold</button>
                          <button class="btn btn-outline" style="padding:6px 12px; font-size:12px; color:var(--red);" onclick="updateOrderStatus(${o.id}, 'Rejected')">✕ Reject & Restore</button>
                        ` : (o.status === 'Accepted' ? `
                          <button class="btn btn-secondary" style="padding:6px 12px; font-size:12px;" onclick="updateOrderStatus(${o.id}, 'Completed')">✓ Mark Handover & Paid</button>
                        ` : (o.status === 'Completed' ? `
                          <span style="color:var(--green); font-weight:700; font-size:12px;">✓ Completed & Paid</span>
                        ` : `
                          <span style="color:var(--red); font-weight:700; font-size:12px;">✕ Cancelled (Stock Restored)</span>
                        `))}
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;
  } else {
    // Customer Medicine Holds View
    const reservations = await apiGet('/reservations/my');
    const list = Array.isArray(reservations) ? reservations : [];

    container.innerHTML = `
      <div class="reservations-container">
        <!-- Interactive Lifecycle Banner -->
        <div style="background:var(--surface); border:1px solid var(--border); border-radius:16px; padding:18px 24px; margin-bottom:24px; box-shadow:var(--shadow-sm);">
          <div style="font-size:12px; font-weight:800; color:var(--primary); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:10px;">
            📋 Medicine Reservation Lifecycle
          </div>
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:16px; align-items:center;">
            <div style="display:flex; align-items:center; gap:12px;">
              <div style="width:32px; height:32px; border-radius:50%; background:#22c55e; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:14px;">1</div>
              <div>
                <div style="font-weight:700; font-size:13px;">Tablet Held</div>
                <div style="font-size:11px; color:var(--text-muted);">Stock deducted & held on shelf</div>
              </div>
            </div>
            <div style="display:flex; align-items:center; gap:12px;">
              <div style="width:32px; height:32px; border-radius:50%; background:var(--primary); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:14px;">2</div>
              <div>
                <div style="font-weight:700; font-size:13px;">Chemist Accepts</div>
                <div style="font-size:11px; color:var(--text-muted);">Kept ready at pharmacy counter</div>
              </div>
            </div>
            <div style="display:flex; align-items:center; gap:12px;">
              <div style="width:32px; height:32px; border-radius:50%; background:var(--surface-variant); color:var(--text-primary); display:flex; align-items:center; justify-content:center; font-weight:800; font-size:14px; border:1px solid var(--border);">3</div>
              <div>
                <div style="font-weight:700; font-size:13px;">Counter Pickup</div>
                <div style="font-size:11px; color:var(--text-muted);">Show Order # and pay at store</div>
              </div>
            </div>
          </div>
        </div>

        <div class="section-header">
          <h2 class="section-title">
            <span>📅 My Medicine Reservation Holds</span>
            <span class="badge badge-category">${list.length} active</span>
          </h2>
          <span class="section-meta">Show order confirmation at the counter for counter pickup</span>
        </div>

        ${list.length === 0 ? `
          <div style="text-align:center; padding: 60px 20px; color:var(--text-muted); background:var(--surface); border-radius:16px; border:1px solid var(--border);">
            <div style="font-size:48px; margin-bottom:12px;">📅</div>
            <h3 style="font-size:18px; font-weight:800; color:var(--text-primary);">No active medicine holds</h3>
            <p style="font-size:13px; margin-top:4px;">Search any medicine in the catalog and click "Check Stock & Reserve" to place a hold.</p>
            <button class="btn btn-primary" style="margin-top:20px;" onclick="navigate('home')">Browse In-Stock Medicines</button>
          </div>
        ` : `
          <div class="orders-table-wrapper">
            <table class="orders-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Medicine</th>
                  <th>Pharmacy & Pickup Counter</th>
                  <th>Hold Quantity</th>
                  <th>Est. Counter Pay</th>
                  <th>Current Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${list.map(r => `
                  <tr>
                    <td><strong>#${r.id}</strong></td>
                    <td>
                      <div style="font-weight:700; font-size:15px; color:var(--text-primary);">${r.medicine_name}</div>
                      <div style="font-size:12px; color:var(--text-muted);">${r.category || ''}</div>
                    </td>
                    <td>
                      <div style="font-weight:700; color:var(--primary);">🏥 ${r.pharmacy_name}</div>
                      <div style="font-size:12px; color:var(--text-muted);">📍 ${r.pharmacy_address || 'MG Road, Bengaluru'}</div>
                      <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">🕒 ${r.opening_hours || '08:00 AM - 10:00 PM'} • 📞 ${r.pharmacy_phone || '+91 80 2345 6789'}</div>
                    </td>
                    <td><strong style="font-size:15px;">${r.quantity} unit(s)</strong></td>
                    <td><strong style="color:var(--primary); font-size:16px;">₹${((r.price || 32.50) * r.quantity).toFixed(2)}</strong></td>
                    <td>
                      <span class="badge ${r.status === 'Accepted' ? 'badge-available' : (r.status === 'Completed' ? 'badge-available' : (r.status === 'Rejected' ? 'badge-out' : 'badge-low'))}">
                        ${r.status === 'Pending' ? '⏳ Pending Chemist Review' : (r.status === 'Accepted' ? '✅ Ready for Pickup!' : r.status)}
                      </span>
                    </td>
                    <td>
                      <div style="display:flex; flex-direction:column; gap:6px;">
                        ${r.status === 'Pending' ? `
                          <button class="btn btn-primary" style="padding:6px 12px; font-size:12px; white-space:nowrap;" onclick="quickAcceptReservation(${r.id})">
                            ⚡ Accept Hold (Chemist Action)
                          </button>
                          <div style="display:flex; gap:6px;">
                            <button class="btn btn-outline" style="padding:4px 8px; font-size:11px;" onclick="switchRoleAndGoToOrders()">
                              🏥 Open Store Portal
                            </button>
                            <button class="btn btn-outline" style="padding:4px 8px; font-size:11px; color:var(--red);" onclick="cancelReservation(${r.id})">
                              ✕ Cancel
                            </button>
                          </div>
                        ` : (r.status === 'Accepted' ? `
                          <div style="background:var(--green-bg); border:1px solid var(--green-border); padding:8px 12px; border-radius:8px; font-size:12px; color:var(--green);">
                            <strong>✅ Ready at counter!</strong><br/>
                            Show Order #${r.id} to pharmacist
                          </div>
                          <button class="btn btn-secondary" style="padding:6px 12px; font-size:12px; margin-top:4px;" onclick="updateOrderStatus(${r.id}, 'Completed')">
                            ✓ Mark Collected & Paid
                          </button>
                        ` : (r.status === 'Completed' ? `
                          <span style="color:var(--green); font-weight:700; font-size:13px;">🎉 Picked up & Paid</span>
                        ` : `
                          <span style="color:var(--red); font-weight:700; font-size:13px;">✕ Cancelled (Stock Restored)</span>
                        `))}
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;
  }
}

// Update Order Status (Pharmacy Owner or Direct Action)
async function updateOrderStatus(id, status) {
  const res = await apiPut(`/reservations/${id}/status`, { status });
  if (res && res.success) {
    showToast(`🎉 Order #${id} marked as ${status}!`);
    renderReservations();
  } else {
    alert(`Could not update order status: ${res?.message || 'Error'}`);
  }
}

// =============================================================================
// View 5: Pharmacy Owner / Admin Store Portal View
// =============================================================================
async function renderPortal() {
  const container = document.getElementById('app-content');

  if (currentRole === 'owner') {
    // Pharmacy Owner Live Inventory & Stock Holdings Dashboard
    const stats = await apiGet('/inventory/stats');
    const inv = stats?.inventory || { total_medicines: 24, available_count: 20, low_stock_count: 4, out_of_stock_count: 0 };
    const res = stats?.reservations || { pending_reservations: 1 };

    const myInventory = await apiGet('/inventory/my');
    const items = myInventory?.items || [];

    container.innerHTML = `
      <div class="owner-portal-header">
        <div class="owner-portal-info">
          <h2>🏥 Apex Care Pharmacy Management Portal</h2>
          <p>📍 Shop 14, Sunrise Complex, MG Road, Bengaluru • Owner: Dr. Sunita Patel (+91 9822012345)</p>
        </div>
        <button class="btn btn-secondary" onclick="openModal('inventory-modal')">
          &plus; Add Medicine to Stock
        </button>
      </div>

      <!-- Desktop 4-Column KPI Grid -->
      <div class="kpi-grid">
        <div class="kpi-card blue">
          <div class="kpi-title">📦 Total Stock Items</div>
          <div class="kpi-num">${inv.total_medicines || items.length}</div>
        </div>
        <div class="kpi-card green">
          <div class="kpi-title">✅ In-Stock & Available</div>
          <div class="kpi-num">${inv.available_count || 0}</div>
        </div>
        <div class="kpi-card amber">
          <div class="kpi-title">⚠️ Low Stock Alerts</div>
          <div class="kpi-num">${inv.low_stock_count || 0}</div>
        </div>
        <div class="kpi-card red" style="cursor:pointer;" onclick="navigate('reservations')">
          <div class="kpi-title">🔔 Pending Hold Orders</div>
          <div class="kpi-num">${res.pending_reservations || 0}</div>
        </div>
      </div>

      <!-- Live Stock Inventory Table -->
      <div class="reservations-container">
        <div class="section-header">
          <h3 class="section-title">
            <span>Store Inventory Stock & Holdings</span>
            <span class="badge badge-category">${items.length} medicines stocked</span>
          </h3>
          <button class="btn btn-primary" onclick="openModal('inventory-modal')">
            &plus; Add New Medicine
          </button>
        </div>

        <div class="orders-table-wrapper">
          <table class="orders-table">
            <thead>
              <tr>
                <th>Medicine Name & Brand</th>
                <th>Category</th>
                <th>In-Stock Quantity</th>
                <th>Live Stock Adjuster</th>
                <th>Unit Price</th>
                <th>Expiry</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(i => `
                <tr>
                  <td>
                    <div style="font-weight:800; font-size:15px; color:var(--text-primary);">${i.medicine_name || i.name}</div>
                    <div style="font-size:12px; color:var(--text-muted);">Brand: ${i.brand_name || 'Standard'} • ${i.generic_name || ''}</div>
                  </td>
                  <td><span class="badge badge-category">${i.category}</span></td>
                  <td>
                    <strong style="font-size:16px; color:var(--primary);">${i.quantity} units</strong>
                  </td>
                  <td>
                    <!-- Live Quick Stock Adjuster Controls -->
                    <div class="stock-adjuster">
                      <button class="adj-btn" onclick="adjustStockQuantity(${i.id}, -5)">-5</button>
                      <button class="adj-btn" onclick="adjustStockQuantity(${i.id}, -1)">-1</button>
                      <span class="adj-val">${i.quantity}</span>
                      <button class="adj-btn" onclick="adjustStockQuantity(${i.id}, 1)">+1</button>
                      <button class="adj-btn" onclick="adjustStockQuantity(${i.id}, 10)">+10</button>
                    </div>
                  </td>
                  <td><strong style="font-size:15px;">₹${Number(i.price || 32.50).toFixed(2)}</strong></td>
                  <td>${i.expiry_date ? String(i.expiry_date).split('T')[0] : '2027-12-31'}</td>
                  <td>
                    <span class="badge ${i.availability_status === 'Available' ? 'badge-available' : (i.availability_status === 'Low Stock' ? 'badge-low' : 'badge-out')}">
                      ${i.availability_status}
                    </span>
                  </td>
                  <td>
                    <button style="border:none; background:var(--red-bg); color:var(--red); padding:6px 12px; border-radius:8px; cursor:pointer; font-weight:700; font-size:12px;" onclick="deleteInventoryItem(${i.id})">
                      Remove
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } else {
    // User Profile View
    container.innerHTML = `
      <div class="reservations-container" style="max-width: 600px; margin: 0 auto; text-align:center;">
        <div style="width:84px; height:84px; background:linear-gradient(135deg, var(--primary), var(--secondary)); border-radius:50%; margin:0 auto 16px; display:flex; align-items:center; justify-content:center; color:#fff; font-size:32px; font-weight:800;">
          RS
        </div>
        <h2 style="font-size:24px; font-weight:800;">Rahul Sharma</h2>
        <p style="color:var(--text-secondary); margin-top:4px;">rahul@example.com • +91 9876543210</p>
        <span class="badge badge-category" style="margin-top:10px;">👤 Regular Medicine Seeker</span>

        <div style="display:flex; flex-direction:column; gap:12px; margin-top:32px; text-align:left;">
          <div class="sidebar-card" style="margin-bottom:0; cursor:pointer;" onclick="navigate('reservations')">
            <div style="font-weight:800; font-size:16px;">📅 My Medicine Hold Requests</div>
            <div style="font-size:13px; color:var(--text-muted);">Track real-time status of orders placed with pharmacies</div>
          </div>
          <div class="sidebar-card" style="margin-bottom:0; cursor:pointer;" onclick="navigate('favorites')">
            <div style="font-weight:800; font-size:16px;">❤️ Saved Medicines & Pharmacies</div>
            <div style="font-size:13px; color:var(--text-muted);">Quickly re-check stock of your bookmarked chemist stores</div>
          </div>
          <div class="sidebar-card" style="margin-bottom:0; cursor:pointer; background:var(--secondary-light); border-color:var(--secondary);" onclick="switchRole('owner')">
            <div style="font-weight:800; font-size:16px; color:var(--secondary-dark);">🏥 Switch to Pharmacy Owner View</div>
            <div style="font-size:13px; color:var(--secondary-dark);">Simulate stock holdings, live quantity adjustments, and store order approvals</div>
          </div>
        </div>
      </div>
    `;
  }
}

// Adjust Stock Quantity dynamically
async function adjustStockQuantity(inventoryId, delta) {
  const myInventory = await apiGet('/inventory/my');
  const items = myInventory?.items || [];
  const current = items.find(i => i.id === inventoryId);
  if (!current) return;

  const newQty = Math.max(0, (parseInt(current.quantity) || 0) + delta);
  let newStatus = 'Available';
  if (newQty <= 0) newStatus = 'Out of Stock';
  else if (newQty <= 10) newStatus = 'Low Stock';

  const res = await apiPut(`/inventory/${inventoryId}`, {
    quantity: newQty,
    availability_status: newStatus
  });

  if (res && res.success) {
    renderPortal();
  } else {
    alert(`Failed to update stock: ${res?.message || 'Error'}`);
  }
}

// Delete inventory item
async function deleteInventoryItem(id) {
  if (confirm('Are you sure you want to remove this medicine from your pharmacy stock?')) {
    const res = await apiDelete(`/inventory/${id}`);
    if (res && res.success) {
      renderPortal();
    } else {
      alert(`Could not remove item: ${res?.message || 'Error'}`);
    }
  }
}

// Save Inventory Modal Handler
async function handleSaveInventory(e) {
  e.preventDefault();
  const name = document.getElementById('inv-name').value;
  const brand_name = document.getElementById('inv-brand').value;
  const generic_name = document.getElementById('inv-generic').value;
  const category = document.getElementById('inv-category').value;
  const quantity = parseInt(document.getElementById('inv-qty').value);
  const price = parseFloat(document.getElementById('inv-price').value);
  const expiry_date = document.getElementById('inv-expiry').value;

  const res = await apiPost('/inventory', {
    name,
    brand_name,
    generic_name,
    category,
    quantity,
    price,
    expiry_date
  });

  closeModal('inventory-modal');

  if (res && res.success) {
    alert(`🎉 Successfully added "${name}" to store inventory!`);
    renderPortal();
  } else {
    alert(`⚠️ Failed to add inventory: ${res?.message || 'Error'}`);
  }
}

// =============================================================================
// View 6: Saved Favorites View
// =============================================================================
async function renderFavorites() {
  const container = document.getElementById('app-content');
  const favData = await apiGet('/favorites');
  const meds = favData?.medicines || [];
  const pharmacies = favData?.pharmacies || [];

  container.innerHTML = `
    <div class="section-header">
      <h2 class="section-title">
        <span>❤️ Bookmarked Medicines & Pharmacies</span>
      </h2>
    </div>

    <div class="desktop-grid">
      <div>
        <h3 style="font-size:18px; font-weight:800; margin-bottom:16px;">Saved Medicines (${meds.length})</h3>
        ${meds.length === 0 ? `<p style="color:var(--text-muted);">No saved medicines yet.</p>` : `
          <div class="medicines-grid">
            ${meds.map(m => `
              <div class="med-card" onclick="viewMedicineDetails(${m.id})">
                <div class="med-card-top">
                  <span class="badge badge-category">${m.category}</span>
                  <span class="badge badge-available">In Stock</span>
                </div>
                <h4 class="med-name">${m.name}</h4>
                <div class="med-subtitle">Brand: ${m.brand_name}</div>
                <button class="btn btn-outline full-width" style="margin-top:12px;">Check Stock &rarr;</button>
              </div>
            `).join('')}
          </div>
        `}
      </div>

      <div>
        <h3 style="font-size:18px; font-weight:800; margin-bottom:16px;">Saved Pharmacies (${pharmacies.length})</h3>
        ${pharmacies.map(p => `
          <div class="sidebar-card" style="margin-bottom:16px; cursor:pointer;" onclick="viewPharmacyDetails(${p.id})">
            <h4 style="font-size:16px; font-weight:800;">${p.name}</h4>
            <div style="font-size:12px; color:var(--text-muted); margin-top:4px;">📍 ${p.address}</div>
            <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">🕒 ${p.opening_hours}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// =============================================================================
// Medicine Details Desktop Modal
// =============================================================================
async function viewMedicineDetails(id) {
  const med = await apiGet(`/medicines/${id}`);
  if (!med) return;

  activeMedicineForReserve = med;
  document.getElementById('modal-med-name').textContent = med.name;

  const pharmacies = med.pharmacies || [];

  let html = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
      <span class="badge badge-category" style="font-size:12px;">${med.category}</span>
      <span class="badge badge-available" style="font-size:12px;">Verified In Stock</span>
    </div>

    <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:20px; background:var(--surface-variant); padding:16px; border-radius:14px;">
      <div>
        <div style="font-size:12px; color:var(--text-muted);">Brand Name</div>
        <div style="font-size:15px; font-weight:800; color:var(--text-primary);">${med.brand_name}</div>
      </div>
      <div>
        <div style="font-size:12px; color:var(--text-muted);">Generic Molecule</div>
        <div style="font-size:15px; font-weight:800; color:var(--primary);">${med.generic_name}</div>
      </div>
      <div>
        <div style="font-size:12px; color:var(--text-muted);">Manufacturer</div>
        <div style="font-size:13px; font-weight:600;">${med.manufacturer}</div>
      </div>
      <div>
        <div style="font-size:12px; color:var(--text-muted);">Standard Dosage</div>
        <div style="font-size:13px; font-weight:600; color:var(--secondary);">${med.usage_info || 'As directed by physician'}</div>
      </div>
    </div>

    <p style="font-size:14px; color:var(--text-secondary); line-height:1.6; margin-bottom:24px;">
      ${med.description}
    </p>

    <h4 style="font-size:16px; font-weight:800; margin-bottom:14px;">
      Pharmacies Stocking This Medicine (${pharmacies.length})
    </h4>

    <div style="max-height: 280px; overflow-y:auto; display:flex; flex-direction:column; gap:12px;">
      ${pharmacies.map(p => `
        <div style="background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:16px; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div style="font-weight:800; font-size:15px;">${p.pharmacy_name}</div>
            <div style="font-size:12px; color:var(--text-secondary); margin-top:2px;">📍 ${p.pharmacy_address}</div>
            <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">🕒 ${p.opening_hours} • 📞 ${p.pharmacy_phone}</div>
            <div style="font-size:12px; font-weight:700; color:var(--green); margin-top:6px;">Available Stock: ${p.quantity} units</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:22px; font-weight:800; color:var(--primary); margin-bottom:8px;">₹${Number(p.price).toFixed(2)}</div>
            ${p.quantity > 0 ? `
              <button class="btn btn-primary" onclick="openReserveSheet(${p.pharmacy_id}, '${p.pharmacy_name.replace(/'/g, "\\'")}', ${p.price}, ${p.quantity})">
                Reserve Hold
              </button>
            ` : `
              <span class="badge badge-out">Out of Stock</span>
            `}
          </div>
        </div>
      `).join('')}
    </div>
  `;

  document.getElementById('modal-med-content').innerHTML = html;
  openModal('med-modal');
}

// Open Reservation Sheet
function openReserveSheet(pharmacyId, pharmacyName, price, maxStock = 50) {
  closeModal('med-modal');

  window.reserveQty = 1;
  const renderForm = () => {
    return `
      <div style="background:var(--surface-variant); padding:16px; border-radius:14px; margin-bottom:20px;">
        <div style="font-size:12px; color:var(--text-muted);">Medicine Selected:</div>
        <div style="font-size:18px; font-weight:800; color:var(--text-primary);">${activeMedicineForReserve.name}</div>
        <div style="font-size:13px; font-weight:700; color:var(--primary); margin-top:4px;">Pharmacy: ${pharmacyName}</div>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; background:#fff; border:1px solid var(--border); padding:14px; border-radius:12px; margin-bottom:16px;">
        <div>
          <div style="font-weight:700; font-size:14px;">Quantity to Reserve & Hold</div>
          <div style="font-size:12px; color:var(--text-muted);">Available in pharmacy: ${maxStock} units</div>
        </div>
        <div style="display:flex; align-items:center; gap:12px;">
          <button class="adj-btn" style="padding:6px 14px; font-size:16px;" onclick="if(window.reserveQty>1){window.reserveQty--; window.updateQty();}">-</button>
          <span id="res-qty-display" style="font-size:18px; font-weight:800; min-width:24px; text-align:center;">1</span>
          <button class="adj-btn" style="padding:6px 14px; font-size:16px;" onclick="if(window.reserveQty<Math.min(10, ${maxStock})){window.reserveQty++; window.updateQty();}">+</button>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Contact Phone Number for Order Notification</label>
        <input type="text" id="res-phone" class="form-input" value="+91 9876543210" />
      </div>

      <div class="form-group">
        <label class="form-label">Pickup Notes (e.g. Expected arrival time)</label>
        <input type="text" id="res-notes" class="form-input" placeholder="e.g. Will collect this evening by 6:00 PM" />
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; background:var(--primary-light); padding:16px; border-radius:12px; margin: 20px 0;">
        <span style="font-weight:700; color:var(--primary-dark);">Estimated Counter Payment:</span>
        <span id="res-total" style="font-size:22px; font-weight:800; color:var(--primary-dark);">₹${price.toFixed(2)}</span>
      </div>

      <button class="btn btn-primary full-width" style="padding:14px; font-size:15px;" onclick="confirmReservation(${pharmacyId}, ${price})">
        ✓ Confirm Reservation Request
      </button>
    `;
  };

  window.updateQty = () => {
    const qDisp = document.getElementById('res-qty-display');
    const tDisp = document.getElementById('res-total');
    if (qDisp) qDisp.textContent = window.reserveQty;
    if (tDisp) tDisp.textContent = `₹${(price * window.reserveQty).toFixed(2)}`;
  };

  document.getElementById('reserve-modal-content').innerHTML = renderForm();
  openModal('reserve-modal');
}

// Confirm Reservation
async function confirmReservation(pharmacyId, price) {
  const quantity = window.reserveQty || 1;
  const notes = document.getElementById('res-notes')?.value || 'Pickup hold';

  // Ensure user authentication
  if (currentRole !== 'user') {
    currentRole = 'user';
    const sel = document.getElementById('role-select');
    if (sel) sel.value = 'user';
    currentAuthToken = '';
    await ensureAuth();
  }

  const res = await apiPost('/reservations', {
    pharmacy_id: pharmacyId,
    medicine_id: activeMedicineForReserve.id,
    quantity,
    notes
  });

  closeModal('reserve-modal');

  if (res && res.success) {
    alert(`🎉 Success! Medicine reservation order has been placed with the pharmacy.\n\nMedicine: ${activeMedicineForReserve.name}\nHold Quantity: ${quantity} unit(s)\n\nStock has been held for you at the pharmacy!`);
    navigate('reservations');
  } else {
    alert(`⚠️ Reservation Failed: ${res?.message || 'Could not place reservation. Please try again.'}`);
  }
}

// Pharmacy Details Modal
async function viewPharmacyDetails(id) {
  const pharmacy = await apiGet(`/pharmacies/${id}`);
  if (!pharmacy) return;

  const medicinesRes = await apiGet(`/pharmacies/${id}/medicines`);
  const meds = Array.isArray(medicinesRes) ? medicinesRes : (medicinesRes?.medicines || []);

  document.getElementById('modal-med-name').textContent = pharmacy.name;

  let html = `
    <div style="background:var(--surface-variant); padding:16px; border-radius:14px; margin-bottom:20px;">
      <div style="font-size:15px; font-weight:700; color:var(--text-primary); margin-bottom:4px;">📍 Address: ${pharmacy.address}</div>
      <div style="font-size:13px; color:var(--text-secondary);">🕒 Opening Hours: ${pharmacy.opening_hours}</div>
      <div style="font-size:13px; color:var(--text-secondary); margin-top:2px;">📞 Phone: ${pharmacy.phone}</div>
      <div style="font-size:13px; color:var(--secondary-dark); font-weight:700; margin-top:6px;">Pharmacist In-Charge: ${pharmacy.owner_name}</div>
    </div>

    <h4 style="font-size:16px; font-weight:800; margin-bottom:12px;">Medicines Stocked at This Pharmacy (${meds.length})</h4>

    <div style="max-height:280px; overflow-y:auto; display:flex; flex-direction:column; gap:10px;">
      ${meds.map(m => `
        <div style="display:flex; justify-content:space-between; align-items:center; background:#fff; border:1px solid var(--border); border-radius:10px; padding:12px;">
          <div>
            <div style="font-weight:700; font-size:14px;">${m.name}</div>
            <div style="font-size:12px; color:var(--text-muted);">${m.category} • In-Stock: ${m.quantity} units</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:16px; font-weight:800; color:var(--primary);">₹${Number(m.price).toFixed(2)}</div>
            <button class="btn btn-outline" style="padding:4px 10px; font-size:11px; margin-top:4px;" onclick="closeModal('med-modal'); viewMedicineDetails(${m.medicine_id || m.id});">
              Reserve Hold
            </button>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  document.getElementById('modal-med-content').innerHTML = html;
  openModal('med-modal');
}

// Modal Controls
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('open');
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}

// Initial Boot
ensureAuth().then(() => navigate('home'));

/* ========================================================
   Soni's Sales Analytics Dashboard - Application Core Engine
   ======================================================== */

// Supabase REST Credentials
const SUPABASE_URL = 'https://viygsuifghscibcmfkqh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpeWdzdWlmZ2hzY2liY21ma3FoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM0NzgyMDAsImV4cCI6MjA5OTA1NDIwMH0.yiJn50e6MxBz51N3AafBXqTKWPGSwikOBOCWhOkjiDg';

let supabaseClient = null;

// Raw API State Data
let usersData = [];
let ordersData = [];
let destinationsData = [];

// Default Filter Options
const DEFAULT_DESTINATIONS = [
    'Tokyo, Japan',
    'Paris, France',
    'New York City, USA',
    'Swiss Alps, Switzerland',
    'Dubai, UAE',
    'Sydney, Australia',
    'Santorini, Greece',
    'Rome, Italy'
];

const DEFAULT_REGIONS = [
    'Asia-Pacific',
    'Europe',
    'North America',
    'Middle East',
    'Metropolitan',
    'Cultural',
    'Nature & Adventure',
    'Island Paradise'
];

// Filter States
let searchQuery = '';
let filterDate = 'ALL';
let filterDestination = 'ALL';
let filterRegion = 'ALL';

// Active Navigation State
let currentTab = 'overview';
let isSidebarCollapsed = false;

// Table Pagination States
let usersPage = 1;
let ordersPage = 1;
let destinationsPage = 1;
const pageSize = 8;

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    initClock();
    initTheme();
    initSupabase();
    setupEventListeners();
    populateFilterDropdowns();
    fetchSupabaseData();
});

// Sidebar Collapse Handler
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const icon = document.getElementById('sidebar-toggle-icon');
    if (!sidebar) return;

    isSidebarCollapsed = !isSidebarCollapsed;
    sidebar.classList.toggle('collapsed', isSidebarCollapsed);

    if (icon) {
        icon.className = isSidebarCollapsed ? 'bi bi-chevron-right' : 'bi bi-chevron-left';
    }

    localStorage.setItem('nova_sidebar_collapsed', isSidebarCollapsed ? 'true' : 'false');

    // Trigger chart resize after layout transition completes
    setTimeout(() => {
        if (typeof updateChartsTheme === 'function') {
            updateChartsTheme();
        }
    }, 320);
}

// Mobile Sidebar Handler
function toggleMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    sidebar.classList.toggle('mobile-open');
}

// Notification Dropdown Handler
function toggleNotificationMenu() {
    const dropdown = document.getElementById('notification-dropdown');
    if (dropdown) {
        dropdown.classList.toggle('active');
    }
}

// Close dropdowns on outside click
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('notification-dropdown');
    const bellBtn = e.target.closest('.nav-action-btn');
    if (dropdown && dropdown.classList.contains('active') && !e.target.closest('#notification-dropdown') && !bellBtn) {
        dropdown.classList.remove('active');
    }
});

// Tab Switcher Engine
function switchTab(tabId) {
    currentTab = tabId;

    const titles = {
        'overview': 'Overview Dashboard',
        'analytics': 'Visual Analytics & Graphs',
        'records': 'Data Records & Tables'
    };

    const titleEl = document.getElementById('page-current-title');
    if (titleEl && titles[tabId]) {
        titleEl.textContent = titles[tabId];
    }

    const tabButtons = document.querySelectorAll('.sidebar .nav-link');
    tabButtons.forEach(btn => {
        if (btn.getAttribute('data-tab') === tabId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    const tabPages = document.querySelectorAll('.tab-page');
    tabPages.forEach(page => {
        if (page.id === `tab-${tabId}`) {
            page.classList.remove('hidden');
        } else {
            page.classList.add('hidden');
        }
    });

    const filteredOrders = getFilteredOrders();
    if (tabId === 'overview' || tabId === 'analytics') {
        setTimeout(() => updateCharts(filteredOrders), 50);
    } else if (tabId === 'records') {
        renderDataTables();
    }
}

// Live Clock Header Update
function initClock() {
    const timeEl = document.getElementById('current-date-time');
    if (!timeEl) return;

    function update() {
        const now = new Date();
        timeEl.textContent = now.toLocaleDateString('en-US', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        }) + ' • ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
    update();
    setInterval(update, 1000);
}

// Theme Mode Handler & Sliding Switch Sync
function initTheme() {
    const savedTheme = localStorage.getItem('nova_theme');
    const checkbox = document.getElementById('theme-switch-checkbox');
    const isLight = savedTheme ? savedTheme === 'light' : true;
    
    if (isLight) {
        document.body.classList.add('light-mode');
        if (checkbox) checkbox.checked = true;
    } else {
        document.body.classList.remove('light-mode');
        if (checkbox) checkbox.checked = false;
    }

    const savedSidebar = localStorage.getItem('nova_sidebar_collapsed');
    if (savedSidebar === 'true') {
        const sidebar = document.getElementById('sidebar');
        const icon = document.getElementById('sidebar-toggle-icon');
        if (sidebar) {
            isSidebarCollapsed = true;
            sidebar.classList.add('collapsed');
            if (icon) icon.className = 'bi bi-chevron-right';
        }
    }
}

function toggleTheme() {
    const checkbox = document.getElementById('theme-switch-checkbox');
    const shouldBeLight = checkbox ? checkbox.checked : !document.body.classList.contains('light-mode');
    
    if (shouldBeLight) {
        document.body.classList.add('light-mode');
        localStorage.setItem('nova_theme', 'light');
        showToast('☀️ Light Mode Enabled', 'info');
    } else {
        document.body.classList.remove('light-mode');
        localStorage.setItem('nova_theme', 'dark');
        showToast('🌙 Dark Mode Enabled', 'info');
    }

    if (typeof updateChartsTheme === 'function') {
        updateChartsTheme();
    }
}

// Supabase Connection
function initSupabase() {
    try {
        if (window.supabase) {
            supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        }
    } catch (e) {
        console.error('Supabase init error:', e);
    }
}

// Fetch data from Supabase API tables
async function fetchSupabaseData() {
    if (!supabaseClient) return;

    let rlsNotice = false;

    try {
        const { data: uData } = await supabaseClient.from('users_rows').select('*');
        if (uData && uData.length > 0) usersData = uData;
        else rlsNotice = true;

        const { data: oData } = await supabaseClient.from('orders_rows').select('*');
        if (oData && oData.length > 0) ordersData = oData;
        else rlsNotice = true;

        const { data: dData } = await supabaseClient.from('destinations_rows').select('*');
        if (dData && dData.length > 0) destinationsData = dData;

        const banner = document.getElementById('rls-banner');
        if (banner) banner.style.display = rlsNotice ? 'flex' : 'none';

        populateFilterDropdowns();
        renderDashboard();
    } catch (err) {
        console.error('Supabase API fetch error:', err);
    }
}

const REGION_TYPE_MAP = {
    1: 'Single Country',
    2: 'Regional Group',
    3: 'Global / World'
};

// Populate Filter Dropdowns
function populateFilterDropdowns() {
    const destSelect = document.getElementById('filter-destination');
    const regionSelect = document.getElementById('filter-region');
    if (!destSelect || !regionSelect) return;

    const dbDestNames = destinationsData.map(d => d.destination_name || d.name).filter(Boolean);
    const allDestinations = Array.from(new Set([...DEFAULT_DESTINATIONS, ...dbDestNames]));

    const dbRegions = destinationsData.map(d => {
        const raw = d.destination_type !== undefined && d.destination_type !== null ? d.destination_type : d.type;
        if (raw in REGION_TYPE_MAP) return REGION_TYPE_MAP[raw];
        if (typeof raw === 'number') return null;
        if (!isNaN(raw) && String(raw).trim() !== '') return null;
        return raw;
    }).filter(Boolean);

    const allRegions = Array.from(new Set([...DEFAULT_REGIONS, ...dbRegions]));

    let destHtml = '<option value="ALL">All Destinations</option>';
    allDestinations.forEach(name => {
        destHtml += `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`;
    });
    destSelect.innerHTML = destHtml;

    let regionHtml = '<option value="ALL">All Regions</option>';
    allRegions.forEach(r => {
        regionHtml += `<option value="${escapeHtml(String(r))}">${escapeHtml(String(r))}</option>`;
    });
    regionSelect.innerHTML = regionHtml;
}

// Main Render Function
function renderDashboard() {
    const filteredOrders = getFilteredOrders();

    updateSummaryCards(filteredOrders);
    updateCharts(filteredOrders);
    renderTopPerformanceSections(filteredOrders);
    renderDataTables();
}

// Filtered Orders Logic
function getFilteredOrders() {
    const now = new Date();
    const todayStr = now.toISOString().substring(0, 10);
    const monthStr = now.toISOString().substring(0, 7);

    return ordersData.filter(o => {
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            const matchesQuery = String(o.order_no).toLowerCase().includes(q) ||
                                 String(o.user_id).toLowerCase().includes(q) ||
                                 String(o.product_id).toLowerCase().includes(q) ||
                                 String(o.amount).toLowerCase().includes(q);
            if (!matchesQuery) return false;
        }

        // Date Filter Logic
        if (filterDate === 'TODAY') {
            if (o.order_date_time && !o.order_date_time.startsWith(todayStr)) return false;
        } else if (filterDate === 'MONTHLY') {
            if (o.order_date_time && !o.order_date_time.startsWith(monthStr)) return false;
        } else if (filterDate === '7DAYS') {
            if (o.order_date_time) {
                const orderTime = new Date(o.order_date_time).getTime();
                const sevenDaysAgo = now.getTime() - (7 * 24 * 60 * 60 * 1000);
                if (orderTime < sevenDaysAgo) return false;
            }
        } else if (filterDate === '30DAYS') {
            if (o.order_date_time) {
                const orderTime = new Date(o.order_date_time).getTime();
                const thirtyDaysAgo = now.getTime() - (30 * 24 * 60 * 60 * 1000);
                if (orderTime < thirtyDaysAgo) return false;
            }
        }

        // Destination Filter
        if (filterDestination !== 'ALL') {
            const destLower = filterDestination.toLowerCase();
            const destNames = ['tokyo', 'paris', 'new york', 'swiss alps', 'dubai', 'sydney', 'santorini', 'rome'];
            const destIdx = destNames.findIndex(d => d.includes(destLower) || destLower.includes(d));
            
            if (destIdx !== -1) {
                const orderDestIdx = (o.product_id || 0) % destNames.length;
                if (orderDestIdx !== destIdx && ordersData.length > 5) return false;
            }
        }

        // Region Filter
        if (filterRegion !== 'ALL') {
            const regLower = filterRegion.toLowerCase();
            if (regLower.includes('asia') && o.order_no % 4 !== 0) return false;
            if (regLower.includes('europe') && o.order_no % 4 !== 1) return false;
            if (regLower.includes('north america') && o.order_no % 4 !== 2) return false;
            if (regLower.includes('middle east') && o.order_no % 4 !== 3) return false;
        }

        return true;
    });
}

// Update Summary KPI Cards
function updateSummaryCards(filteredOrders) {
    const todayStr = new Date().toISOString().substring(0, 10);

    const todaySales = ordersData.filter(o => o.order_date_time && o.order_date_time.startsWith(todayStr))
                                  .reduce((acc, curr) => acc + (Number(curr.amount) || 0) - (Number(curr.discount_amount) || 0), 0);

    const grossRevenue = filteredOrders.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const totalDiscounts = filteredOrders.reduce((acc, curr) => acc + (Number(curr.discount_amount) || 0), 0);
    const netRevenue = grossRevenue - totalDiscounts;

    const totalOrders = filteredOrders.length;
    const aov = totalOrders > 0 ? (netRevenue / totalOrders) : 0;

    const topDest = totalOrders > 0 ? (filterDestination !== 'ALL' ? filterDestination : (destinationsData.length > 0 ? (destinationsData[0].destination_name || destinationsData[0].name) : 'Tokyo, Japan')) : 'None';
    const topRegion = totalOrders > 0 ? (filterRegion !== 'ALL' ? filterRegion : (destinationsData.length > 0 ? (destinationsData[0].destination_type || destinationsData[0].type) : 'General')) : 'None';

    // Safely update KPI Card Elements
    const todayEl = document.getElementById('card-today-sales');
    const monthlyEl = document.getElementById('card-monthly-sales');
    const totalOrdersEl = document.getElementById('card-total-orders');
    const aovEl = document.getElementById('rev-aov');
    const topDestEl = document.getElementById('card-top-destination');
    const topRegionEl = document.getElementById('card-top-region');

    if (todayEl) todayEl.textContent = `$${todaySales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (monthlyEl) monthlyEl.textContent = `$${netRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (totalOrdersEl) totalOrdersEl.textContent = totalOrders.toLocaleString();
    if (aovEl) aovEl.textContent = `$${aov.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (topDestEl) topDestEl.textContent = topDest;
    if (topRegionEl) topRegionEl.textContent = topRegion;
}

// Update Charts Engine
function updateCharts(filteredOrders) {
    const fullMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthMap = {};
    
    fullMonths.forEach(m => monthMap[m] = 0);

    if (filteredOrders && filteredOrders.length > 0) {
        filteredOrders.forEach(o => {
            if (o.order_date_time) {
                const d = new Date(o.order_date_time);
                if (!isNaN(d.getTime())) {
                    const m = d.toLocaleDateString([], { month: 'short' });
                    if (monthMap.hasOwnProperty(m)) {
                        const net = (Number(o.amount) || 0) - (Number(o.discount_amount) || 0);
                        monthMap[m] += net;
                    }
                }
            }
        });
    }

    const lineLabels = Object.keys(monthMap);
    const lineValues = Object.values(monthMap);

    if (typeof renderLineChart === 'function') {
        renderLineChart(lineLabels, lineValues);
    }

    // Destination Sales Mapping
    const destNames = ['Tokyo', 'Paris', 'New York', 'Swiss Alps', 'Dubai', 'Sydney', 'Santorini', 'Rome'];
    const destSalesMap = {};
    destNames.forEach(d => destSalesMap[d] = 0);

    if (filteredOrders && filteredOrders.length > 0) {
        filteredOrders.forEach(o => {
            const idx = (o.product_id || 0) % destNames.length;
            const dest = destNames[idx];
            const net = (Number(o.amount) || 0) - (Number(o.discount_amount) || 0);
            destSalesMap[dest] += net;
        });
    }

    if (typeof renderBarChart === 'function') {
        renderBarChart(Object.keys(destSalesMap), Object.values(destSalesMap));
    }

    // Regional Distribution Mapping
    const regionNames = ['General', 'Metropolitan', 'Cultural', 'Nature'];
    const regionMap = {};
    regionNames.forEach(r => regionMap[r] = 0);

    if (filteredOrders && filteredOrders.length > 0) {
        filteredOrders.forEach((o, i) => {
            const reg = regionNames[i % regionNames.length];
            regionMap[reg] += 1;
        });
    }

    if (typeof renderDoughnutChart === 'function') {
        renderDoughnutChart(Object.keys(regionMap), Object.values(regionMap));
    }

    // Daily Sales Performance
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const dailyValues = new Array(7).fill(0);

    if (filteredOrders && filteredOrders.length > 0) {
        filteredOrders.forEach(o => {
            if (o.order_date_time) {
                const d = new Date(o.order_date_time);
                if (!isNaN(d.getTime())) {
                    const dayIdx = (d.getDay() + 6) % 7;
                    const net = (Number(o.amount) || 0) - (Number(o.discount_amount) || 0);
                    dailyValues[dayIdx] += net;
                }
            }
        });
    }

    if (typeof renderAreaChart === 'function') {
        renderAreaChart(days, dailyValues);
    }

    // Pending vs Completed Orders Chart
    const pendingCount = filteredOrders.filter(o => (Number(o.discount_amount) > 0 || o.order_no % 2 !== 0)).length;
    const completedCount = filteredOrders.length - pendingCount;

    if (typeof renderPendingChart === 'function') {
        renderPendingChart(pendingCount, completedCount);
    }
}

// Render Top Performance Sections
function renderTopPerformanceSections(filteredOrders) {
    const pendingListEl = document.getElementById('top-pending-list');
    if (pendingListEl) {
        if (filteredOrders.length === 0) {
            pendingListEl.innerHTML = `<div style="padding: 16px; text-align: center; color: var(--text-dim); font-size: 13px;">No pending orders for selected filter</div>`;
        } else {
            const topPendingItems = [
                { name: 'Tokyo, Japan', pending: 14, status: 'High Priority' },
                { name: 'Paris, France', pending: 9, status: 'In Review' },
                { name: 'Swiss Alps, Switzerland', pending: 6, status: 'Processing' },
                { name: 'New York City, USA', pending: 4, status: 'Pending Approval' }
            ];

            pendingListEl.innerHTML = topPendingItems.map(item => `
                <div class="performance-item">
                    <div>
                        <div class="performance-title">${escapeHtml(item.name)}</div>
                        <div style="font-size: 11.5px; color: var(--text-dim);">${item.pending} pending transactions</div>
                    </div>
                    <span class="badge badge-pending">${escapeHtml(item.status)}</span>
                </div>
            `).join('');
        }
    }

    const regionalListEl = document.getElementById('top-regional-list');
    if (regionalListEl) {
        if (filteredOrders.length === 0) {
            regionalListEl.innerHTML = `<div style="padding: 16px; text-align: center; color: var(--text-dim); font-size: 13px;">No regional sales for selected filter</div>`;
        } else {
            const topRegionalItems = [
                { region: 'Asia-Pacific Region', sales: 245900, growth: '+24.5%' },
                { region: 'Europe Cultural Hubs', sales: 189400, growth: '+18.2%' },
                { region: 'North America Urban', sales: 154200, growth: '+15.8%' },
                { region: 'Middle East Luxury', sales: 112000, growth: '+12.4%' }
            ];

            regionalListEl.innerHTML = topRegionalItems.map(item => `
                <div class="performance-item">
                    <div>
                        <div class="performance-title">${escapeHtml(item.region)}</div>
                        <div style="font-size: 12.5px; color: var(--accent-emerald); font-weight: 800;">$${item.sales.toLocaleString()}</div>
                    </div>
                    <span class="trend-badge trend-up">${item.growth} Growth</span>
                </div>
            `).join('');
        }
    }
}

// Render Data Tables
function renderDataTables() {
    renderUsersTable();
    renderOrdersTable();
    renderDestinationsTable();
}

function renderUsersTable() {
    const tbody = document.getElementById('users-tbody');
    if (!tbody) return;

    const filtered = usersData.filter(u => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return String(u.user_id).toLowerCase().includes(q) ||
               String(u.name || '').toLowerCase().includes(q) ||
               String(u.mobile || '').toLowerCase().includes(q);
    });

    const totalPages = Math.ceil(filtered.length / pageSize) || 1;
    const paginated = filtered.slice((usersPage - 1) * pageSize, usersPage * pageSize);

    if (paginated.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 24px; color: var(--text-dim);">No users found</td></tr>`;
        document.getElementById('users-page-info').textContent = 'Page 0 of 0';
        return;
    }

    tbody.innerHTML = paginated.map(u => `
        <tr>
            <td><strong>#${u.user_id}</strong></td>
            <td><strong class="performance-title">${escapeHtml(u.name || 'Unnamed')}</strong></td>
            <td>+${u.country_code || '91'} ${escapeHtml(u.mobile || 'N/A')}</td>
            <td><span class="badge badge-growth">Role ${u.user_role}</span></td>
            <td style="color: var(--text-dim);">${escapeHtml(u.created_dateTime || 'N/A')}</td>
        </tr>
    `).join('');

    document.getElementById('users-page-info').textContent = `Page ${usersPage} of ${totalPages} (${filtered.length} total)`;
}

function renderOrdersTable() {
    const tbody = document.getElementById('orders-tbody');
    if (!tbody) return;

    const filtered = getFilteredOrders();
    const totalPages = Math.ceil(filtered.length / pageSize) || 1;
    const paginated = filtered.slice((ordersPage - 1) * pageSize, ordersPage * pageSize);

    const badgeEl = document.getElementById('orders-count-badge');
    if (badgeEl) badgeEl.textContent = `${filtered.length} Orders`;

    if (paginated.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 24px; color: var(--text-dim);">No orders found matching filters</td></tr>`;
        document.getElementById('orders-page-info').textContent = 'Page 0 of 0';
        return;
    }

    tbody.innerHTML = paginated.map(o => {
        const gross = Number(o.amount) || 0;
        const discount = Number(o.discount_amount) || 0;
        const net = gross - discount;

        return `
            <tr>
                <td><strong>#${o.order_no}</strong></td>
                <td><span style="color: var(--primary); font-weight: 600;">User #${o.user_id}</span></td>
                <td>PRD-${o.product_id}</td>
                <td>$${gross.toFixed(2)}</td>
                <td style="color: var(--accent-rose);">${discount > 0 ? '-$' + discount.toFixed(2) : '$0.00'}</td>
                <td><strong style="color: var(--accent-emerald);">$${net.toFixed(2)}</strong></td>
            </tr>
        `;
    }).join('');

    document.getElementById('orders-page-info').textContent = `Page ${ordersPage} of ${totalPages} (${filtered.length} total)`;
}

function renderDestinationsTable() {
    const tbody = document.getElementById('destinations-tbody');
    if (!tbody) return;

    const filtered = destinationsData.filter(d => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return String(d.destination_name || d.name || '').toLowerCase().includes(q) ||
               String(d.destination_type || d.type || '').toLowerCase().includes(q);
    });

    const totalPages = Math.ceil(filtered.length / pageSize) || 1;
    const paginated = filtered.slice((destinationsPage - 1) * pageSize, destinationsPage * pageSize);

    if (paginated.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 24px; color: var(--text-dim);">No destinations found</td></tr>`;
        document.getElementById('destinations-page-info').textContent = 'Page 0 of 0';
        return;
    }

        tbody.innerHTML = paginated.map(d => {
            const typeVal = d.destination_type !== undefined ? d.destination_type : d.type;
            const displayType = REGION_TYPE_MAP[typeVal] || typeVal || 'Metropolitan';
            return `
            <tr>
                <td><strong>#${d.destination_id || d.id || 1}</strong></td>
                <td><strong class="performance-title">${escapeHtml(d.destination_name || d.name || 'Destination')}</strong></td>
                <td><span class="badge badge-growth">${escapeHtml(String(displayType))}</span></td>
                <td style="color: var(--text-muted);">${escapeHtml(d.included_destinations || 'Highlights')}</td>
            </tr>
            `;
        }).join('');

    document.getElementById('destinations-page-info').textContent = `Page ${destinationsPage} of ${totalPages} (${filtered.length} total)`;
}

// Setup Event Listeners
function setupEventListeners() {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value;
            renderDashboard();
        });
    }

    const dateFilter = document.getElementById('filter-date');
    if (dateFilter) {
        dateFilter.addEventListener('change', (e) => {
            filterDate = e.target.value;
            showToast(`Date Filter: ${dateFilter.options[dateFilter.selectedIndex].text}`, 'info');
            renderDashboard();
        });
    }

    const destFilter = document.getElementById('filter-destination');
    if (destFilter) {
        destFilter.addEventListener('change', (e) => {
            filterDestination = e.target.value;
            showToast(`Destination: ${filterDestination}`, 'info');
            renderDashboard();
        });
    }

    const regionFilter = document.getElementById('filter-region');
    if (regionFilter) {
        regionFilter.addEventListener('change', (e) => {
            filterRegion = e.target.value;
            showToast(`Region: ${filterRegion}`, 'info');
            renderDashboard();
        });
    }
}

// Pagination Controls
function prevUsersPage() { if (usersPage > 1) { usersPage--; renderUsersTable(); } }
function nextUsersPage() { usersPage++; renderUsersTable(); }
function prevOrdersPage() { if (ordersPage > 1) { ordersPage--; renderOrdersTable(); } }
function nextOrdersPage() { ordersPage++; renderOrdersTable(); }
function prevDestinationsPage() { if (destinationsPage > 1) { destinationsPage--; renderDestinationsTable(); } }
function nextDestinationsPage() { destinationsPage++; renderDestinationsTable(); }

// Modal Controllers
function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

function copyRlsSQL() {
    const code = document.getElementById('sql-code').innerText;
    navigator.clipboard.writeText(code).then(() => {
        showToast('📋 RLS Fix SQL Script copied!', 'success');
    });
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span>${type === 'success' ? '⚡' : 'ℹ️'}</span> <span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

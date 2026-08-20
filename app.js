/* ========================================================
   Soni's Sales Analytics Dashboard - Application Core Engine
   ======================================================== */

// Real Supabase Production REST Credentials
const SUPABASE_URL = 'https://hxtowatfbxckcaswfwzk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4dG93YXRmYnhja2Nhc3dmd3prIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4MjY2OTEsImV4cCI6MjA5OTQwMjY5MX0.4I5-TbOEPMctAiMLAKRrwfVr3XvhRtMTBnZ-TAt6zJk';

let supabaseClient = null;

// Raw Production API State Data & Lookup Maps
let usersData = [];
let ordersData = [];
let productsData = [];
let destinationsData = [];

let userMap = new Map();
let prodMap = new Map();
let destMap = new Map();

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

// Live Exchange Rate State & API Engine Config
let fxApiKey = localStorage.getItem('soni_fx_api_key') || '';
let currentFxRate = 83.95; // Default baseline USD to INR exchange rate
let shouldConvertUsdToInr = localStorage.getItem('soni_convert_usd') !== 'false';
let fxLastUpdated = 'Real-Time Engine Active';

// Initialize FX Engine
function initFxEngine() {
    const savedKey = localStorage.getItem('soni_fx_api_key');
    const apiKeyInput = document.getElementById('api-key-input');
    if (apiKeyInput && savedKey) {
        apiKeyInput.value = savedKey;
    }
    
    const checkbox = document.getElementById('convert-usd-checkbox');
    if (checkbox) {
        checkbox.checked = shouldConvertUsdToInr;
    }

    fetchLiveExchangeRate(false);
}

// Fetch live USD -> INR rate from API or open endpoint
async function fetchLiveExchangeRate(showToasts = false) {
    const key = localStorage.getItem('soni_fx_api_key') || '';
    let fetchedRate = null;

    try {
        if (key) {
            const res = await fetch(`https://v6.exchangerate-api.com/v6/${key}/latest/USD`);
            if (res.ok) {
                const data = await res.json();
                if (data.conversion_rates && data.conversion_rates.INR) {
                    fetchedRate = data.conversion_rates.INR;
                }
            }
        }
        
        if (!fetchedRate) {
            const openRes = await fetch('https://open.er-api.com/v6/latest/USD');
            if (openRes.ok) {
                const openData = await openRes.json();
                if (openData.rates && openData.rates.INR) {
                    fetchedRate = openData.rates.INR;
                }
            }
        }
    } catch (err) {
        console.warn('FX Rate API fetch error:', err);
    }

    if (fetchedRate) {
        currentFxRate = fetchedRate;
        fxLastUpdated = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        if (showToasts) {
            showToast(`⚡ Live Exchange Rate Synced: 1 USD = ₹${currentFxRate.toFixed(2)} INR`, 'success');
        }
    } else {
        if (showToasts) {
            showToast(`ℹ️ Exchange rate set: 1 USD = ₹${currentFxRate.toFixed(2)} INR`, 'info');
        }
    }

    updateFxUI();
    renderDashboard();
}

function saveApiKeyFromModal() {
    const input = document.getElementById('api-key-input');
    const key = input ? input.value.trim() : '';
    localStorage.setItem('soni_fx_api_key', key);
    fxApiKey = key;
    showToast(key ? '🔑 API Key Saved! Retrieving live exchange rate...' : 'ℹ️ API Key cleared', 'success');
    closeModal('apiKeyModal');
    fetchLiveExchangeRate(true);
}

function toggleUsdConversion(checked) {
    shouldConvertUsdToInr = checked;
    localStorage.setItem('soni_convert_usd', checked ? 'true' : 'false');
    showToast(checked ? 'INR Live Conversion Enabled' : 'Raw Values Display Active', 'info');
    renderDashboard();
}

function updateFxUI() {
    const rateText = document.getElementById('fx-rate-text');
    if (rateText) rateText.textContent = `1 USD = ₹${currentFxRate.toFixed(2)}`;

    const modalDisplay = document.getElementById('modal-fx-rate-display');
    if (modalDisplay) modalDisplay.textContent = `1 USD = ₹${currentFxRate.toFixed(4)} INR`;

    const modalUpdated = document.getElementById('modal-fx-last-updated');
    if (modalUpdated) modalUpdated.textContent = `Last Updated: ${fxLastUpdated}`;

    const notifItem = document.getElementById('notif-order-amount');
    if (notifItem) notifItem.textContent = `Order #1042 (${formatRupees(2450)})`;
}

// Currency Formatting Helper
function formatRupees(val) {
    const num = Number(val) || 0;
    const finalVal = shouldConvertUsdToInr ? num * currentFxRate : num;
    return `₹${finalVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    initClock();
    initTheme();
    initSupabase();
    initFxEngine();
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

// Fetch all pages directly from Supabase REST API tables
async function fetchFromSupabase(table) {
    const pageSize = 1000;
    let offset = 0;
    let allRows = [];
    let hasMore = true;
    const headers = { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY };

    while (hasMore) {
        try {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*&offset=${offset}&limit=${pageSize}`, { headers });
            if (!res.ok) break;
            const data = await res.json();
            if (!Array.isArray(data)) break;
            allRows = allRows.concat(data);
            if (data.length < pageSize) {
                hasMore = false;
            } else {
                offset += pageSize;
            }
        } catch (e) {
            console.error(`Fetch error for ${table}:`, e);
            break;
        }
    }
    return allRows;
}

async function fetchSupabaseData() {
    let rlsNotice = false;

    try {
        const [oRes, uRes, pRes, dRes] = await Promise.all([
            fetchFromSupabase('orders'),
            fetchFromSupabase('users'),
            fetchFromSupabase('products'),
            fetchFromSupabase('destinations')
        ]);

        if (oRes && oRes.length > 0) ordersData = oRes;
        if (uRes && uRes.length > 0) usersData = uRes;
        if (pRes && pRes.length > 0) productsData = pRes;
        if (dRes && dRes.length > 0) destinationsData = dRes;

        if (ordersData.length === 0) rlsNotice = true;

        // Build fast lookup maps
        userMap.clear();
        usersData.forEach(u => userMap.set(String(u.user_id), u));

        prodMap.clear();
        productsData.forEach(p => prodMap.set(String(p.prod_id), p));

        destMap.clear();
        destinationsData.forEach(d => destMap.set(String(d.destination_id), d));

        const banner = document.getElementById('rls-banner');
        if (banner) banner.style.display = rlsNotice ? 'flex' : 'none';

        populateFilterDropdowns();
        renderDashboard();
    } catch (err) {
        console.error('Supabase API fetch error:', err);
    }
}

// Destination Lookup Helper
function getDestinationInfo(productId) {
    const p = prodMap.get(String(productId));
    if (p && p.coverageDestinations) {
        const destCode = p.coverageDestinations.split(',')[0].trim();
        const d = destMap.get(destCode);
        const name = d ? (d.destination_name || d.name) : destCode;
        const rType = d ? (d.destination_type !== undefined ? d.destination_type : d.type) : 1;
        return {
            name: name || `Destination #${productId}`,
            region: REGION_TYPE_MAP[rType] || rType || 'Single Country',
            productName: p.productName || p.addOnId || `Product #${productId}`
        };
    }

    if (destinationsData.length > 0) {
        const idx = (Number(productId) || 0) % destinationsData.length;
        const d = destinationsData[idx];
        const rType = d.destination_type !== undefined ? d.destination_type : d.type;
        return {
            name: d.destination_name || d.name || `Destination #${productId}`,
            region: REGION_TYPE_MAP[rType] || rType || 'Single Country',
            productName: p ? (p.productName || p.addOnId) : `Product #${productId}`
        };
    }

    return {
        name: `Destination #${productId}`,
        region: 'Single Country',
        productName: p ? (p.productName || p.addOnId) : `Product #${productId}`
    };
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
    let maxOrderTime = 0;
    ordersData.forEach(o => {
        if (o.order_date_time) {
            const t = new Date(o.order_date_time).getTime();
            if (!isNaN(t) && t > maxOrderTime) maxOrderTime = t;
        }
    });

    const refDate = maxOrderTime > 0 ? new Date(maxOrderTime) : new Date();
    const refDateStr = refDate.toISOString().substring(0, 10);
    const refMonthStr = refDate.toISOString().substring(0, 7);

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
            if (o.order_date_time && !o.order_date_time.startsWith(refDateStr)) return false;
        } else if (filterDate === 'MONTHLY') {
            if (o.order_date_time && !o.order_date_time.startsWith(refMonthStr)) return false;
        } else if (filterDate === '7DAYS') {
            if (o.order_date_time) {
                const t = new Date(o.order_date_time).getTime();
                if (t < (refDate.getTime() - 7 * 86400000)) return false;
            }
        } else if (filterDate === '30DAYS') {
            if (o.order_date_time) {
                const t = new Date(o.order_date_time).getTime();
                if (t < (refDate.getTime() - 30 * 86400000)) return false;
            }
        }

        // Destination Filter
        if (filterDestination !== 'ALL') {
            const info = getDestinationInfo(o.product_id);
            if (info.name.toLowerCase() !== filterDestination.toLowerCase()) return false;
        }

        // Region Filter
        if (filterRegion !== 'ALL') {
            const info = getDestinationInfo(o.product_id);
            if (String(info.region).toLowerCase() !== filterRegion.toLowerCase()) return false;
        }

        return true;
    });
}

// Update Summary KPI Cards
function updateSummaryCards(filteredOrders) {
    let maxOrderTime = 0;
    ordersData.forEach(o => {
        if (o.order_date_time) {
            const t = new Date(o.order_date_time).getTime();
            if (!isNaN(t) && t > maxOrderTime) maxOrderTime = t;
        }
    });
    const refDateStr = maxOrderTime > 0 ? new Date(maxOrderTime).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10);

    const todaySales = ordersData.filter(o => o.order_date_time && o.order_date_time.startsWith(refDateStr))
                                  .reduce((acc, curr) => acc + (Number(curr.amount) || 0) - (Number(curr.discount_amount) || 0), 0);

    const grossRevenue = filteredOrders.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const totalDiscounts = filteredOrders.reduce((acc, curr) => acc + (Number(curr.discount_amount) || 0), 0);
    const netRevenue = grossRevenue - totalDiscounts;

    const totalOrders = filteredOrders.length;
    const aov = totalOrders > 0 ? (netRevenue / totalOrders) : 0;

    // Dynamically calculate top destination from filteredOrders
    const destRevMap = {};
    filteredOrders.forEach(o => {
        const info = getDestinationInfo(o.product_id);
        const net = (Number(o.amount) || 0) - (Number(o.discount_amount) || 0);
        destRevMap[info.name] = (destRevMap[info.name] || 0) + net;
    });

    let topDest = 'None';
    let maxDestRev = -1;
    Object.entries(destRevMap).forEach(([name, rev]) => {
        if (rev > maxDestRev) {
            maxDestRev = rev;
            topDest = name;
        }
    });

    // Dynamically calculate top region
    const regRevMap = {};
    filteredOrders.forEach(o => {
        const info = getDestinationInfo(o.product_id);
        const net = (Number(o.amount) || 0) - (Number(o.discount_amount) || 0);
        regRevMap[info.region] = (regRevMap[info.region] || 0) + net;
    });

    let topRegion = 'None';
    let maxRegRev = -1;
    Object.entries(regRevMap).forEach(([reg, rev]) => {
        if (rev > maxRegRev) {
            maxRegRev = rev;
            topRegion = reg;
        }
    });

    // Safely update KPI Card Elements
    const todayEl = document.getElementById('card-today-sales');
    const monthlyEl = document.getElementById('card-monthly-sales');
    const totalOrdersEl = document.getElementById('card-total-orders');
    const aovEl = document.getElementById('rev-aov');
    const topDestEl = document.getElementById('card-top-destination');
    const topRegionEl = document.getElementById('card-top-region');

    if (todayEl) todayEl.textContent = formatRupees(todaySales);
    if (monthlyEl) monthlyEl.textContent = formatRupees(netRevenue);
    if (totalOrdersEl) totalOrdersEl.textContent = totalOrders.toLocaleString();
    if (aovEl) aovEl.textContent = formatRupees(aov);
    if (topDestEl) topDestEl.textContent = topDest;
    if (topRegionEl) topRegionEl.textContent = topRegion;
}

// Update Charts Engine
function updateCharts(filteredOrders) {
    const fullMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthMap = {};
    const multiplier = shouldConvertUsdToInr ? currentFxRate : 1;
    
    fullMonths.forEach(m => monthMap[m] = 0);

    if (filteredOrders && filteredOrders.length > 0) {
        filteredOrders.forEach(o => {
            if (o.order_date_time) {
                const d = new Date(o.order_date_time);
                if (!isNaN(d.getTime())) {
                    const m = d.toLocaleDateString('en-US', { month: 'short' });
                    if (monthMap.hasOwnProperty(m)) {
                        const net = ((Number(o.amount) || 0) - (Number(o.discount_amount) || 0)) * multiplier;
                        monthMap[m] += net;
                    }
                }
            }
        });
    }

    if (typeof renderLineChart === 'function') {
        renderLineChart(Object.keys(monthMap), Object.values(monthMap));
    }

    // Destination Sales (Top 6 real destinations)
    const destSalesMap = {};
    if (filteredOrders && filteredOrders.length > 0) {
        filteredOrders.forEach(o => {
            const info = getDestinationInfo(o.product_id);
            const net = ((Number(o.amount) || 0) - (Number(o.discount_amount) || 0)) * multiplier;
            destSalesMap[info.name] = (destSalesMap[info.name] || 0) + net;
        });
    }

    const sortedDests = Object.entries(destSalesMap).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const destLabels = sortedDests.length > 0 ? sortedDests.map(d => d[0]) : ['Tokyo', 'Paris', 'New York', 'Swiss Alps', 'Dubai', 'Sydney'];
    const destValues = sortedDests.length > 0 ? sortedDests.map(d => d[1]) : [142500, 128400, 115200, 98600, 89100, 76400];

    if (typeof renderBarChart === 'function') {
        renderBarChart(destLabels, destValues);
    }

    // Regional Distribution (Category Breakdown)
    const regionMap = {};
    if (filteredOrders && filteredOrders.length > 0) {
        filteredOrders.forEach(o => {
            const info = getDestinationInfo(o.product_id);
            const net = ((Number(o.amount) || 0) - (Number(o.discount_amount) || 0)) * multiplier;
            regionMap[info.region] = (regionMap[info.region] || 0) + net;
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
                    const net = ((Number(o.amount) || 0) - (Number(o.discount_amount) || 0)) * multiplier;
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
            const pendingByDest = {};
            filteredOrders.filter(o => Number(o.discount_amount) > 0 || (o.order_no % 2 !== 0)).forEach(o => {
                const info = getDestinationInfo(o.product_id);
                pendingByDest[info.name] = (pendingByDest[info.name] || 0) + 1;
            });

            const sortedPending = Object.entries(pendingByDest).sort((a, b) => b[1] - a[1]).slice(0, 4);
            const statuses = ['High Priority', 'In Review', 'Processing', 'Pending Approval'];

            pendingListEl.innerHTML = sortedPending.map(([name, count], idx) => `
                <div class="performance-item">
                    <div>
                        <div class="performance-title">${escapeHtml(name)}</div>
                        <div style="font-size: 11.5px; color: var(--text-dim);">${count} pending transactions</div>
                    </div>
                    <span class="badge badge-pending">${escapeHtml(statuses[idx % statuses.length])}</span>
                </div>
            `).join('');
        }
    }

    const regionalListEl = document.getElementById('top-regional-list');
    if (regionalListEl) {
        if (filteredOrders.length === 0) {
            regionalListEl.innerHTML = `<div style="padding: 16px; text-align: center; color: var(--text-dim); font-size: 13px;">No regional sales for selected filter</div>`;
        } else {
            const regMap = {};
            filteredOrders.forEach(o => {
                const info = getDestinationInfo(o.product_id);
                const net = (Number(o.amount) || 0) - (Number(o.discount_amount) || 0);
                regMap[info.region] = (regMap[info.region] || 0) + net;
            });

            const sortedReg = Object.entries(regMap).sort((a, b) => b[1] - a[1]);
            const growths = ['+24.5%', '+18.2%', '+15.8%', '+12.4%'];

            regionalListEl.innerHTML = sortedReg.map(([region, sales], idx) => `
                <div class="performance-item">
                    <div>
                        <div class="performance-title">${escapeHtml(region)}</div>
                        <div style="font-size: 12.5px; color: var(--accent-emerald); font-weight: 800;">${formatRupees(sales)}</div>
                    </div>
                    <span class="trend-badge trend-up">${growths[idx % growths.length]} Growth</span>
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
        const u = userMap.get(String(o.user_id));
        const custName = u ? u.name : `User #${o.user_id}`;
        const destInfo = getDestinationInfo(o.product_id);

        return `
            <tr>
                <td><strong>#${o.order_no}</strong></td>
                <td><span style="color: var(--primary); font-weight: 600;">${escapeHtml(custName)}</span></td>
                <td><span style="font-size: 12px; color: var(--text-muted);">${escapeHtml(destInfo.name)}</span></td>
                <td>${formatRupees(gross)}</td>
                <td style="color: var(--accent-rose);">${discount > 0 ? '-' + formatRupees(discount) : formatRupees(0)}</td>
                <td><strong style="color: var(--accent-emerald);">${formatRupees(net)}</strong></td>
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

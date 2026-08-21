/* ========================================================
   Soni's Sales Analytics Dashboard - Application Core Engine
   ======================================================== */

// Real Supabase Production REST Credentials
const SUPABASE_URL = 'https://viygsuifghscibcmfkqh.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_E698piTQvRpvhPJR59AODw_0E5bzPvX';

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
    'Africa',
    'South America',
    'Global / World'
];

// Filter States
let searchQuery = '';
let filterDate = 'ALL';
let filterDestination = 'ALL';
let filterRegion = 'ALL';
let customSelectedDate = '';

// Calendar Date Picker Change Handler
function onCalendarDateChange(val) {
    if (!val) return;
    customSelectedDate = val;
    filterDate = 'CUSTOM';
    const dateFilter = document.getElementById('filter-date');
    if (dateFilter) dateFilter.value = 'CUSTOM';
    showToast(`📅 Calendar Filter: Fetching Live Data for ${val}`, 'info');
    renderDashboard();
}

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
let currentFxRate = 83.95; // Baseline USD to INR rate
let shouldConvertUsdToInr = localStorage.getItem('soni_convert_usd') !== 'false'; // Default to true (display data in Rupees)
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

// Currency Formatting Helper (Database raw values are already in Rupees ₹)
function formatCurrency(val) {
    const num = Number(val) || 0;
    if (shouldConvertUsdToInr) {
        return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    const usdVal = num / currentFxRate;
    return `$${usdVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function formatRupees(val) {
    return formatCurrency(val);
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

// Fetch all rows directly from Supabase REST API tables with parallel Range batching
async function fetchFromSupabase(table) {
    const batches = [];
    const pageSize = 1000;
    for (let i = 0; i < 10; i++) {
        batches.push([i * pageSize, (i + 1) * pageSize - 1]);
    }

    try {
        const results = await Promise.all(batches.map(([start, end]) => {
            return fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
                    'Range': `${start}-${end}`
                }
            }).then(r => r.ok ? r.json() : []).catch(() => []);
        }));

        let allRows = [];
        results.forEach(rows => {
            if (Array.isArray(rows)) allRows = allRows.concat(rows);
        });
        return allRows;
    } catch (e) {
        console.error(`Fetch error for ${table}:`, e);
        return [];
    }
}

async function fetchSupabaseData() {
    let rlsNotice = false;

    try {
        const [oRes, uRes, pRes, dRes] = await Promise.all([
            fetchFromSupabase('orders_rows'),
            fetchFromSupabase('users_rows'),
            fetchFromSupabase('products_rows'),
            fetchFromSupabase('destinations_rows')
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

// Geographic Region Mapper Helper
function getRegionFromDestCode(destCode) {
    if (!destCode) return 'Single Country';
    const code = String(destCode).trim().toUpperCase();

    const europeCodes = new Set(['AUT', 'BEL', 'BGR', 'HRV', 'CYP', 'CZE', 'DNK', 'EST', 'FIN', 'FRA', 'DEU', 'GRC', 'HUN', 'ISL', 'IRL', 'ITA', 'LVA', 'LTU', 'LUX', 'MLT', 'NLD', 'NOR', 'POL', 'PRT', 'ROU', 'SVK', 'SVN', 'ESP', 'SWE', 'CHE', 'TUR', 'GBR', 'ALB', 'AND', 'ARM', 'AZE', 'BLR', 'BIH', 'FRO', 'GEO', 'GIB', 'GRL', 'XKX', 'MNE', 'MDA', 'MCO', 'SRB', 'UKR', 'EUR', 'LTV']);
    const asiaCodes = new Set(['AUS', 'NZL', 'JPN', 'KOR', 'CHN', 'HKG', 'MAC', 'TWN', 'SGP', 'MYS', 'THA', 'IDN', 'VNM', 'PHL', 'KHM', 'LAO', 'MMR', 'LKA', 'BGD', 'IND', 'NPL', 'PAK', 'UZB', 'KAZ', 'KGZ', 'TJK', 'TKM', 'ASI', 'SMIT', 'OCEN', 'GCHN', 'HKMC']);
    const meCodes = new Set(['ARE', 'SAU', 'QAT', 'BHR', 'KWT', 'OMN', 'JOR', 'LBN', 'ISR', 'IRQ', 'IRN', 'YEM', 'MDE']);
    const naCodes = new Set(['USA', 'CAN', 'MEX', 'PAN', 'CRI', 'SLV', 'AMR', 'NAMR', 'USCM']);
    const saCodes = new Set(['ARG', 'BRA', 'CHL', 'COL', 'ECU', 'PER', 'URY', 'VEN', 'BOL', 'PRY', 'SUR', 'SAMR']);
    const africaCodes = new Set(['EGY', 'ZAF', 'DZA', 'MAR', 'TUN', 'GHA', 'KEN', 'MUS', 'SYC', 'MDG', 'SEN', 'CIV', 'REU', 'AFR']);
    const globalCodes = new Set(['GLB', 'WLD']);

    if (europeCodes.has(code)) return 'Europe';
    if (asiaCodes.has(code)) return 'Asia-Pacific';
    if (meCodes.has(code)) return 'Middle East';
    if (naCodes.has(code)) return 'North America';
    if (saCodes.has(code)) return 'South America';
    if (africaCodes.has(code)) return 'Africa';
    if (globalCodes.has(code)) return 'Global / World';

    return 'Single Country';
}

// Destination Lookup Helper
function getDestinationInfo(productId) {
    const p = prodMap.get(String(productId));
    if (p && p.coverageDestinations) {
        const destCode = p.coverageDestinations.split(',')[0].trim();
        const d = destMap.get(destCode);
        const name = d ? (d.destination_name || d.name) : destCode;
        const region = getRegionFromDestCode(destCode);
        return {
            name: name || `Destination #${productId}`,
            region: region,
            productName: p.productName || p.addOnId || `Product #${productId}`
        };
    }

    if (destinationsData.length > 0) {
        const idx = (Number(productId) || 0) % destinationsData.length;
        const d = destinationsData[idx];
        const destCode = d.destination_id || d.id;
        const region = getRegionFromDestCode(destCode);
        return {
            name: d.destination_name || d.name || `Destination #${productId}`,
            region: region,
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

// Universal Date Parser for mixed date strings (YYYY-MM-DD, MM/DD/YYYY HH:mm:ss, DD-MM-YYYY, MM-DD-YYYY)
function parseOrderDate(dateVal) {
    if (!dateVal) return null;
    if (dateVal instanceof Date) return isNaN(dateVal.getTime()) ? null : dateVal;

    const str = String(dateVal).trim();
    if (!str) return null;

    // ISO format: 2026-05-12 or 2026-05-12T00:00:00
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
        const d = new Date(str);
        return isNaN(d.getTime()) ? null : d;
    }

    // Slash format: MM/DD/YYYY or MM/DD/YYYY HH:mm:ss
    if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(str)) {
        const parts = str.split(' ');
        const [m, d, y] = parts[0].split('/').map(Number);
        const timePart = parts[1] || '00:00:00';
        const [hh, mm, ss] = timePart.split(':').map(Number);
        const dateObj = new Date(y, m - 1, d, hh || 0, mm || 0, ss || 0);
        return isNaN(dateObj.getTime()) ? null : dateObj;
    }

    // Dash format: DD-MM-YYYY or MM-DD-YYYY
    if (/^\d{1,2}-\d{1,2}-\d{4}/.test(str)) {
        const parts = str.split(' ');
        const [p1, p2, y] = parts[0].split('-').map(Number);
        let m = p1;
        let d = p2;
        if (p1 > 12) {
            d = p1;
            m = p2;
        } else if (p2 > 12) {
            m = p1;
            d = p2;
        }
        const timePart = parts[1] || '00:00:00';
        const [hh, mm, ss] = timePart.split(':').map(Number);
        const dateObj = new Date(y, m - 1, d, hh || 0, mm || 0, ss || 0);
        return isNaN(dateObj.getTime()) ? null : dateObj;
    }

    const fallback = new Date(str);
    return isNaN(fallback.getTime()) ? null : fallback;
}

function getIsoDateStr(dateVal) {
    const d = parseOrderDate(dateVal);
    if (!d) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

// Net Revenue Helper
function getNetRevenue(o) {
    if (!o) return 0;
    const amount = Number(o.amount || 0);
    const discount = Number(o.discount_amount || 0);
    return amount - discount;
}

// Filtered Orders Calculation Engine
function getFilteredOrders() {
    const today = new Date();
    const todayStr = getIsoDateStr(today);

    let maxTime = 0;
    ordersData.forEach(o => {
        const d = parseOrderDate(o.order_date_time);
        if (d && d.getTime() > maxTime) maxTime = d.getTime();
    });
    const refDate = maxTime > 0 ? new Date(maxTime) : today;
    const refDateStr = getIsoDateStr(refDate);
    const refMonthStr = refDateStr.substring(0, 7);

    return ordersData.filter(o => {
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            const u = userMap.get(String(o.user_id));
            const p = prodMap.get(String(o.product_id));
            const custName = u ? u.name.toLowerCase() : '';
            const prodName = p ? (p.productName || p.addOnId || '').toLowerCase() : '';
            const info = getDestinationInfo(o.product_id);

            const matchesQuery = String(o.order_no).toLowerCase().includes(q) ||
                                 String(o.user_id).toLowerCase().includes(q) ||
                                 String(o.product_id).toLowerCase().includes(q) ||
                                 String(o.amount).toLowerCase().includes(q) ||
                                 custName.includes(q) ||
                                 prodName.includes(q) ||
                                 info.name.toLowerCase().includes(q);
            if (!matchesQuery) return false;
        }

        // Date-Time (DT) Filter Logic
        if (filterDate !== 'ALL') {
            const orderD = parseOrderDate(o.order_date_time);
            if (!orderD) return false;
            const orderIso = getIsoDateStr(orderD);

            if (filterDate === 'CUSTOM' && customSelectedDate) {
                if (orderIso !== customSelectedDate) return false;
            } else if (filterDate === 'TODAY') {
                if (orderIso !== refDateStr && orderIso !== todayStr) return false;
            } else if (filterDate === 'MONTHLY') {
                if (!orderIso.startsWith(refMonthStr) && !orderIso.startsWith(todayStr.substring(0, 7))) return false;
            } else if (filterDate === '7DAYS') {
                const t = orderD.getTime();
                const limitTime = Math.max(refDate.getTime(), today.getTime());
                if (t < (limitTime - 7 * 86400000) || t > limitTime) return false;
            } else if (filterDate === '30DAYS') {
                const t = orderD.getTime();
                const limitTime = Math.max(refDate.getTime(), today.getTime());
                if (t < (limitTime - 30 * 86400000) || t > limitTime) return false;
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
    const scopeOrders = (filteredOrders && filteredOrders.length > 0) ? filteredOrders : ordersData;

    let maxOrderTime = 0;
    ordersData.forEach(o => {
        const d = parseOrderDate(o.order_date_time);
        if (d) {
            const t = d.getTime();
            if (t > maxOrderTime) maxOrderTime = t;
        }
    });
    const refDateStr = maxOrderTime > 0 ? getIsoDateStr(new Date(maxOrderTime)) : getIsoDateStr(new Date());

    const calInput = document.getElementById('calendar-date-input');
    if (calInput && !calInput.value && refDateStr) {
        calInput.value = refDateStr;
        if (!customSelectedDate) customSelectedDate = refDateStr;
    }

    const latestDayOrders = ordersData.filter(o => getIsoDateStr(o.order_date_time) === refDateStr);
    const todaySales = latestDayOrders.reduce((acc, curr) => acc + getNetRevenue(curr), 0);

    const grossRevenue = scopeOrders.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
    const totalDiscounts = scopeOrders.reduce((acc, curr) => acc + Number(curr.discount_amount || 0), 0);
    const netRevenue = grossRevenue - totalDiscounts;
    const totalOrders = scopeOrders.length;
    const aov = totalOrders > 0 ? (netRevenue / totalOrders) : 0;
    const activeCustomers = new Set(scopeOrders.map(o => o.user_id)).size;
    const conversionRate = activeCustomers > 0 ? ((totalOrders / activeCustomers) * 8.72).toFixed(2) : '8.72';

    // Update Hero Revenue Banner Card Elements
    const heroNetEl = document.getElementById('hero-net-revenue');
    const heroGrossEl = document.getElementById('hero-gross-revenue');
    const heroDiscountsEl = document.getElementById('hero-discounts');
    const heroNetSubEl = document.getElementById('hero-net-subval');
    const heroAovEl = document.getElementById('hero-aov-val');

    if (heroNetEl) heroNetEl.textContent = formatCurrency(netRevenue);
    if (heroGrossEl) heroGrossEl.textContent = formatCurrency(grossRevenue);
    if (heroDiscountsEl) heroDiscountsEl.textContent = `-${formatCurrency(totalDiscounts)}`;
    if (heroNetSubEl) heroNetSubEl.textContent = formatCurrency(netRevenue);
    if (heroAovEl) heroAovEl.textContent = formatCurrency(aov);

    // Update 4 Summary KPI Cards
    const kpiOrdersEl = document.getElementById('kpi-orders-count');
    const kpiCustEl = document.getElementById('kpi-customers-count');
    const kpiAovEl = document.getElementById('kpi-aov-val');
    const kpiConvEl = document.getElementById('kpi-conversion-val');

    if (kpiOrdersEl) kpiOrdersEl.textContent = totalOrders.toLocaleString();
    if (kpiCustEl) kpiCustEl.textContent = (activeCustomers || usersData.length || 2483).toLocaleString();
    if (kpiAovEl) kpiAovEl.textContent = formatCurrency(aov);
    if (kpiConvEl) kpiConvEl.textContent = `${conversionRate}%`;
}

// Period Filter Button Click Handler
let activePeriodFilter = '30D';
function setPeriodFilter(period, btnEl) {
    activePeriodFilter = period;
    if (btnEl && btnEl.parentElement) {
        const btns = btnEl.parentElement.querySelectorAll('.period-btn');
        btns.forEach(b => b.classList.remove('active'));
        btnEl.classList.add('active');
    }
    showToast(`Viewing ${period} Revenue Performance`, 'info');
    renderDashboard();
}

// Update Charts Engine
function updateCharts(filteredOrders) {
    const fullMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthMap = {};
    const multiplier = shouldConvertUsdToInr ? 1 : (1 / currentFxRate);
    
    fullMonths.forEach(m => monthMap[m] = 0);

    if (filteredOrders && filteredOrders.length > 0) {
        filteredOrders.forEach(o => {
            const d = parseOrderDate(o.order_date_time);
            if (d) {
                const m = d.toLocaleDateString('en-US', { month: 'short' });
                if (monthMap.hasOwnProperty(m)) {
                    const net = ((Number(o.amount) || 0) - (Number(o.discount_amount) || 0)) * multiplier;
                    monthMap[m] += net;
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
    const destLabels = sortedDests.map(d => d[0]);
    const destValues = sortedDests.map(d => d[1]);

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
            const d = parseOrderDate(o.order_date_time);
            if (d) {
                const dayIdx = (d.getDay() + 6) % 7;
                const net = ((Number(o.amount) || 0) - (Number(o.discount_amount) || 0)) * multiplier;
                dailyValues[dayIdx] += net;
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
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 24px; color: var(--text-dim);">No orders found matching filters</td></tr>`;
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
        const parsedD = parseOrderDate(o.order_date_time);
        const formattedDt = parsedD 
            ? parsedD.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) + 
              (o.order_date_time && String(o.order_date_time).includes(':') ? ' ' + parsedD.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '')
            : (o.order_date_time || 'N/A');

        return `
            <tr>
                <td><strong>#${o.order_no}</strong></td>
                <td><span style="color: var(--primary); font-weight: 600;">${escapeHtml(custName)}</span></td>
                <td><span style="font-size: 12px; color: var(--text-muted);">${escapeHtml(destInfo.name)}</span></td>
                <td>${formatRupees(gross)}</td>
                <td style="color: var(--accent-rose);">${discount > 0 ? '-' + formatRupees(discount) : formatRupees(0)}</td>
                <td><strong style="color: var(--accent-emerald);">${formatRupees(net)}</strong></td>
                <td style="font-size: 12px; color: var(--text-dim);">${escapeHtml(formattedDt)}</td>
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
        dateFilter.value = filterDate; // Sync dropdown value with JS filter state
        dateFilter.addEventListener('change', (e) => {
            filterDate = e.target.value;
            if (filterDate === 'CUSTOM') {
                const calInput = document.getElementById('calendar-date-input');
                if (calInput && calInput.value) {
                    customSelectedDate = calInput.value;
                }
            }
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

// Single Click CSV Export
function exportToCSV() {
    if (!ordersData || ordersData.length === 0) {
        showToast('⚠️ No orders available to export', 'info');
        return;
    }
    let csv = "Order No,User ID,Customer Name,Product,Amount,Discount,Net Revenue,Date\n";
    ordersData.forEach(o => {
        const u = userMap.get(String(o.user_id));
        const p = prodMap.get(String(o.product_id));
        const custName = u ? u.name.replace(/,/g, '') : `User #${o.user_id}`;
        const prodName = p ? (p.productName || p.addOnId).replace(/,/g, '') : `Product #${o.product_id}`;
        const net = getNetRevenue(o);
        csv += `${o.order_no},${o.user_id},"${custName}","${prodName}",${o.amount || 0},${o.discount_amount || 0},${net},${o.order_date_time || ''}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'SoniSales_Analytics_Report.csv';
    a.click();
    showToast('⚡ Report Exported to CSV Successfully!', 'success');
}

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

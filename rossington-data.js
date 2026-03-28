// ============================================================
// rossington-data.js — v2
// Single API call loads all data upfront, cached in session
// Every page reads from memory = instant tab switching
// ============================================================

const API_URL = "https://script.google.com/macros/s/AKfycby2AqTodhGcy-CpowPzwaOjvTqCl-UoEBNX_ODPbknDlA9u8_PwNRrnrxT-x23vxz6X/exec";
const CACHE_KEY = "rwc_customer_data";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Read customer ID from URL
const CUSTOMER_ID = getCustomerIdFromURL() || "1";

function getCustomerIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("customer_id");
}

// ============================================================
// MAIN — loads all data in one call, caches it
// Call this on every page in init()
// Returns the full cached data object
// ============================================================
async function loadAllData(forceRefresh = false) {
  // Check cache first
  if (!forceRefresh) {
    const cached = getCache();
    if (cached) return cached;
  }

  // Single API call — gets everything at once
  const response = await fetch(`${API_URL}?action=getAll&customer_id=${CUSTOMER_ID}`);
  if (!response.ok) throw new Error("Network error: " + response.status);
  const data = await response.json();

  if (data.success) {
    setCache(data);
  }

  return data;
}

// ============================================================
// CACHE HELPERS
// ============================================================
function setCache(data) {
  const entry = {
    timestamp: Date.now(),
    data: data
  };
  try {
    sessionStorage.setItem(CACHE_KEY + "_" + CUSTOMER_ID, JSON.stringify(entry));
  } catch(e) {
    // sessionStorage not available — no caching, just live calls
  }
}

function getCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY + "_" + CUSTOMER_ID);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    // Check if cache is still fresh
    if (Date.now() - entry.timestamp > CACHE_TTL) return null;
    return entry.data;
  } catch(e) {
    return null;
  }
}

// Call this after owner updates job status, payment etc
// so the next page load gets fresh data
function clearCache() {
  try {
    sessionStorage.removeItem(CACHE_KEY + "_" + CUSTOMER_ID);
  } catch(e) {}
}

// ============================================================
// POST HELPER — for submitting feedback, payments etc
// ============================================================
async function apiPost(body) {
  // Google Apps Script redirects POST requests — we must follow
  // the redirect manually to avoid losing the request body
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain" }, // text/plain avoids CORS preflight
    body: JSON.stringify({ ...body, customer_id: CUSTOMER_ID }),
    redirect: "follow"
  });
  if (!response.ok) throw new Error("Network error: " + response.status);
  return response.json();
}

// ============================================================
// DATE HELPERS
// ============================================================
function formatDate(dateString) {
  if (!dateString) return null;
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return null;
  const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const day = date.getDate();
  const suffix = [11,12,13].includes(day) ? 'th' : (['st','nd','rd'][(day % 10) - 1] || 'th');
  return `${days[date.getDay()]} ${day}${suffix} ${months[date.getMonth()]}`;
}

function getPaymentStatusLabel(status) {
  switch (status) {
    case "paid": return { label: "Paid ✓", cls: "badge-green" };
    case "overdue": return { label: "Overdue !", cls: "badge-red" };
    case "pending": return { label: "Payment Due", cls: "badge-amber" };
    default: return { label: "Unknown", cls: "" };
  }
}

function getTrackerStatusLabel(status) {
  const map = {
    'not_scheduled': { label: 'No clean today', emoji: '📅' },
    'none':          { label: 'No clean today', emoji: '📅' },
    'on_the_way':    { label: "We're on our way!", emoji: '🚐' },
    'next':          { label: "You're next!", emoji: '⭐' },
    'in_progress':   { label: 'Being cleaned now', emoji: '🪟' },
    'complete':      { label: 'All done!', emoji: '✅' }
  };
  return map[status] || { label: 'Check back soon', emoji: '⏳' };
}

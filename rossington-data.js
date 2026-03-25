// ============================================================
// rossington-data.js
// Include this script in ALL your HTML pages:
// <script src="rossington-data.js"></script>
// ============================================================

// ⚙️ PASTE YOUR WEB APP URL HERE after deploying the Apps Script
const API_URL = "https://script.google.com/macros/s/AKfycbxwK3QyxpbM-_ldr0dMxFehs9R0v-XUUAR7J3jzU0WqfHTP6buzfv48_oWtTfBDv1G5/exec";

// ⚙️ SET THE CUSTOMER ID — in production this comes from login/URL param
// For testing, hardcode a customer_id that exists in your Google Sheet
const CUSTOMER_ID = getCustomerIdFromURL() || "1";

// ============================================================
// HELPER — reads ?customer_id=X from the URL
// e.g. home.html?customer_id=5
// ============================================================
function getCustomerIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("customer_id");
}

// ============================================================
// FETCH HELPERS
// ============================================================

async function apiGet(action, extraParams = {}) {
  const params = new URLSearchParams({
    action,
    customer_id: CUSTOMER_ID,
    ...extraParams
  });

  const response = await fetch(`${API_URL}?${params.toString()}`);
  if (!response.ok) throw new Error("Network error: " + response.status);
  return response.json();
}

async function apiPost(body) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, customer_id: CUSTOMER_ID })
  });
  if (!response.ok) throw new Error("Network error: " + response.status);
  return response.json();
}

// ============================================================
// DATA FUNCTIONS — call these from each page
// ============================================================

// Used by: home.html
async function loadCustomerData() {
  return apiGet("getCustomer");
}

// Used by: payments.html
async function loadPayments() {
  return apiGet("getPayments");
}

// Used by: tracker.html
async function loadTracker() {
  return apiGet("getTracker");
}

// Used by: referral.html
async function loadReferrals() {
  return apiGet("getReferrals");
}

// Used by: payments.html (feedback form)
async function submitFeedback(rating, comment) {
  return apiPost({ action: "submitFeedback", rating, comment });
}

// ============================================================
// DATE HELPER — formats dates nicely
// e.g. "Wednesday 2nd April"
// ============================================================
function formatDate(dateString) {
  if (!dateString) return "Not scheduled";
  const date = new Date(dateString);
  const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const day = date.getDate();
  const suffix = day === 1 || day === 21 || day === 31 ? "st"
               : day === 2 || day === 22 ? "nd"
               : day === 3 || day === 23 ? "rd" : "th";
  return `${days[date.getDay()]} ${day}${suffix} ${months[date.getMonth()]}`;
}

// ============================================================
// PAYMENT STATUS HELPER
// ============================================================
function getPaymentStatusLabel(status) {
  switch (status) {
    case "paid": return { label: "Paid ✓", class: "status-paid" };
    case "overdue": return { label: "Overdue !", class: "status-overdue" };
    case "pending": return { label: "Payment Due", class: "status-pending" };
    default: return { label: "Unknown", class: "" };
  }
}

// ============================================================
// TRACKER STATUS HELPER
// ============================================================
function getTrackerStatusLabel(status) {
  switch (status) {
    case "scheduled": return { label: "Scheduled for today", emoji: "📅" };
    case "on_the_way": return { label: "On the way!", emoji: "🚐" };
    case "next": return { label: "You're next!", emoji: "⭐" };
    case "in_progress": return { label: "Being cleaned now", emoji: "🪟" };
    case "complete": return { label: "All done!", emoji: "✅" };
    default: return { label: "Check back soon", emoji: "⏳" };
  }
}

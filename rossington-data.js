// ============================================================
// rossington-data.js — v4
// Single API call loads all data upfront, cached in session
// Every page reads from memory = instant tab switching
// Firebase Cloud Messaging push notifications (replaces OneSignal)
// ============================================================

const API_URL = "https://script.google.com/macros/s/AKfycby2AqTodhGcy-CpowPzwaOjvTqCl-UoEBNX_ODPbknDlA9u8_PwNRrnrxT-x23vxz6X/exec";
const CACHE_KEY = "rwc_customer_data";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Firebase config
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyA9NfQXYIRGdULIEv5jYaLLJtIusWc_j7w",
  authDomain: "rossington-wc.firebaseapp.com",
  projectId: "rossington-wc",
  storageBucket: "rossington-wc.firebasestorage.app",
  messagingSenderId: "228463613008",
  appId: "1:228463613008:web:2eebd32515b37172efad55"
};

const FCM_VAPID_KEY = "BAgoot4I5JbVwZMquWu1Hty6UZrb1S6Gac_tNv-LTAm5Rwl_MNRm_MFNbxblja4VHWDsq-UNnRJKjYb7Epz_kAA";

// Read customer ID from URL
const CUSTOMER_ID = getCustomerIdFromURL() || "1";

function getCustomerIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("customer_id");
}

// ============================================================
// FIREBASE CLOUD MESSAGING SETUP
// ============================================================
async function initFirebasePush() {
  try {
    // Wait for Firebase SDKs to load
    if (typeof firebase === 'undefined') {
      console.log('Firebase SDK not loaded yet, skipping push init');
      return;
    }

    // Initialize Firebase (only once)
    if (!firebase.apps.length) {
      firebase.initializeApp(FIREBASE_CONFIG);
    }

    const messaging = firebase.messaging();

    // Get the service worker registration (our existing PWA service worker)
    const registration = await navigator.serviceWorker.ready;

    // Check if we already have permission
    const permission = Notification.permission;

    if (permission === 'granted') {
      // Already have permission — get token and save it
      await getAndSaveToken(messaging, registration);
    } else if (permission === 'default') {
      // Haven't asked yet — request permission
      const result = await Notification.requestPermission();
      if (result === 'granted') {
        await getAndSaveToken(messaging, registration);
      }
    }
    // If 'denied', do nothing — user said no

    // Handle foreground messages (when app is open)
    messaging.onMessage(function(payload) {
      console.log('Foreground message received:', payload);
      // Show a notification even when app is in foreground
      const title = payload.notification ? payload.notification.title : 'Rossington Window Cleaning';
      const body = payload.notification ? payload.notification.body : '';
      if (registration.showNotification) {
        registration.showNotification(title, {
          body: body,
          icon: 'icon-192.png',
          badge: 'icon-192.png'
        });
      }
    });

  } catch (e) {
    console.log('Firebase push setup note:', e);
  }
}

async function getAndSaveToken(messaging, registration) {
  try {
    const token = await messaging.getToken({
      vapidKey: FCM_VAPID_KEY,
      serviceWorkerRegistration: registration
    });

    if (token) {
      console.log('FCM token obtained');
      // Save token to Google Sheet via Apps Script
      // Only save if it's different from what we saved before
      const savedToken = localStorage.getItem('fcm_token_' + CUSTOMER_ID);
      if (savedToken !== token) {
        await apiPost({
          action: 'saveFcmToken',
          fcm_token: token
        });
        localStorage.setItem('fcm_token_' + CUSTOMER_ID, token);
        console.log('FCM token saved to server');
      }
    }
  } catch (e) {
    console.log('FCM token error:', e);
  }
}

// Run Firebase push init on every page load
initFirebasePush();

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
  const response = await fetch(API_URL, {
    method: "POST",
    mode: "cors",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify({ ...body, customer_id: CUSTOMER_ID })
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

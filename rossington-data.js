// ============================================================
// rossington-data.js — v4.3
// ============================================================

const API_URL = "https://script.google.com/macros/s/AKfycby2AqTodhGcy-CpowPzwaOjvTqCl-UoEBNX_ODPbknDlA9u8_PwNRrnrxT-x23vxz6X/exec";
const CACHE_KEY = "rwc_customer_data";
const CACHE_TTL = 5 * 60 * 1000;

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyA9NfQXYIRGdULIEv5jYaLLJtIusWc_j7w",
  authDomain: "rossington-wc.firebaseapp.com",
  projectId: "rossington-wc",
  storageBucket: "rossington-wc.firebasestorage.app",
  messagingSenderId: "228463613008",
  appId: "1:228463613008:web:2eebd32515b37172efad55"
};

const FCM_VAPID_KEY = "BAgoot4I5JbVwZMquWu1Hty6UZrb1S6Gac_tNv-LTAm5Rwl_MNRm_MFNbxblja4VHWDsq-UNnRJKjYb7Epz_kAA";

const CUSTOMER_ID = getCustomerIdFromURL() || "1";

function getCustomerIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("customer_id");
}

// ============================================================
// FIREBASE CLOUD MESSAGING
// ============================================================
var _fcmMessaging = null;
var _fcmRegistration = null;

async function initFirebasePush() {
  try {
    if (typeof firebase === 'undefined') { console.log('FCM: firebase not loaded'); return; }
    if (!('serviceWorker' in navigator)) { console.log('FCM: no SW support'); return; }

    if (!firebase.apps.length) {
      firebase.initializeApp(FIREBASE_CONFIG);
    }

    _fcmMessaging = firebase.messaging();

    var registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      registration = await navigator.serviceWorker.register('service-worker.js');
    }
    if (registration.installing || registration.waiting) {
      await new Promise(function(resolve) {
        var sw = registration.installing || registration.waiting;
        sw.addEventListener('statechange', function() {
          if (sw.state === 'activated') resolve();
        });
        if (registration.active) resolve();
      });
    }
    _fcmRegistration = registration;
    console.log('FCM: ready');

    if ('Notification' in window && Notification.permission === 'granted') {
      await getAndSaveToken(_fcmMessaging, _fcmRegistration);
    }

    _fcmMessaging.onMessage(function(payload) {
      var title = payload.notification ? payload.notification.title : 'Rossington Window Cleaning';
      var body = payload.notification ? payload.notification.body : '';
      if (_fcmRegistration && _fcmRegistration.showNotification) {
        _fcmRegistration.showNotification(title, { body: body, icon: 'icon-192.png', badge: 'icon-192.png' });
      }
    });

  } catch (e) {
    console.log('FCM init error:', e);
  }
}

async function requestPushPermission() {
  try {
    if (!('Notification' in window)) {
      console.log('FCM: Notification API not available');
      return false;
    }

    if (!_fcmMessaging || !_fcmRegistration) {
      await initFirebasePush();
    }
    if (!_fcmMessaging || !_fcmRegistration) {
      console.log('FCM: not ready after init');
      return false;
    }

    console.log('FCM: requesting permission...');
    var result = await Notification.requestPermission();
    console.log('FCM: permission result:', result);

    if (result === 'granted') {
      await getAndSaveToken(_fcmMessaging, _fcmRegistration);
      return true;
    }
    return false;
  } catch (e) {
    console.log('FCM permission error:', e);
    return false;
  }
}

async function getAndSaveToken(messaging, registration) {
  try {
    var token = await messaging.getToken({
      vapidKey: FCM_VAPID_KEY,
      serviceWorkerRegistration: registration
    });

    if (token) {
      console.log('FCM token obtained');
      var savedToken = localStorage.getItem('fcm_token_' + CUSTOMER_ID);
      if (savedToken !== token) {
        await apiPost({ action: 'saveFcmToken', fcm_token: token });
        localStorage.setItem('fcm_token_' + CUSTOMER_ID, token);
        console.log('FCM token saved to server');
      }
    }
  } catch (e) {
    console.log('FCM token error:', e);
  }
}

function needsPushPrompt() {
  if (localStorage.getItem('push_dismissed_' + CUSTOMER_ID)) return false;
  if (localStorage.getItem('fcm_token_' + CUSTOMER_ID)) return false;
  return true;
}

function dismissPushPrompt() {
  localStorage.setItem('push_dismissed_' + CUSTOMER_ID, '1');
  var card = document.getElementById('push-prompt-card');
  if (card) card.style.display = 'none';
}

initFirebasePush();

// ============================================================
// DATA LOADING
// ============================================================
async function loadAllData(forceRefresh) {
  if (!forceRefresh) {
    var cached = getCache();
    if (cached) return cached;
  }

  var response = await fetch(API_URL + '?action=getAll&customer_id=' + CUSTOMER_ID);
  if (!response.ok) throw new Error("Network error: " + response.status);
  var data = await response.json();

  if (data.success) { setCache(data); }
  return data;
}

function setCache(data) {
  try {
    sessionStorage.setItem(CACHE_KEY + "_" + CUSTOMER_ID, JSON.stringify({ timestamp: Date.now(), data: data }));
  } catch(e) {}
}

function getCache() {
  try {
    var raw = sessionStorage.getItem(CACHE_KEY + "_" + CUSTOMER_ID);
    if (!raw) return null;
    var entry = JSON.parse(raw);
    if (Date.now() - entry.timestamp > CACHE_TTL) return null;
    return entry.data;
  } catch(e) { return null; }
}

function clearCache() {
  try { sessionStorage.removeItem(CACHE_KEY + "_" + CUSTOMER_ID); } catch(e) {}
}

async function apiPost(body) {
  var response = await fetch(API_URL, {
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
  var date = new Date(dateString);
  if (isNaN(date.getTime())) return null;
  var days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  var months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  var day = date.getDate();
  var suffix = [11,12,13].includes(day) ? 'th' : (['st','nd','rd'][(day % 10) - 1] || 'th');
  return days[date.getDay()] + ' ' + day + suffix + ' ' + months[date.getMonth()];
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
  var map = {
    'not_scheduled': { label: 'No clean today', emoji: '📅' },
    'none':          { label: 'No clean today', emoji: '📅' },
    'on_the_way':    { label: "We're on our way!", emoji: '🚐' },
    'next':          { label: "You're next!", emoji: '⭐' },
    'in_progress':   { label: 'Being cleaned now', emoji: '🪟' },
    'complete':      { label: 'All done!', emoji: '✅' }
  };
  return map[status] || { label: 'Check back soon', emoji: '⏳' };
}
